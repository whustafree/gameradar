const fs = require('fs');
const path = require('path');
const https = require('https');
const logger = require('../utils/logger');

const SUBSCRIPTIONS_FILE = path.join(__dirname, '..', '..', 'data', 'push-subscriptions.json');

// Ensure data directory exists
const DATA_DIR = path.dirname(SUBSCRIPTIONS_FILE);
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadSubscriptions() {
  try {
    if (!fs.existsSync(SUBSCRIPTIONS_FILE)) return [];
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    logger.error('Error loading push subscriptions:', err);
    return [];
  }
}

function saveSubscriptions(subscriptions) {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Error saving push subscriptions:', err);
  }
}

function addSubscription(subscription, platforms) {
  const subs = loadSubscriptions();
  const existing = subs.findIndex(s => s.endpoint === subscription.endpoint);
  const entry = {
    ...subscription,
    platforms: platforms || ['pc', 'android'],
    updatedAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    subs[existing] = { ...subs[existing], ...entry };
  } else {
    entry.createdAt = new Date().toISOString();
    subs.push(entry);
  }

  // Keep max 200 subscriptions
  const trimmed = subs.slice(-200);
  saveSubscriptions(trimmed);
  return subs.length;
}

function removeSubscription(endpoint) {
  const subs = loadSubscriptions().filter(s => s.endpoint !== endpoint);
  saveSubscriptions(subs);
  return subs.length;
}

function getSubscriptions() {
  return loadSubscriptions();
}

/**
 * Envía una notificación push a una suscripción usando la Web Push API
 * via HTTPS POST directo al endpoint del proveedor push.
 */
async function sendPushToSubscription(subscription, payload) {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys) return false;

  try {
    const url = new URL(endpoint);
    const data = JSON.stringify(payload);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'TTL': '86400',
        'Urgency': 'normal',
      },
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true);
          } else if (res.statusCode === 410) {
            // Subscription expired or unsubscribed, remove it
            removeSubscription(endpoint);
            logger.info('Push subscription removed (410 Gone):', endpoint.slice(0, 50));
            resolve(false);
          } else {
            logger.warn(`Push send returned ${res.statusCode}:`, body.slice(0, 100));
            resolve(false);
          }
        });
      });
      req.on('error', (err) => {
        logger.error('Push send error:', err.message);
        resolve(false);
      });
      req.write(data);
      req.end();
    });
  } catch (err) {
    logger.error('Push send exception:', err.message);
    return false;
  }
}

/**
 * Envía una notificación a todas las suscripciones activas.
 * Solo envía a suscripciones que coincidan con la plataforma.
 */
async function broadcastNotification(title, body, icon, platform = null) {
  const subs = loadSubscriptions();
  let sent = 0;
  let failed = 0;

  const payload = {
    notification: {
      title,
      body,
      icon: icon || 'https://gameradar-iota.vercel.app/favicon.ico',
      vibrate: [100, 50, 100],
      data: { url: 'https://gameradar-iota.vercel.app/' },
    },
  };

  for (const sub of subs) {
    // Filter by platform if specified
    if (platform && sub.platforms && !sub.platforms.includes(platform)) continue;

    const ok = await sendPushToSubscription(sub, payload);
    if (ok) sent++;
    else failed++;
  }

  logger.success(`Push broadcast: ${sent} sent, ${failed} failed (${subs.length} total subscriptions)`);
  return { sent, failed, total: subs.length };
}

module.exports = {
  addSubscription,
  removeSubscription,
  getSubscriptions,
  broadcastNotification,
  sendPushToSubscription,
};
