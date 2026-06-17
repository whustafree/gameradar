const express = require('express');
const router = express.Router();
const gamesService = require('../services/games');
const telegramService = require('../services/telegram');
const instagramService = require('../services/instagram');
const pushService = require('../services/push');
const logger = require('../utils/logger');

// GET /api/free-games
router.get('/free-games', async (req, res) => {
  try {
    // Si cache vacío en cold start, inicia update en background
    // y espera hasta 12s para recibir datos (maxDuration es 30s)
    const initial = await gamesService.getGames();
    if (initial.games.length === 0) {
      logger.info('Cache vacio, iniciando carga con timeout 12s...');
      
      // Iniciar actualización si no está ya en curso
      gamesService.updateAll().catch(err => {
        logger.error('Error en updateAll background', err);
      });
      
      // Esperar hasta 12s a que lleguen datos
      const data = await gamesService.getGames(12000);
      
      if (data.games.length > 0) {
        logger.success(`Cache actualizado con ${data.games.length} juegos`);
      } else {
        logger.warn('Timeout de 12s alcanzado, respondiendo sin datos');
      }
      
      return res.json({
        success: true,
        games: data.games,
        lastUpdated: data.lastUpdated,
        count: data.games.length
      });
    }
    
    res.json({
      success: true,
      games: initial.games,
      lastUpdated: initial.lastUpdated,
      count: initial.games.length
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

// GET /api/docs — API pública documentada
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    api: {
      name: 'GameRadar API',
      version: '2.1.0',
      description: 'API pública de GameRadar - Descubre juegos gratis de Steam, Epic, GOG, Android y más',
      documentation: 'https://github.com/whustafree/freegamehub',
      endpoints: [
        {
          path: '/api/free-games',
          method: 'GET',
          description: 'Obtener todos los juegos gratis disponibles',
          params: [],
          response: {
            success: 'boolean',
            games: 'Game[]',
            count: 'number',
            lastUpdated: 'string (ISO 8601)'
          },
          example: 'curl https://gameradar-iota.vercel.app/api/free-games'
        },
        {
          path: '/api/free-games?platform=android',
          method: 'GET',
          description: 'Filtrar juegos por plataforma (android o pc)',
          params: [{ name: 'platform', type: 'string', options: ['android', 'pc'] }],
          example: 'curl https://gameradar-iota.vercel.app/api/free-games?platform=android'
        },
        {
          path: '/api/stats',
          method: 'GET',
          description: 'Estadísticas del servidor',
          response: {
            success: 'boolean',
            currentGames: 'number',
            totalScans: 'number',
            alertsSent: 'number',
            uptimeFormatted: 'string'
          },
          example: 'curl https://gameradar-iota.vercel.app/api/stats'
        },
        {
          path: '/api/health',
          method: 'GET',
          description: 'Health check del servidor',
          example: 'curl https://gameradar-iota.vercel.app/api/health'
        },
        {
          path: '/api/docs',
          method: 'GET',
          description: 'Esta documentación',
        },
      ],
      gameSchema: {
        id: 'string (único)',
        title: 'string',
        description: 'string',
        worth: 'string (precio original o null)',
        image: 'string (URL)',
        url: 'string (URL de la tienda)',
        platform: 'string (android | steam | epic | gog | etc)',
        platformName: 'string',
        category: 'string (android | pc)',
        endDate: 'string (ISO 8601 o null)',
        source: 'string (gamerpower | fdroid | reddit | epicgames | etc)',
        genre: 'string',
        rating: 'number (opcional)',
        installs: 'string (opcional)',
        publisher: 'string (opcional)',
        license: 'string (opcional - solo F-Droid)',
      },
      rateLimiting: '60 requests per minute por IP',
      caching: 'Los datos se actualizan cada 4 horas via cron job',
    },
    generatedAt: new Date().toISOString(),
  });
});

// POST /api/subscribe-push — Suscripción a notificaciones push (persistente en JSON)
router.post('/subscribe-push', (req, res) => {
  try {
    const { subscription, platforms } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, error: 'Suscripción inválida' });
    }
    
    const total = pushService.addSubscription(subscription, platforms);
    logger.info(`Push subscription registrada. Total: ${total}`);
    res.json({ success: true, message: 'Suscripción registrada', total });
  } catch (err) {
    logger.error('Error en /api/subscribe-push', err);
    res.status(500).json({ success: false, error: 'Error registrando suscripción' });
  }
});

// POST /api/unsubscribe-push — Eliminar suscripción
router.post('/unsubscribe-push', (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, error: 'Endpoint requerido' });
    }
    const total = pushService.removeSubscription(endpoint);
    res.json({ success: true, message: 'Suscripción eliminada', total });
  } catch (err) {
    logger.error('Error en /api/unsubscribe-push', err);
    res.status(500).json({ success: false, error: 'Error eliminando suscripción' });
  }
});

// POST /api/send-push — Enviar notificación a todas las suscripciones
router.post('/send-push', async (req, res) => {
  try {
    const { title, body, icon, platform } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'title y body son requeridos' });
    }
    const result = await pushService.broadcastNotification(title, body, icon, platform);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('Error en /api/send-push', err);
    res.status(500).json({ success: false, error: 'Error enviando notificaciones' });
  }
});

// GET /api/push-subscriptions — Ver suscripciones activas (admin)
router.get('/push-subscriptions', (req, res) => {
  try {
    const subs = pushService.getSubscriptions();
    // No exponer las claves completas por seguridad
    const safe = subs.map(s => ({
      endpoint: s.endpoint?.slice(0, 50) + '...',
      platforms: s.platforms,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
    res.json({ success: true, total: subs.length, subscriptions: safe });
  } catch (err) {
    logger.error('Error en /api/push-subscriptions', err);
    res.status(500).json({ success: false, error: 'Error obteniendo suscripciones' });
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
