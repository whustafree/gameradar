const axios = require('axios');
const logger = require('../utils/logger');

/**
 * MMOBombService - Obtiene giveaways y juegos gratis desde MMOBomb API
 *
 * API gratuita, sin API key requerida.
 * Aporta giveaways extra de PC (MMO, loot, etc) que complementan GamerPower.
 */
class MMOBombService {
  constructor() {
    this.baseUrl = 'https://www.mmobomb.com/api1';
    this.timeout = 8000;
  }

  async fetchAll() {
    const startTime = Date.now();

    try {
      logger.info('Obteniendo giveaways desde MMOBomb...');

      // Fetch both giveaways and free games in parallel
      const [giveaways, games] = await Promise.allSettled([
        this._fetchGiveaways(),
        this._fetchFreeGames(),
      ]);

      const all = [];

      if (giveaways.status === 'fulfilled') {
        all.push(...giveaways.value);
      }

      if (games.status === 'fulfilled') {
        all.push(...games.value);
      }

      // Deduplicate by title
      const seen = new Set();
      const unique = all.filter(d => {
        const key = d.title.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      logger.success(`MMOBomb: ${unique.length} juegos/giveaways obtenidos (${Date.now() - startTime}ms)`);
      return unique;

    } catch (err) {
      logger.warn(`MMOBomb: error general (${err?.message || err})`);
      return [];
    }
  }

  async _fetchGiveaways() {
    try {
      const response = await axios.get(`${this.baseUrl}/giveaways`, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'FreeGameHub/2.0' },
      });

      if (!Array.isArray(response.data)) return [];

      return response.data
        .filter(g => {
          // Skip expired or empty giveaways
          if (!g || !g.title) return false;
          if (g.status === 'expired') return false;
          // Skip if no keys left (keys_left is a string like "60%")
          const keysLeft = parseInt(g.keys_left);
          if (!isNaN(keysLeft) && keysLeft <= 0) return false;
          return true;
        })
        .map(g => this._formatGiveaway(g));
    } catch (e) {
      logger.warn(`MMOBomb: error en giveaways (${e?.message || e})`);
      return [];
    }
  }

  async _fetchFreeGames() {
    try {
      const response = await axios.get(`${this.baseUrl}/games?platform=pc`, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'FreeGameHub/2.0' },
      });

      if (!Array.isArray(response.data)) return [];

      // MMOBomb returns ALL free-to-play games.
      // We only take a sample (first 10) to avoid massive duplicates with FreeToGame.
      return response.data.slice(0, 10).map(g => this._formatGame(g));
    } catch (e) {
      /* Don't log, FreeToGame already covers this */
      return [];
    }
  }

  _formatGiveaway(g) {
    return {
      id: `mmobomb-g-${g.id}`,
      title: g.title || 'MMO Giveaway',
      description: (g.short_description || g.title || '').substring(0, 300),
      image: g.thumbnail || g.main_image || 'https://placehold.co/300x150/1a1a2e/ef4444?text=Giveaway',
      url: g.giveaway_url || g.game_url || '',
      platform: 'pc',
      platformName: 'MMOBomb',
      platformIcon: '🎮',
      category: 'pc',
      endDate: null,
      worth: null,
      type: 'Game',
      genre: 'other',
      source: 'mmobomb',
      instructions: g.short_description || null,
    };
  }

  _formatGame(g) {
    return {
      id: `mmobomb-${g.id}`,
      title: g.title || 'Free Game',
      description: (g.short_description || g.title || '').substring(0, 300),
      image: g.thumbnail || 'https://placehold.co/300x150/1a1a2e/3b82f6?text=Game',
      url: g.game_url || g.profile_url || '',
      platform: 'pc',
      platformName: g.platform || 'PC',
      platformIcon: '🖥️',
      category: 'pc',
      endDate: null,
      worth: null,
      type: 'free-to-play',
      genre: g.genre ? g.genre.toLowerCase().replace(/\s+/g, '') : 'other',
      source: 'mmobomb',
      publisher: g.publisher || null,
      developer: g.developer || null,
    };
  }
}

module.exports = new MMOBombService();
