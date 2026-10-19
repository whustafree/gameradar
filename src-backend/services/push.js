const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const vapidService = require('./vapid');

const SUBSCRIPTIONS_FILE = path.join(__dirname, '..', '..', 'data', 'push-subscriptions.json');

// Ensure data directory exists
const DATA_DIR = path.dirname(SUBSCRIPTIONS_FILE);
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Hosts de los servicios push oficiales.
 * Cualquier endpoint fuera de esta lista se rechaza: web-push hace una
 * petición HTTP al endpoint recibido, así que aceptar URLs arbitrarias
 * convierte /subscribe-push y /send-push en un SSRF.
 */
const ALLOWED_PUSH_HOSTS = [
  'fcm.googleapis.com',        // Chrome / Edge (FCM)
  'push.services.mozilla.com', // Firefox
  'notify.windows.com',        // WNS (Edge legacy)
  'push.apple.com',            // Safari
];

function isAllowedPushEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length === 0 || endpoint.length > 2048) {
    return false;
  }
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_PUSH_HOSTS.some(
    allowed => host === allowed || host.endsWith(`.${allowed}`)
  );
}

/** Una suscripción válida necesita endpoint permitido y claves p256dh/auth. */
function isValidSubscription(subscription) {
  return !!(
    subscription &&
    isAllowedPushEndpoint(subscription.endpoint) &&
    subscription.keys &&
    typeof subscription.keys.p256dh === 'string' &&
    typeof subscription.keys.auth === 'string'
  );
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
  if (!isValidSubscription(subscription)) {
    logger.warn('Suscripción push rechazada: endpoint no permitido o claves inválidas');
    return null;
  }

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
 * Envía una notificación push a una suscripción usando web-push
 * con cifrado VAPID (encriptación ECDH estándar del protocolo Web Push).
 */
async function sendPushToSubscription(subscription, payload) {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys) return false;

  // Defensa en profundidad: nunca enviamos a un endpoint que no esté en la allowlist,
  // aunque haya entrado en el almacén antes de aplicar la validación.
  if (!isAllowedPushEndpoint(endpoint)) {
    logger.warn(`Push omitido: endpoint no permitido (${String(endpoint).slice(0, 40)}...)`);
    return false;
  }

  const result = await vapidService.sendPush(subscription, payload);

  if (result.expired) {
    // Subscription expired, clean it up
    removeSubscription(endpoint);
    logger.info('Push subscription removed (expired):', endpoint.slice(0, 50));
    return false;
  }

  return result.success;
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

  // Envío en lotes con concurrencia limitada: secuencial superaba el
  // timeout de la función con muchas suscripciones.
  const CONCURRENCY = 10;
  const targets = subs.filter(
    sub => !platform || !sub.platforms || sub.platforms.includes(platform)
  );

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(sub => sendPushToSubscription(sub, payload))
    );
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) sent++;
      else failed++;
    }
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
  isAllowedPushEndpoint,
  isValidSubscription,
};
