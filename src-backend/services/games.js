const gamerPowerService = require('./gamerpower');
const redditService = require('./reddit');
const epicGamesService = require('./epicgames');
const freeToGameService = require('./freetogame');
const androidFeedsService = require('./androidfeeds');
const mmobombService = require('./mmobomb');
const notengoSueltoService = require('./notengosuelto');
const googlePlayDealsService = require('./googleplaydeals');
const fdroidService = require('./fdroid');
const telegramService = require('./telegram');
const instagramService = require('./instagram');
const cacheManager = require('../utils/cache');
const statsManager = require('../utils/stats');
const logger = require('../utils/logger');

class GamesService {
  constructor() {
    this._pendingUpdate = null;
  }

  async updateAll() {
    // Si ya hay una actualizacion en curso, reusar la promesa
    if (this._pendingUpdate) {
      logger.info('Actualizacion ya en curso, esperando...');
      return this._pendingUpdate;
    }

    this._pendingUpdate = this._doUpdate().finally(() => {
      this._pendingUpdate = null;
    });
    
    return this._pendingUpdate;
  }

  async _doUpdate() {
    const startTime = Date.now();
    statsManager.incrementScans();
    
    logger.info('Iniciando actualización de juegos...');

    try {
      // Obtener juegos de todas las fuentes en paralelo
      const results = await Promise.allSettled([
        gamerPowerService.fetchAll(),
        redditService.fetchDeals(),
        epicGamesService.fetchFreeGames(),
        freeToGameService.fetchAll(),
        androidFeedsService.fetchAll(),
        mmobombService.fetchAll(),
        notengoSueltoService.fetchAll(),
        googlePlayDealsService.fetchAll(),
        fdroidService.fetchAll()
      ]);

      // Combinar todos los resultados
      let allGames = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allGames = [...allGames, ...result.value];
        } else {
          logger.error(`Error en servicio ${index}:`, result.reason);
        }
      });

      // Eliminar duplicados basados en URL
      const uniqueGames = this.removeDuplicates(allGames);

      if (uniqueGames.length > 0) {
        // Detectar juegos nuevos
        const newGames = cacheManager.findNewGames(uniqueGames);
        
        if (newGames.length > 0) {
          logger.success(`${newGames.length} juegos nuevos detectados`);
          
          // Telegram
          const alertSent = await telegramService.sendAlert(newGames);
          if (alertSent) statsManager.incrementAlerts();
          
          // Instagram (no bloquea si falla)
          const instagramPosted = await instagramService.sendAlert(newGames).catch(err => {
            logger.error('Instagram: error en sendAlert', err);
            return 0;
          });
          if (instagramPosted > 0) statsManager.incrementAlerts();
        }

        // Actualizar caché
        cacheManager.setGames(uniqueGames);
        cacheManager.cleanupExpired();
        
        statsManager.setGamesFound(uniqueGames.length);
        logger.success(`Actualización completada: ${uniqueGames.length} juegos totales`);
      } else {
        logger.warn('No se obtuvieron juegos de ninguna fuente');
      }

      statsManager.setScanDuration(Date.now() - startTime);

    } catch (err) {
      logger.error('Error en actualización', err);
      statsManager.addError(err);
    }
  }

  removeDuplicates(games) {
    const seen = new Map();
    
    return games.filter(game => {
      // Usar URL como clave principal para detectar duplicados
      const key = game.url?.toLowerCase().trim();
      if (!key) return true;
      
      if (seen.has(key)) {
        // Si ya existe, mantener el que tenga más información
        const existing = seen.get(key);
        if (this.getGameScore(game) > this.getGameScore(existing)) {
          seen.set(key, game);
          return true;
        }
        return false;
      }
      
      seen.set(key, game);
      return true;
    });
  }

  getGameScore(game) {
    let score = 0;      if (game.image && !game.image.includes('placeholder')) score += 5;
    if (game.publisher) score += 2;
    if (game.developer) score += 2;
    if (game.description && game.description.length > 50) score += 5;
    if (game.endDate) score += 3;
    if (game.worth) score += 2;
    return score;
  }

  /**
   * Get games with optional timeout waiting for initial load.
   * Si el cache está vacío y hay una actualización en curso,
   * espera hasta `timeoutMs` milisegundos por si llegan datos.
   */
  async getGames(timeoutMs = 0) {
    const data = {
      games: cacheManager.getGames(),
      lastUpdated: cacheManager.getLastUpdated()
    };

    // Si ya hay juegos o no hay timeout, responder inmediato
    if (data.games.length > 0 || timeoutMs <= 0) {
      return data;
    }

    // Hay una actualización en curso? Esperar con timeout
    if (this._pendingUpdate) {
      try {
        await Promise.race([
          this._pendingUpdate,
          new Promise(resolve => setTimeout(resolve, timeoutMs))
        ]);
      } catch (e) {
        // Ignorar errores del pending update
      }
      // Re-verificar cache después de esperar
      return {
        games: cacheManager.getGames(),
        lastUpdated: cacheManager.getLastUpdated()
      };
    }

    return data;
  }

  getStats() {
    return statsManager.getStats(cacheManager.getGames().length);
  }
}

module.exports = new GamesService();
