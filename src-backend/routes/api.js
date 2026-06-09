const express = require('express');
const router = express.Router();
const gamesService = require('../services/games');
const telegramService = require('../services/telegram');
const instagramService = require('../services/instagram');
const logger = require('../utils/logger');

// GET /api/free-games
router.get('/free-games', async (req, res) => {
  try {
    const data = gamesService.getGames();
    
    // Si no hay juegos en cache (cold start en serverless), esperar actualizacion
    // updateAll() usa promesa compartida, no se duplican llamadas
    if (data.games.length === 0) {
      logger.info('Cache vacio, esperando carga inicial de juegos...');
      await gamesService.updateAll();
    }
    
    const updatedData = gamesService.getGames();
    res.json({
      success: true,
      ...updatedData,
      count: updatedData.games.length
    });
  } catch (err) {
    logger.error('Error en /api/free-games', err);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo juegos'
    });
  }
});

// GET /api/stats
router.get('/stats', (req, res) => {
  try {
    const stats = gamesService.getStats();
    const gamesData = gamesService.getGames();
    res.json({
      success: true,
      ...stats,
      lastUpdated: gamesData.lastUpdated
    });
  } catch (err) {
    logger.error('Error en /api/stats', err);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo estadísticas'
    });
  }
});

// POST /api/refresh (forzar actualización manual)
router.post('/refresh', async (req, res) => {
  try {
    logger.info('Actualización manual solicitada');
    await gamesService.updateAll();
    res.json({
      success: true,
      message: 'Actualización completada',
      ...gamesService.getGames()
    });
  } catch (err) {
    logger.error('Error en /api/refresh', err);
    res.status(500).json({
      success: false,
      error: 'Error en actualización'
    });
  }
});

// POST /api/test-telegram
router.post('/test-telegram', async (req, res) => {
  try {
    const result = await telegramService.sendTestMessage();
    res.json({
      success: result,
      message: result ? 'Mensaje enviado' : 'Error enviando mensaje'
    });
  } catch (err) {
    logger.error('Error en /api/test-telegram', err);
    res.status(500).json({
      success: false,
      error: 'Error enviando mensaje de prueba'
    });
  }
});

// POST /api/test-instagram
router.post('/test-instagram', async (req, res) => {
  try {
    const result = await instagramService.sendTestMessage();
    res.json({
      success: result,
      message: result ? 'Post de prueba publicado en Instagram' : 'Error publicando en Instagram'
    });
  } catch (err) {
    logger.error('Error en /api/test-instagram', err);
    res.status(500).json({
      success: false,
      error: 'Error publicando en Instagram'
    });
  }
});

// GET /api/health
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
