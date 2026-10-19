const gamerPowerService = require('./gamerpower');
const redditService = require('./reddit');
const epicGamesService = require('./epicgames');
const freeToGameService = require('./freetogame');
const androidFeedsService = require('./androidfeeds');
const mmobombService = require('./mmobomb');
const notengoSueltoService = require('./notengosuelto');
const googlePlayDealsService = require('./googleplaydeals');
const playStoreService = require('./playstore');
const fdroidService = require('./fdroid');
const steamService = require('./steam');
const telegramService = require('./telegram');
const instagramService = require('./instagram');
const cacheManager = require('../utils/cache');
const statsManager = require('../utils/stats');
const logger = require('../utils/logger');

// En serverless la función tiene un presupuesto de tiempo muy corto y el FS
// es efímero: las fuentes lentas (FDroid descarga ~50 MB, Steam hace N+1 con
// 5 s por juego, Instagram hace polling con sleeps) impiden que la caché se
// llene antes de que Vercel congele la instancia.
const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const SOURCE_TIMEOUT = IS_SERVERLESS ? 4500 : 30000;

/** Corta una fuente que tarde demasiado para que no bloquee al resto. */
function withTimeout(promise, ms, name) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${name}: timeout de ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

class GamesService {
  constructor() {
    this._pendingUpdate = null;
  }

  async updateAll(options = {}) {
    // Si ya hay una actualizacion en curso, reusar la promesa
    if (this._pendingUpdate) {
      logger.info('Actualizacion ya en curso, esperando...');
      return this._pendingUpdate;
    }

    this._pendingUpdate = this._doUpdate(options).finally(() => {
      this._pendingUpdate = null;
    });
    
    return this._pendingUpdate;
  }

  /**
   * Fuentes ordenadas por coste.
   * En serverless sólo corren las rápidas, salvo que se pida `full` (cron),
   * que intenta también FDroid/Steam con un presupuesto mayor.
   */
  _sources(options = {}) {
    const sources = [
      { name: 'gamerpower', fast: true, run: () => gamerPowerService.fetchAll() },
      { name: 'epicgames', fast: true, run: () => epicGamesService.fetchFreeGames() },
      { name: 'freetogame', fast: true, run: () => freeToGameService.fetchAll() },
      { name: 'mmobomb', fast: true, run: () => mmobombService.fetchAll() },
      { name: 'androidfeeds', fast: true, run: () => androidFeedsService.fetchAll() },
      { name: 'reddit', fast: true, run: () => redditService.fetchDeals() },
      { name: 'googleplaydeals', fast: true, run: () => googlePlayDealsService.fetchAll() },
      { name: 'playstore', fast: true, run: () => playStoreService.fetchAll() },
      { name: 'notengosuelto', fast: false, run: () => notengoSueltoService.fetchAll() },
      { name: 'fdroid', fast: false, run: () => fdroidService.fetchAll() },
      { name: 'steam', fast: false, run: () => steamService.fetchAll() },
    ];
    if (!IS_SERVERLESS) return sources;
    return options.full ? sources : sources.filter(s => s.fast);
  }

  async _doUpdate(options = {}) {
    const startTime = Date.now();
    statsManager.incrementScans();
    
    logger.info(`Iniciando actualización de juegos...${IS_SERVERLESS ? ' (modo serverless)' : ''}`);

    const sources = this._sources(options);
    const sourceTimeout = options.full ? 25000 : SOURCE_TIMEOUT;

    try {
      // Obtener juegos de todas las fuentes en paralelo, con timeout por fuente
      const results = await Promise.allSettled(
        sources.map(s => withTimeout(s.run(), sourceTimeout, s.name))
      );

      // Combinar todos los resultados con monitoreo de fuentes
      let allGames = [];
      results.forEach((result, index) => {
        const sourceName = sources[index]?.name || `source_${index}`;
        if (result.status === 'fulfilled') {
          allGames = [...allGames, ...result.value];
          statsManager.resetSourceErrors(sourceName);
          logger.success(`${sourceName}: ${result.value.length} juegos`);
        } else {
          const errMsg = result.reason?.message || result.reason || 'Unknown error';
          logger.error(`Error en ${sourceName}:`, errMsg);
          statsManager.recordSourceError(sourceName, errMsg);
        }
      });

      // Eliminar duplicados basados en URL
      const uniqueGames = this.removeDuplicates(allGames);

      if (uniqueGames.length > 0) {
        // Detectar juegos nuevos ANTES de sobrescribir la caché
        const newGames = cacheManager.findNewGames(uniqueGames);

        // La caché se escribe primero: si el proceso muere durante las
        // notificaciones (o Vercel congela la instancia), los datos ya están.
        cacheManager.setGames(uniqueGames);
        cacheManager.cleanupExpired();
        statsManager.setGamesFound(uniqueGames.length);

        if (newGames.length > 0) {
          logger.success(`${newGames.length} juegos nuevos detectados`);

          // En serverless no notificamos: Telegram/Instagram pueden tardar
          // décadas y hacer perder la actualización. Lo hace el cron.
          if (!IS_SERVERLESS) {
            const alertSent = await telegramService.sendAlert(newGames);
            if (alertSent) statsManager.incrementAlerts();

            const instagramPosted = await instagramService.sendAlert(newGames).catch(err => {
              logger.error('Instagram: error en sendAlert', err);
              return 0;
            });
            if (instagramPosted > 0) statsManager.incrementAlerts();
          }
        }

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
