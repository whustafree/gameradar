const fs = require('fs');
const path = require('path');
const webPush = require('web-push');
const logger = require('../utils/logger');

const VAPID_KEYS_FILE = path.join(__dirname, '..', '..', 'data', 'vapid-keys.json');

// Ensure data directory exists
const DATA_DIR = path.dirname(VAPID_KEYS_FILE);
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Generate VAPID keys if they don't exist, then configure web-push.
 * Returns the public key string.
 */
function initVapidKeys() {
  // 1. Check if keys exist in env vars (production)
  const envPublicKey = process.env.VAPID_PUBLIC_KEY;
  const envPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (envPublicKey && envPrivateKey) {
    webPush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:admin@gameradar.app',
      envPublicKey,
      envPrivateKey
    );
    logger.success('VAPID keys loaded from environment variables');
    return envPublicKey;
  }

  // 2. Try to load from file (development)
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    logger.error(
      'VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no están configuradas: cada instancia ' +
        'generará claves nuevas y las suscripciones push dejarán de funcionar. ' +
        'Configura ambas variables en el entorno de producción.'
    );
  }

  try {
    if (fs.existsSync(VAPID_KEYS_FILE)) {
      const keys = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, 'utf-8'));
      webPush.setVapidDetails(
        keys.email || 'mailto:admin@gameradar.app',
        keys.publicKey,
        keys.privateKey
      );
      logger.success('VAPID keys loaded from file');
      return keys.publicKey;
    }
  } catch (err) {
    logger.warn('Error loading VAPID keys file:', err.message);
  }

  // 3. Generate new keys (first run)
  logger.info('Generating new VAPID keys...');
  const keys = webPush.generateVAPIDKeys();
  const keyData = {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    email: process.env.VAPID_EMAIL || 'mailto:admin@gameradar.app',
    generatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(keyData, null, 2), 'utf-8');
    logger.success(`VAPID keys generated and saved to ${VAPID_KEYS_FILE}`);
  } catch (err) {
    logger.error('Error saving VAPID keys:', err.message);
  }

  webPush.setVapidDetails(keyData.email, keys.publicKey, keys.privateKey);
  return keys.publicKey;
}

// Initialize on module load
const publicKey = initVapidKeys();

function getPublicKey() {
  return publicKey;
}

/**
 * Send a push notification using web-push (properly encrypted).
 */
async function sendPush(subscription, payload) {
  try {
    const result = await webPush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 86400 }
    );
    return { success: true, statusCode: result.statusCode };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired/gone
      return { success: false, expired: true, statusCode: err.statusCode };
    }
    logger.error('web-push send error:', err.message);
    return { success: false, expired: false, statusCode: err.statusCode, error: err.message };
  }
}

module.exports = {
  initVapidKeys,
  getPublicKey,
  sendPush,
};
