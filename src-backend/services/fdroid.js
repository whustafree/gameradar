const axios = require('axios');
const logger = require('../utils/logger');

/**
 * FDroidService - Obtiene apps Android gratuitas desde F-Droid.
 *
 * F-Droid es un repositorio de apps Android libres y de código abierto.
 * Proporciona un índice JSON completo sin autenticación.
 *
 * API: https://f-droid.org/repo/index-v1.json (~50MB, ~6s)
 * Documentación: https://f-droid.org/en/docs/All_our_APIs/
 */
class FDroidService {
  constructor() {
    this.indexUrl = 'https://f-droid.org/repo/index-v1.json';
    this.iconBaseUrl = 'https://f-droid.org/repo/icons/';
    this.timeout = 15000;
    this.maxApps = 30;
    // Categorías de F-Droid que nos interesan
    // Incluye juegos y categorías adyacentes (entretenimiento, emuladores, multimedia)
    this.targetCategories = new Set([
      'games', 'game', 'gaming',
      'entertainment', 'entretenimiento',
      'emulation', 'emuladores', 'emulator',
      'music' , 'audio',
      'reading',
      'sports', 'deportes',
      'science & education', 'education', 'educación',
    ]);
  }

  async fetchAll() {
    const startTime = Date.now();
    logger.info('FDroid: descargando índice de apps...');

    try {
      // Descargar el índice completo
      const response = await axios.get(this.indexUrl, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'GameRadar/2.1', 'Accept': 'application/json' },
        // Importante: no intentar parsear como JSON hasta que llegue completo
        responseType: 'json',
      });

      if (!response?.data?.apps) {
        logger.warn('FDroid: índice sin datos de apps');
        return [];
      }

      const apps = Object.values(response.data.apps);
      logger.info(`FDroid: ${apps.length} apps en el índice`);

      // Filtrar por categoría "Games" y formatear
      const games = [];
      const processed = new Set();

      for (const app of apps) {
        if (!app?.packageName) continue;
        if (processed.has(app.packageName)) continue;
        processed.add(app.packageName);

        const categories = (app.categories || []).map(c => c.toLowerCase().trim());
        const isGame = categories.some(c => this.targetCategories.has(c));

        if (!isGame) continue;

        const formatted = this.formatApp(app);
        if (formatted) games.push(formatted);
      }

      logger.success(`FDroid: ${games.length} juegos obtenidos (${Date.now() - startTime}ms)`);
      return games.slice(0, this.maxApps);

    } catch (err) {
      logger.warn(`FDroid: error (${err?.message || err})`);
      return [];
    }
  }

  formatApp(app) {
    try {
      const packageName = app.packageName;
      if (!packageName) return null;

      // Construir URL de icono
      const iconPath = app.icon;
      const iconUrl = iconPath
        ? `${this.iconBaseUrl}${iconPath}`
        : `https://placehold.co/300x150/1a1a2e/3b82f6?text=${encodeURIComponent((app.name || 'App').slice(0, 20))}`;

      return {
        id: `fdroid-${packageName.replace(/\./g, '-')}`,
        title: app.name || packageName,
        description: app.summary || app.description || 'App gratuita de F-Droid',
        image: iconUrl,
        url: `https://f-droid.org/packages/${packageName}/`,
        platform: 'android',
        platformName: 'F-Droid',
        platformIcon: '📱',
        category: 'android',
        endDate: null,
        worth: null, // F-Droid apps are always free
        type: 'Game',
        genre: this.mapCategory(app.categories || []),
        source: 'fdroid',
        publisher: app.authorName || app.developer || null,
        license: app.license || null,
      };
    } catch (e) {
      return null;
    }
  }

  mapCategory(categories) {
    if (!categories || categories.length === 0) return 'other';
    const cat = categories[0].toLowerCase();
    if (cat.includes('action') || cat.includes('shooter')) return 'action';
    if (cat.includes('rpg') || cat.includes('role') || cat.includes('adventure')) return 'rpg';
    if (cat.includes('puzzle')) return 'puzzle';
    if (cat.includes('strategy')) return 'strategy';
    if (cat.includes('racing')) return 'racing';
    if (cat.includes('sports')) return 'sports';
    if (cat.includes('indie')) return 'indie';
    return 'other';
  }
}

module.exports = new FDroidService();
