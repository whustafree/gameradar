const axios = require('axios');
const logger = require('../utils/logger');

/**
 * GooglePlayDealsService - Obtiene ofertas Android desde múltiples fuentes
 * SIN Puppeteer (funciona en Vercel).
 *
 * Fuentes (en orden):
 * 1. Reddit r/googleplaydeals (JSON API) - ofertas de pago a gratis
 * 2. google-play-scraper (fallback) - Top juegos gratis de Google Play
 */
class GooglePlayDealsService {
  constructor() {
    this.timeout = 10000;
    this.maxDeals = 30;
  }

  async fetchAll() {
    const startTime = Date.now();
    logger.info('GooglePlayDeals: obteniendo ofertas Android...');

    let deals = [];

    // Fuente 1: Reddit r/googleplaydeals
    try {
      const url = 'https://www.reddit.com/r/googleplaydeals/new.json?limit=25&raw_json=1';
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: { 
          'User-Agent': 'GameRadar/2.1 (by /u/whustafree)',
          'Accept': 'application/json',
        }
      });

      if (response?.data?.data?.children) {
        const posts = response.data.data.children
          .filter(child => {
            const post = child.data;
            if (post.over_18) return false;
            return (post.url || '').includes('play.google.com');
          })
          .map(child => this.formatRedditDeal(child.data))
          .filter(Boolean);
        deals.push(...posts);
        logger.info(`GooglePlayDeals: ${posts.length} ofertas de Reddit`);
      }
    } catch (err) {
      logger.warn(`GooglePlayDeals: Reddit falló (${err?.message || err})`);
    }

    // Fuente 1.5: Enriquecer deals de Reddit con google-play-scraper
    if (deals.length > 0) {
      try {
        const gplay = require('google-play-scraper');
        for (const deal of deals) {
          if (deal.url?.includes('id=')) {
            const idMatch = deal.url.match(/[?&]id=([^&]+)/);
            if (idMatch) {
              try {
                const details = await gplay.app({ appId: idMatch[1], lang: 'es', country: 'cl' });
                if (details) {
                  deal.rating = details.score || null;
                  deal.ratingsCount = details.ratings || null;
                  deal.installs = details.installs || null;
                  deal.publisher = details.developer || details.publisher || null;
                  deal.title = details.title || deal.title;
                  deal.image = details.icon || details.coverImage || deal.image;
                  deal.description = (details.summary || details.description || '').substring(0, 300) || deal.description;
                  deal.worth = deal.worth || details.originalPrice || details.priceText || null;
                  if (details.genre) deal.genre = this.mapGenre(details.genre);
                }
              } catch (e) {
                // Skip enrichment for this app
              }
              // Pequeña pausa para no rate-limit
              await new Promise(r => setTimeout(r, 200));
            }
          }
        }
        logger.info(`GooglePlayDeals: ${deals.length} deals enriquecidos con Play Store`);
      } catch (err) {
        logger.warn(`GooglePlayDeals: enrichment falló (${err?.message || err})`);
      }
    }

    // Fuente 2: google-play-scraper (fallback) - Top juegos gratis
    if (deals.length < 5) {
      try {
        const gplay = require('google-play-scraper');
        
        // Obtener top juegos gratuitos de Google Play
        const topGames = await gplay.list({
          collection: gplay.collection.TOP_FREE,
          category: gplay.category.GAME,
          num: 30,
          lang: 'es',
          country: 'cl',
        });

        if (topGames && topGames.length > 0) {
          const formatted = topGames.map((app, i) => ({
            id: `gplay-${app.appId?.replace(/\./g, '-') || i}`,
            title: app.title || 'Android Game',
            description: (app.summary || app.description || '').substring(0, 300) || 'Juego gratuito en Google Play',
            image: app.icon || app.coverImage || 'https://play-lh.googleusercontent.com/f6o5Q0KUC7lKJ7j0Gk0v0k0v0k0v0k0v0k0v0k0v0',
            url: `https://play.google.com/store/apps/details?id=${app.appId}`,
            platform: 'android',
            platformName: 'Play Store',
            platformIcon: '📱',
            category: 'android',
            endDate: null,
            worth: app.priceText || app.originalPrice || null,
            type: 'Game',
            genre: this.mapGenre(app.genre || ''),
            source: 'googleplaydeals',
            rating: app.score || null,
            ratingsCount: app.ratings || null,
            installs: app.installs || null,
            publisher: app.developer || app.publisher || null,
          }));

          deals.push(...formatted);
          logger.info(`GooglePlayDeals: ${formatted.length} juegos de Play Store`);
        }
      } catch (err) {
        logger.warn(`GooglePlayDeals: google-play-scraper falló (${err?.message || err})`);
      }
    }

    // Deduplicar
    const seen = new Set();
    const unique = deals.filter(d => {
      const key = d.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const result = unique.slice(0, this.maxDeals);
    logger.success(`GooglePlayDeals: ${result.length} ofertas Android obtenidas (${Date.now() - startTime}ms)`);
    return result;
  }

  formatRedditDeal(post) {
    try {
      const title = (post.title || '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/^100%\s*off\s*/i, '')
        .replace(/^FREE\s*/i, '')
        .replace(/&amp;/g, '&')
        .trim();

      if (!title || title.length < 3) return null;

      let image = 'https://play-lh.googleusercontent.com/f6o5Q0KUC7lKJ7j0Gk0v0k0v0k0v0k0v0k0v0k0v0';
      if (post.thumbnail?.startsWith('http') && !post.thumbnail.includes('default')) {
        image = post.thumbnail;
      } else if (post.preview?.images?.[0]?.source?.url) {
        image = post.preview.images[0].source.url.replace(/&amp;/g, '&');
      }

      const priceMatch = (post.title || '').match(/\$(\d+\.?\d*)/);
      const worth = priceMatch ? `$${priceMatch[1]}` : null;

      return {
        id: `gpd-${post.id}`,
        title,
        description: (post.selftext || '').substring(0, 300) || 'App gratuita temporal en Google Play',
        image,
        url: post.url || 'https://play.google.com/store/apps',
        platform: 'android',
        platformName: 'Play Store',
        platformIcon: '📱',
        category: 'android',
        endDate: null,
        worth,
        type: 'Game',
        genre: 'other',
        source: 'googleplaydeals',
      };
    } catch (e) {
      return null;
    }
  }

  mapGenre(genre) {
    if (!genre) return 'other';
    const g = genre.toLowerCase();
    if (g.includes('action') || g.includes('shooter')) return 'action';
    if (g.includes('rpg') || g.includes('role') || g.includes('adventure')) return 'rpg';
    if (g.includes('puzzle')) return 'puzzle';
    if (g.includes('strategy')) return 'strategy';
    if (g.includes('racing')) return 'racing';
    if (g.includes('sports')) return 'sports';
    if (g.includes('indie')) return 'indie';
    return 'other';
  }
}

module.exports = new GooglePlayDealsService();
