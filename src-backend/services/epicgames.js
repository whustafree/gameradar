const axios = require('axios');
const logger = require('../utils/logger');

class EpicGamesService {
  constructor() {
    this.graphqlUrl = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions';
    this.timeout = 10000;
  }

  async fetchFreeGames() {
    try {
      logger.info('Obteniendo juegos gratuitos de Epic Games...');
      const startTime = Date.now();

      const response = await axios.get(this.graphqlUrl, {
        timeout: this.timeout,
        params: {
          locale: 'es-ES',
          country: 'CL',
          allowCountries: 'CL'
        },
        headers: {
          'User-Agent': 'FreeGameHub/2.0'
        }
      });

      const games = this.parseGames(response.data);
      logger.success(`Epic Games: ${games.length} juegos obtenidos (${Date.now() - startTime}ms)`);
      return games;

    } catch (err) {
      logger.error('Error fetching Epic Games', err);
      return [];
    }
  }

  parseGames(data) {
    if (!data?.data?.Catalog?.searchStore?.elements) {
      return [];
    }

    const elements = data.data.Catalog.searchStore.elements;
    
    return elements
      .filter(game => this.isCurrentlyFree(game))
      .map(game => this.formatGame(game));
  }

  isCurrentlyFree(game) {
    const promotions = game.promotions?.promotionalOffers;
    if (!promotions || promotions.length === 0) return false;
    
    const now = new Date();
    return promotions.some(offer => {
      if (!offer.promotionalOffers) return false;
      return offer.promotionalOffers.some(promo => {
        const start = new Date(promo.startDate);
        const end = new Date(promo.endDate);
        return start <= now && end >= now;
      });
    });
  }

  formatGame(game) {
    const promotions = game.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0];
    const endDate = promotions ? promotions.endDate : null;
    
    // Construir URL
    const slug = game.catalogNs?.mappings?.[0]?.pageSlug || game.urlSlug;
    const url = `https://store.epicgames.com/es-ES/p/${slug}`;

    // Obtener imagen
    const image = game.keyImages?.find(img => img.type === 'OfferImageWide')?.url ||
                  game.keyImages?.[0]?.url ||
                  'https://via.placeholder.com/300x150?text=Epic+Games';

    // Obtener precio original
    const originalPrice = game.price?.totalPrice?.fmtPrice?.originalPrice;

    return {
      id: `epic-${game.id}`,
      title: game.title,
      description: game.description || 'Juego gratuito en Epic Games Store',
      image: image,
      url: url,
      platform: 'epic',
      platformName: 'Epic Games',
      endDate: endDate,
      worth: originalPrice || null,
      type: 'Game',
      category: 'pc',
      genre: this.detectGenre(game.categories),
      source: 'epic'
    };
  }

  detectGenre(categories = []) {
    const genreMap = {
      'ACTION': 'action',
      'ADVENTURE': 'rpg',
      'RPG': 'rpg',
      'STRATEGY': 'strategy',
      'PUZZLE': 'puzzle',
      'RACING': 'racing',
      'SPORTS': 'sports',
      'INDIE': 'indie'
    };

    for (const cat of categories) {
      const path = cat.path || '';
      for (const [key, genre] of Object.entries(genreMap)) {
        if (path.includes(key)) return genre;
      }
    }
    return 'other';
  }
}

module.exports = new EpicGamesService();
