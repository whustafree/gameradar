const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * FDroidService - Obtiene apps Android gratuitas desde F-Droid.
 *
 * F-Droid es un repositorio de apps Android libres y de código abierto.
 * Proporciona un índice JSON completo sin autenticación.
 *
 * API: https://f-droid.org/repo/index-v1.json (~50MB, ~6s)
 * Documentación: https://f-droid.org/en/docs/All_our_APIs/
 *
 * MEJORA: Cache en disco del índice para evitar descargas repetidas.
 * El índice se descarga solo si han pasado más de 12h desde la última.
 */
class FDroidService {
  constructor() {
    this.indexUrl = 'https://f-droid.org/repo/index-v1.json';
    this.iconBaseUrl = 'https://f-droid.org/repo/icons/';
    this.timeout = 15000;
    this.maxApps = 30;
    // Cache del índice en disco (solo fuera de Vercel)
    this.isVercel = !!process.env.VERCEL;
    this.cachePath = path.join(__dirname, '../../tmp/fdroid-index.json');
    this.cacheTtlMs = 12 * 60 * 60 * 1000; // 12 horas
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
    this._cachedIndex = null;
  }

  /**
   * Carga el índice desde disco si está fresco, o lo descarga de internet.
   */
  async _loadIndex() {
    // Si ya lo tenemos en memoria (esta misma ejecución), reusar
    if (this._cachedIndex) return this._cachedIndex;

    // Intentar cargar desde disco (solo fuera de Vercel)
    if (!this.isVercel) {
      try {
        if (fs.existsSync(this.cachePath)) {
          const stat = fs.statSync(this.cachePath);
          const age = Date.now() - stat.mtimeMs;
          if (age < this.cacheTtlMs) {
            const raw = fs.readFileSync(this.cachePath, 'utf8');
            this._cachedIndex = JSON.parse(raw);
            logger.info(`FDroid: índice cargado de caché (${Math.round(age / 60000)}min antiguo, ${Object.keys(this._cachedIndex).length} apps)`);
            return this._cachedIndex;
          } else {
            logger.info(`FDroid: caché expirado (${Math.round(age / 60000)}min > ${Math.round(this.cacheTtlMs / 60000)}min)`);
          }
        }
      } catch (e) {
        logger.warn(`FDroid: error leyendo caché (${e.message})`);
      }
    }

    // Descargar índice
    logger.info('FDroid: descargando índice de apps desde internet...');
    const response = await axios.get(this.indexUrl, {
      timeout: this.timeout,
      headers: { 'User-Agent': 'GameRadar/2.1', 'Accept': 'application/json' },
      responseType: 'json',
    });

    if (!response?.data?.apps) {
      throw new Error('Respuesta sin datos de apps');
    }

    this._cachedIndex = response.data.apps;

    // Guardar en disco (solo fuera de Vercel)
    if (!this.isVercel) {
      try {
        const tmpDir = path.dirname(this.cachePath);
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        fs.writeFileSync(this.cachePath, JSON.stringify(this._cachedIndex));
        logger.info(`FDroid: índice guardado en caché (${Object.keys(this._cachedIndex).length} apps)`);
      } catch (e) {
        logger.warn(`FDroid: error guardando caché (${e.message})`);
      }
    }

    return this._cachedIndex;
  }

  async fetchAll() {
    const startTime = Date.now();

    try {
      const apps = await this._loadIndex();
      const appsArray = Object.values(apps);
      logger.info(`FDroid: ${appsArray.length} apps en el índice`);

      // Filtrar por categoría y formatear
      const games = [];
      const processed = new Set();

      for (const app of appsArray) {
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
