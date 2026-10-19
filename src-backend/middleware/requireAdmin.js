const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Middleware de autorización para operaciones administrativas.
 *
 * Protege endpoints que mutan estado o gastan cuota de terceros
 * (refresh, test-telegram, test-instagram, send-push, push-subscriptions, update).
 *
 * Acepta el token en:
 *   - Authorization: Bearer <token>
 *   - x-admin-token: <token>
 *
 * Vercel Cron envía automáticamente `Authorization: Bearer $CRON_SECRET`,
 * por eso se aceptan tanto ADMIN_TOKEN como CRON_SECRET.
 *
 * Política fail-closed: si no hay ningún token configurado, en producción
 * se rechaza la operación en lugar de dejarla abierta.
 */
const isProduction = () => process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

function getProvidedToken(req) {
  const header = req.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return (req.get('x-admin-token') || '').trim();
}

function safeCompare(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAdmin(req, res, next) {
  const expected = [process.env.ADMIN_TOKEN, process.env.CRON_SECRET]
    .filter(Boolean)
    .map(String);

  if (expected.length === 0) {
    if (isProduction()) {
      logger.error(
        `Operación administrativa rechazada: ADMIN_TOKEN/CRON_SECRET no configurado (${req.method} ${req.originalUrl})`
      );
      return res.status(503).json({
        success: false,
        error: 'Operación no disponible: falta configurar ADMIN_TOKEN',
      });
    }
    logger.warn(
      `[dev] Operación administrativa sin token en entorno local: ${req.method} ${req.originalUrl}`
    );
    return next();
  }

  const token = getProvidedToken(req);
  if (!token || !expected.some(candidate => safeCompare(token, candidate))) {
    logger.warn(`Intento de acceso no autorizado: ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }

  return next();
}

module.exports = requireAdmin;
module.exports.safeCompare = safeCompare;
