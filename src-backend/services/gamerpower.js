const axios = require('axios');
const logger = require('../utils/logger');

class GamerPowerService {
  constructor() {
    this.baseUrl = 'https://www.gamerpower.com/api/giveaways';
    this.timeout = 10000;
  }

  async fetchGames(platform = 'pc') {
    try {
      const response = await axios.get(`${this.baseUrl}?platform=${platform}`, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'FreeGameHub/2.0'
        }
      });

      return response.data.map(game => this.formatGame(game, platform));
    } catch (err) {
      logger.error(`Error fetching GamerPower ${platform}`, err);
      return [];
    }
  }

  async fetchAll() {
    logger.info('Obteniendo juegos de GamerPower...');
    const startTime = Date.now();
    
    const [pcGames, androidGames] = await Promise.all([
      this.fetchGames('pc'),
      this.fetchGames('android')
    ]);

    const allGames = [...pcGames, ...androidGames];
    logger.success(`GamerPower: ${allGames.length} juegos obtenidos (${Date.now() - startTime}ms)`);
    
    return allGames;
  }

  formatGame(game, category) {
    const platformLower = (game.platforms || '').toLowerCase();
    
    return {
      id: `gp-${game.id}`,
      title: game.title,
      description: game.description || 'Juego gratuito disponible',
      image: game.image || 'https://via.placeholder.com/300x150?text=Juego+Gratis',
      url: game.open_giveaway_url || game.giveaway_url,
      platform: category === 'android' 
        ? 'android' 
        : (platformLower.includes('steam') ? 'steam' : 
           platformLower.includes('epic') ? 'epic' : 
           platformLower.includes('gog') ? 'gog' : 'pc'),
      platformName: category === 'android' 
        ? 'Play Store' 
        : game.platforms || 'PC',
      endDate: game.end_date && game.end_date !== 'N/A' 
        ? game.end_date 
        : null,
      worth: game.worth && game.worth !== 'N/A' 
        ? game.worth 
        : null,
      type: game.type || 'Game',
      category: category,
      genre: this.detectGenre(game.title, game.description),
      source: 'gamerpower'
    };
  }

  detectGenre(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    const genres = {
      action: ['action', 'acción', 'combat', 'fight', 'shooter', 'fps'],
      rpg: ['rpg', 'role', 'adventure', 'aventura', 'fantasy'],
      indie: ['indie', 'pixel', 'retro'],
      strategy: ['strategy', 'estrategia', 'tower defense', 'rts'],
      puzzle: ['puzzle', 'logic', 'logico'],
      racing: ['racing', 'carrera', 'drive', 'car'],
      sports: ['sports', 'deporte', 'fifa', 'football', 'basketball']
    };

    for (const [genre, keywords] of Object.entries(genres)) {
      if (keywords.some(k => text.includes(k))) return genre;
    }
    return 'other';
  }
}

module.exports = new GamerPowerService();
