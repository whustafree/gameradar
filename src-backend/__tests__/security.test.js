/**
 * Tests de seguridad — GameRadar
 * Run with: npm run test:backend
 *
 * Cubren los dos controles añadidos al cerrar los hallazgos de seguridad:
 *   1. requireAdmin (fail-closed, comparación de token)
 *   2. allowlist de endpoints push (evita SSRF en /subscribe-push y /send-push)
 */

const requireAdmin = require('../middleware/requireAdmin');
const { isAllowedPushEndpoint, isValidSubscription } = require('../services/push');

function fakeRes() {
  const res = {};
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.body = body; return res; };
  return res;
}

function callMiddleware({ token, adminToken, cronSecret, env = 'production' }) {
  const previous = {
    ADMIN_TOKEN: process.env.ADMIN_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  };

  delete process.env.VERCEL;
  process.env.NODE_ENV = env;
  if (adminToken) process.env.ADMIN_TOKEN = adminToken;
  else delete process.env.ADMIN_TOKEN;
  if (cronSecret) process.env.CRON_SECRET = cronSecret;
  else delete process.env.CRON_SECRET;

  const req = {
    method: 'POST',
    originalUrl: '/api/send-push',
    get: header => (token && header.toLowerCase() === 'authorization' ? `Bearer ${token}` : ''),
  };
  const res = fakeRes();
  let calledNext = false;
  requireAdmin(req, res, () => { calledNext = true; });

  // restaurar entorno
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  return { calledNext, res };
}

describe('requireAdmin', () => {
  it('rechaza con 503 en producción si no hay token configurado (fail-closed)', () => {
    const { calledNext, res } = callMiddleware({ token: 'lo-que-sea' });
    expect(calledNext).toBe(false);
    expect(res.statusCode).toBe(503);
  });

  it('rechaza con 401 cuando falta el token en la petición', () => {
    const { calledNext, res } = callMiddleware({ adminToken: 'secreto' });
    expect(calledNext).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('rechaza con 401 cuando el token no coincide', () => {
    const { calledNext, res } = callMiddleware({ token: 'otro', adminToken: 'secreto' });
    expect(calledNext).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('permite el paso con el token correcto', () => {
    const { calledNext } = callMiddleware({ token: 'secreto', adminToken: 'secreto' });
    expect(calledNext).toBe(true);
  });

  it('acepta también CRON_SECRET (lo envía Vercel Cron)', () => {
    const { calledNext } = callMiddleware({ token: 'cron-token', cronSecret: 'cron-token' });
    expect(calledNext).toBe(true);
  });

  it('no bloquea en desarrollo si no hay token (comodidad local)', () => {
    const { calledNext } = callMiddleware({ env: 'development' });
    expect(calledNext).toBe(true);
  });
});

describe('allowlist de endpoints push', () => {
  it('acepta los hosts oficiales por https', () => {
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x')).toBe(true);
  });

  it('rechaza hosts arbitrarios (SSRF)', () => {
    expect(isAllowedPushEndpoint('https://evil.example.com/x')).toBe(false);
    expect(isAllowedPushEndpoint('https://169.254.169.254/latest/meta-data')).toBe(false);
  });

  it('rechaza http plano y URLs inválidas', () => {
    expect(isAllowedPushEndpoint('http://fcm.googleapis.com/x')).toBe(false);
    expect(isAllowedPushEndpoint('no-es-una-url')).toBe(false);
    expect(isAllowedPushEndpoint(null)).toBe(false);
  });

  it('exige claves p256dh y auth en la suscripción', () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/abc';
    expect(isValidSubscription({ endpoint, keys: { p256dh: 'k', auth: 'a' } })).toBe(true);
    expect(isValidSubscription({ endpoint })).toBe(false);
    expect(isValidSubscription({ endpoint, keys: { p256dh: 'k' } })).toBe(false);
  });
});
