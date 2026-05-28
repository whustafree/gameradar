const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
  logger.error(`Error en ${req.method} ${req.path}`, err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message
  });
};
