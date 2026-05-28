const fs = require('fs');
const config = require('../config');
const logger = require('./logger');

class CacheManager {
  constructor() {
    this.data = {
      games: [],
      lastUpdated: null
    };
    // En Vercel no podemos escribir archivos, solo usamos memoria
    this.isVercel = !!process.env.VERCEL;
    if (!this.isVercel) {
      this.load();
    } else {
      logger.info('Caché en modo memoria (Vercel)');
    }
  }

  load() {
    try {
      if (fs.existsSync(config.cache.filePath)) {
        const fileData = JSON.parse(fs.readFileSync(config.cache.filePath, 'utf8'));
        this.data = {
          games: fileData.games || [],
          lastUpdated: fileData.lastUpdated || null
        };
        logger.success(`Caché cargado: ${this.data.games.length} juegos`);
      }
    } catch (err) {
      logger.error('Error cargando caché', err);
    }
  }

  save() {
    if (this.isVercel) return; // No escribir en Vercel
    try {
      fs.writeFileSync(config.cache.filePath, JSON.stringify(this.data, null, 2));
      logger.debug('Caché guardado');
    } catch (err) {
      logger.error('Error guardando caché', err);
    }
  }

  getGames() {
    return this.data.games;
  }

  setGames(games) {
    this.data.games = games;
    this.data.lastUpdated = new Date().toISOString();
    this.save();
  }

  getLastUpdated() {
    return this.data.lastUpdated;
  }

  cleanupExpired() {
    const now = new Date();
    const beforeCount = this.data.games.length;
    this.data.games = this.data.games.filter(game => {
      if (!game.endDate) return true;
      return new Date(game.endDate) > now;
    });
    const removed = beforeCount - this.data.games.length;
    if (removed > 0) {
      logger.info(`${removed} juegos expirados eliminados`);
      this.save();
    }
  }

  findNewGames(newGames) {
    if (this.data.games.length === 0) return [];
    return newGames.filter(newGame => 
      !this.data.games.some(oldGame => oldGame.id === newGame.id)
    );
  }
}

module.exports = new CacheManager();
