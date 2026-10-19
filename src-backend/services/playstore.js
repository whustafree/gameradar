const { getGplay } = require('../utils/gplay');
const logger = require('../utils/logger');

// google-play-scraper NO se importa en el top-level a propósito: v10 es ESM y
// Vercel ejecuta Node 22, donde require() de ESM lanza ERR_REQUIRE_ESM y eso
// tumbaba la función completa (500 en /api/health incluido). Se carga de forma
// perezosa con import() dentro de fetchAll().

const PRIORITY_CATEGORIES = ['GAME', 'GAME_ACTION', 'GAME_PUZZLE', 'GAME_CASUAL'];

/**
 * Juegos gratuitos destacados de Google Play.
 *
 * No son "ofertas" con fecha de fin: son los más descargados de cada
 * categoría y se marcan como siempre gratis. Sirven para que la pestaña
 * Android no dependa solo de F-Droid (que en serverless se salta) y de
 * Reddit.
 */
class PlayStoreService {
  constructor() {
    this.timeout = 8000;
  }

  async fetchAll(limitPerCategory = 12) {
    const startTime = Date.now();

    let gplay;
    try {
      gplay = await getGplay();
    } catch (err) {
      logger.warn(`PlayStore: no se pudo cargar el scraper (${err?.message || err})`);
      return [];
    }

    const categories = PRIORITY_CATEGORIES
      .map(key => gplay.category?.[key])
      .filter(Boolean);

    if (categories.length === 0) {
      logger.warn('PlayStore: el scraper no expone categorías, se omite');
      return [];
    }

    const results = await Promise.allSettled(
      categories.map(category =>
        gplay.list({
          collection: gplay.collection.TOP_FREE,
          category,
          num: limitPerCategory,
          country: 'us',
          lang: 'es',
        })
      )
    );

    const seen = new Set();
    const games = [];

    results.forEach((result, idx) => {
      if (result.status !== 'fulfilled') {
        logger.warn(`PlayStore ${PRIORITY_CATEGORIES[idx]}: ${result.reason?.message || result.reason}`);
        return;
      }
      for (const app of result.value) {
        if (!app?.appId || seen.has(app.appId)) continue;
        seen.add(app.appId);
        games.push(this.toGame(app));
      }
    });

    logger.success(`PlayStore: ${games.length} juegos gratis (${Date.now() - startTime}ms)`);
    return games;
  }

  toGame(app) {
    const clean = (value) => String(value || '')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const description = clean(app.summary);

    return {
      id: `ps-${app.appId}`,
      title: clean(app.title) || 'Juego de Play Store',
      description: description.slice(0, 300) || 'Juego gratis en Google Play',
      image: app.icon || null,
      url: app.url || `https://play.google.com/store/apps/details?id=${app.appId}`,
      platform: 'android',
      platformName: 'Play Store',
      platformIcon: '📱',
      category: 'android',
      endDate: null,
      startDate: new Date().toISOString(),
      worth: null,
      type: 'Game',
      genre: this.mapGenre(description),
      publisher: app.developer || null,
      developer: app.developer || null,
      rating: typeof app.score === 'number' ? app.score : null,
      source: 'playstore',
    };
  }

  mapGenre(text) {
    const t = String(text || '').toLowerCase();
    if (/(puzzle|sudoku|rompecabezas|acertijo)/.test(t)) return 'puzzle';
    if (/(shooter|disparos|fps)/.test(t)) return 'shooter';
    if (/(racing|carreras|drift)/.test(t)) return 'racing';
    if (/(strategy|estrategia|tower defense)/.test(t)) return 'strategy';
    if (/(rpg|role.?playing|mazmorra)/.test(t)) return 'rpg';
    if (/(sport|fútbol|futbol|baloncesto|golf)/.test(t)) return 'sports';
    if (/(action|acción|accion)/.test(t)) return 'action';
    return 'other';
  }
}

module.exports = new PlayStoreService();
