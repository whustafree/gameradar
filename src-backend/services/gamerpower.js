const axios = require('axios');
const logger = require('../utils/logger');

// Mapa de plataformas GamerPower -> nuestras categorías/grupos
const PLATFORM_MAP = {
  'pc':             { platform: 'pc',     category: 'pc',      icon: '🖥️',  name: 'PC' },
  'steam':          { platform: 'steam',  category: 'pc',      icon: '🖥️',  name: 'Steam' },
  'epic-games-store': { platform: 'epic',  category: 'pc',      icon: '🎯',  name: 'Epic Games' },
  'gog':            { platform: 'gog',    category: 'pc',      icon: '🟣',  name: 'GOG' },
  'itchio':         { platform: 'itch',   category: 'pc',      icon: '🎨',  name: 'Itch.io' },
  'battlenet':      { platform: 'battlenet', category: 'pc',   icon: '⚔️',  name: 'Battle.net' },
  'origin':         { platform: 'origin', category: 'pc',      icon: '💠',  name: 'Origin' },
  'drm-free':       { platform: 'drm',    category: 'pc',      icon: '🔓',  name: 'DRM-Free' },
  'ps4':            { platform: 'ps4',    category: 'console', icon: '🎮',  name: 'PlayStation 4' },
  'ps5':            { platform: 'ps5',    category: 'console', icon: '🎮',  name: 'PlayStation 5' },
  'xbox-one':       { platform: 'xbox',   category: 'console', icon: '🎮',  name: 'Xbox One' },
  'xbox-series-xs': { platform: 'xbox-series', category: 'console', icon: '🎮', name: 'Xbox Series X|S' },
  'xbox-360':       { platform: 'xbox-360',  category: 'console', icon: '🎮', name: 'Xbox 360' },
  'switch':         { platform: 'nintendo',  category: 'console', icon: '🎮', name: 'Nintendo Switch' },
  'android':        { platform: 'android',   category: 'android', icon: '📱', name: 'Play Store' },
  'ios':            { platform: 'ios',       category: 'ios',    icon: '🍎', name: 'App Store' },
  'vr':             { platform: 'vr',        category: 'pc',     icon: '🥽', name: 'VR' },
};

// Orden de plataformas para mostrarse agrupadas
const CATEGORY_PLATFORMS = {
  pc:      ['steam', 'epic-games-store', 'gog', 'itchio', 'battlenet', 'origin', 'drm-free', 'pc', 'vr'],
  console: ['ps5', 'ps4', 'xbox-series-xs', 'xbox-one', 'xbox-360', 'switch'],
  android: ['android'],
  ios:     ['ios'],
};

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

  async fetchCategory(category) {
    const platforms = CATEGORY_PLATFORMS[category] || [];
    const results = await Promise.allSettled(
      platforms.map(p => this.fetchGames(p))
    );
    const allGames = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allGames.push(...result.value);
      }
    });
    return allGames;
  }

  async fetchAll() {
    logger.info('Obteniendo juegos de GamerPower (todas las plataformas)...');
    const startTime = Date.now();
    
    const [pcGames, consoleGames, androidGames, iosGames] = await Promise.all([
      this.fetchCategory('pc'),
      this.fetchCategory('console'),
      this.fetchCategory('android'),
      this.fetchCategory('ios'),
    ]);

    const allGames = [...pcGames, ...consoleGames, ...androidGames, ...iosGames];
    logger.success(`GamerPower: ${allGames.length} juegos obtenidos (${Date.now() - startTime}ms)`);
    logger.info(`  PC: ${pcGames.length} | Consolas: ${consoleGames.length} | Android: ${androidGames.length} | iOS: ${iosGames.length}`);
    
    return allGames;
  }

  detectPlatformFromString(platformsStr, category) {
    // Si es una categoría específica, usar el mapa directo
    const mapped = PLATFORM_MAP[category];
    if (mapped) return mapped;
    
    // Detectar desde el string de plataformas
    const lower = (platformsStr || '').toLowerCase();
    for (const [key, info] of Object.entries(PLATFORM_MAP)) {
      if (lower.includes(key) || lower.includes(info.platform)) {
        return info;
      }
    }
    return { platform: 'pc', category: 'pc', icon: '🖥️', name: platformsStr || 'PC' };
  }

  formatGame(game, category) {
    const platformInfo = this.detectPlatformFromString(game.platforms, category);
    
    return {
      id: `gp-${game.id}`,
      title: game.title,
      description: game.description || 'Juego gratuito disponible',
      image: game.image || 'https://placehold.co/300x150/1a1a2e/ef4444?text=' + encodeURIComponent(game.title?.slice(0, 20) || 'Game'),
      url: game.open_giveaway_url || game.giveaway_url,
      platform: platformInfo.platform,
      platformName: platformInfo.name,
      platformIcon: platformInfo.icon,
      category: platformInfo.category,
      endDate: game.end_date && game.end_date !== 'N/A' 
        ? game.end_date 
        : null,
      worth: game.worth && game.worth !== 'N/A' 
        ? game.worth 
        : null,
      type: game.type || 'Game',
      genre: this.detectGenre(game.title, game.description),
      source: 'gamerpower',
      instructions: game.instructions || null
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
