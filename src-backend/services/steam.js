const axios = require('axios');
const logger = require('../utils/logger');

/**
 * SteamService - Obtiene juegos gratis de Steam usando la API oficial de Steam Store.
 *
 * La Steam Store API no requiere API key para consultas de catálogo.
 * Endpoints usados:
 * - https://store.steampowered.com/api/featuredcategories - Juegos destacados y ofertas
 * - https://store.steampowered.com/api/appdetails?appids=X - Detalles de un juego
 *
 * Esta API no es oficial, pero es la misma que usa la tienda de Steam.
 */
class SteamService {
  constructor() {
    this.timeout = 10000;
    this.maxGames = 30;
    this.apiBase = 'https://store.steampowered.com/api';
  }

  async fetchAll() {
    const startTime = Date.now();
    logger.info('Steam: buscando juegos gratis...');

    const games = [];

    try {
      // Fuente 1: Juegos destacados y ofertas de Steam
      const featured = await axios.get(`${this.apiBase}/featuredcategories`, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'GameRadar/2.1' },
      });

      if (featured?.data) {
        const data = featured.data;

        // Procesar sección "specials" (ofertas activas - pueden incluir free weekends)
        if (data.specials?.items) {
          for (const item of data.specials.items) {
            if (item.discount_percent === 100 || item.final_price === 0) {
              const game = await this._enrichGame(item.id, item);
              if (game) games.push(game);
            }
          }
        }

        // Procesar sección "free_to_play" (juegos permanentemente gratis)
        if (data.free_to_play?.items) {
          for (const item of data.free_to_play.items) {
            const game = this._formatFreeGame(item);
            if (game) games.push(game);
          }
        }
      }

      logger.info(`Steam: ${games.length} juegos gratis encontrados en featuradcategories`);
    } catch (err) {
      logger.warn(`Steam: featuredCategories falló (${err?.message || err})`);
    }

    // Fuente 2: Lista de juegos populares para detectar free weekends
    // Revisamos juegos conocidos que suelen tener free weekends
    if (games.length < 10) {
      try {
        const popularIds = [730, 570, 440, 550, 10, 240]; // CS2, Dota 2, TF2, Left 4 Dead, Half-Life,
        const appDetails = await axios.get(`${this.apiBase}/appdetails`, {
          params: { appids: popularIds.join(',') },
          timeout: this.timeout,
          headers: { 'User-Agent': 'GameRadar/2.1' },
        });

        if (appDetails?.data) {
          for (const [appId, detail] of Object.entries(appDetails.data)) {
            if (detail?.success && detail.data) {
              const price = detail.data.price_overview;
              // Si el precio es $0 (free weekend o free-to-play)
              if (price && price.final === 0) {
                const game = this._formatSteamGame(detail.data, appId);
                if (game) games.push(game);
              }
            }
          }
        }
      } catch (err) {
        logger.warn(`Steam: appDetails falló (${err?.message || err})`);
      }
    }

    // Deduplicar por title
    const seen = new Set();
    const unique = games.filter(g => {
      const key = g.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const result = unique.slice(0, this.maxGames);
    logger.success(`Steam: ${result.length} juegos gratis (${Date.now() - startTime}ms)`);
    return result;
  }

  async _enrichGame(appId, item) {
    try {
      // Intentar obtener detalles del juego
      const response = await axios.get(`${this.apiBase}/appdetails`, {
        params: { appids: appId },
        timeout: 5000,
        headers: { 'User-Agent': 'GameRadar/2.1' },
      });

      if (response?.data?.[appId]?.success && response.data[appId].data) {
        return this._formatSteamGame(response.data[appId].data, appId, item);
      }
    } catch (e) {
      // Si falla, usar datos básicos del featured
    }

    // Fallback con datos mínimos
    return {
      id: `steam-${appId}`,
      title: item.name || 'Steam Game',
      description: 'Juego gratuito en Steam',
      image: item.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
      url: `https://store.steampowered.com/app/${appId}`,
      platform: 'steam',
      platformName: 'Steam',
      platformIcon: '🟦',
      category: 'pc',
      endDate: null,
      worth: item.original_price ? `$${(item.original_price / 100).toFixed(2)}` : null,
      type: 'Game',
      genre: this._guessGenre(item.name || ''),
      source: 'steam',
    };
  }

  _formatSteamGame(data, appId, item) {
    if (!data) return null;

    const name = data.name || item?.name || 'Steam Game';
    const priceOverview = data.price_overview;
    const isFree = priceOverview && priceOverview.final === 0;
    const originalPrice = priceOverview?.initial || item?.original_price || 0;
    const worth = originalPrice > 0 ? `$${(originalPrice / 100).toFixed(2)}` : null;

    // Detectar si es free weekend (tiene fecha de término en la oferta)
    let endDate = null;
    if (priceOverview?.discount_percent === 100 && priceOverview?.initial > 0) {
      // 100% de descuento significa que es temporal (free weekend o similar)
      // No tenemos la fecha exacta, estimamos 3 días (fin de semana)
      const threeDays = new Date();
      threeDays.setDate(threeDays.getDate() + 3);
      endDate = threeDays.toISOString();
    }

    return {
      id: `steam-${appId}`,
      title: name,
      description: (data.short_description || data.about_the_game || '').substring(0, 300) || 'Juego gratuito en Steam',
      image: data.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
      url: `https://store.steampowered.com/app/${appId}`,
      platform: 'steam',
      platformName: 'Steam',
      platformIcon: '🟦',
      category: 'pc',
      endDate,
      worth,
      type: 'Game',
      genre: this._mapGenre(data.genres || []),
      source: 'steam',
      publisher: data.publishers?.[0] || null,
      developer: data.developers?.[0] || null,
    };
  }

  _formatFreeGame(item) {
    if (!item?.id) return null;

    return {
      id: `steam-free-${item.id}`,
      title: item.name || 'Free Game',
      description: 'Juego free-to-play en Steam',
      image: item.header_image || `https://cdn.akamai.steamstatic.com/steam/apps/${item.id}/header.jpg`,
      url: `https://store.steampowered.com/app/${item.id}`,
      platform: 'steam',
      platformName: 'Steam',
      platformIcon: '🟦',
      category: 'pc',
      endDate: null,
      worth: null,
      type: 'Game',
      genre: 'other',
      source: 'steam',
    };
  }

  _mapGenre(genres) {
    if (!genres || genres.length === 0) return 'other';
    const first = genres[0]?.description?.toLowerCase() || '';
    if (first.includes('action')) return 'action';
    if (first.includes('rpg') || first.includes('role playing') || first.includes('adventure')) return 'rpg';
    if (first.includes('indie')) return 'indie';
    if (first.includes('strategy')) return 'strategy';
    if (first.includes('racing')) return 'racing';
    if (first.includes('sports')) return 'sports';
    if (first.includes('fps') || first.includes('shooter')) return 'shooter';
    if (first.includes('puzzle')) return 'puzzle';
    return 'other';
  }

  _guessGenre(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('fps') || n.includes('shoot') || n.includes('call of duty')) return 'shooter';
    if (n.includes('rpg') || n.includes('adventure') || n.includes('fantasy')) return 'rpg';
    if (n.includes('race') || n.includes('car') || n.includes('driving')) return 'racing';
    if (n.includes('sport') || n.includes('fifa') || n.includes('football') || n.includes('soccer')) return 'sports';
    if (n.includes('strategy') || n.includes('tactical')) return 'strategy';
    if (n.includes('puzzle') || n.includes('logic')) return 'puzzle';
    if (n.includes('action')) return 'action';
    if (n.includes('indie')) return 'indie';
    return 'other';
  }
}

module.exports = new SteamService();
