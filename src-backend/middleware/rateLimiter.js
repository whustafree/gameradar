// Rate limiter simple basado en memoria
const requests = new Map();
const WINDOW_MS = 60000; // 1 minuto
const MAX_REQUESTS = 60; // 60 requests por minuto

module.exports = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requests.has(ip)) {
    requests.set(ip, []);
  }
  
  const userRequests = requests.get(ip);
  
  // Limpiar requests antiguos
  const validRequests = userRequests.filter(time => now - time < WINDOW_MS);
  
  if (validRequests.length >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'Demasiadas peticiones. Intenta más tarde.'
    });
  }
  
  validRequests.push(now);
  requests.set(ip, validRequests);
  
  // Limpiar IPs antiguas cada hora
  if (Math.random() < 0.001) {
    const hourAgo = now - 3600000;
    for (const [key, times] of requests.entries()) {
      if (times.every(t => t < hourAgo)) {
        requests.delete(key);
      }
    }
  }
  
  next();
};
