const logger = require('../utils/logger');
const { getGplay } = require('../utils/gplay');

/**
 * NotengoSueltoService - Obtiene apps de pago GRATIS para Android
 * desde notengosuelto.com y enriquece con datos de Google Play Store.
 *
 * La página carga dinámicamente (JS), por eso usamos Puppeteer.
 * Luego cada app se enriquece con google-play-scraper para obtener
 * nombre, imagen, precio original, rating, etc.
 *
 * IMPORTANTE: Puppeteer y google-play-scraper se importan con require()
 * DINÁMICO dentro de fetchAll() para evitar que el módulo explote al
 * ser importado en Vercel (donde no hay Chrome binary).
 */
class NotengoSueltoService {
  constructor() {
    this.url = 'https://www.notengosuelto.com/apps-de-pago-gratis-android';
    this.timeout = 25000;
    this.maxApps = 10;
  }

  async fetchAll() {
    // Puppeteer no funciona en Vercel (no hay Chrome binary)
    if (process.env.VERCEL) {
      logger.warn('NotengoSuelto: Puppeteer no disponible en Vercel, saltando');
      return [];
    }

    let puppeteer, gplay;
    try {
      puppeteer = require('puppeteer');
      // ESM: se carga con import() dinámico (ver utils/gplay.js)
      gplay = await getGplay();
    } catch (e) {
      logger.warn(`NotengoSuelto: no se pudieron cargar dependencias (${e?.message || e})`);
      return [];
    }

    // enrichWithPlayStore() corre fuera de este scope: guardamos la referencia
    // en la instancia (antes era una variable local y provocaba ReferenceError).
    this._gplay = gplay;

    const startTime = Date.now();
    logger.info('NotengoSuelto: iniciando scraper con Puppeteer...');

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.147 Mobile Safari/537.36'
      );

      // Navigate and wait for content to load
      await page.goto(this.url, {
        waitUntil: 'networkidle2',
        timeout: this.timeout,
      });

      // Wait a bit more for any lazy-loaded content
      await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));

      // Extract all Google Play Store links from the page
      const playLinks = await this.extractPlayLinks(page);

      if (playLinks.length === 0) {
        logger.warn('NotengoSuelto: no se encontraron enlaces a Google Play');
        return [];
      }

      logger.info(`NotengoSuelto: ${playLinks.length} enlaces a Google Play encontrados`);

      // Enrich each link with Google Play Store data (concurrente + rate limit)
      const linksToProcess = playLinks.slice(0, this.maxApps);
      const results = await Promise.allSettled(
        linksToProcess.map(async (link, i) => {
          // Stagger requests by 300ms each to avoid rate limiting
          await new Promise(r => setTimeout(r, i * 300));
          return this.enrichWithPlayStore(link);
        })
      );

      const apps = results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);

      logger.success(`NotengoSuelto: ${apps.length} apps obtenidas (${Date.now() - startTime}ms)`);
      return apps;

    } catch (err) {
      logger.error('NotengoSuelto: error general', err);
      return [];
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  /**
   * Extract Google Play Store links from the page.
   */
  async extractPlayLinks(page) {
    try {
      const links = await page.evaluate(() => {
        // Find all links pointing to play.google.com
        const anchors = document.querySelectorAll('a[href*="play.google.com"]');
        const uniqueUrls = new Set();

        anchors.forEach(a => {
          const href = a.href || a.getAttribute('href') || '';
          // Clean up the URL
          const cleanUrl = href.split('?')[0].split('#')[0];
          if (cleanUrl.includes('play.google.com/store/apps/details')) {
            uniqueUrls.add(cleanUrl);
          }
        });

        return Array.from(uniqueUrls);
      });

      return links;
    } catch (e) {
      logger.warn(`NotengoSuelto: error extrayendo links (${e?.message || e})`);
      return [];
    }
  }

  /**
   * Get app details from Google Play Store using google-play-scraper.
   */
  async enrichWithPlayStore(playStoreUrl) {
    try {
      const gplay = this._gplay;
      if (!gplay) {
        logger.warn('NotengoSuelto: google-play-scraper no inicializado (¿fetchAll no corrió?)');
        return null;
      }

      // Extract app ID from URL
      const match = playStoreUrl.match(/[?&]id=([^&]+)/);
      if (!match) return null;

      const appId = match[1];
      if (!appId) return null;

      // Get app details from Google Play
      const appDetails = await gplay.app({ appId, lang: 'es', country: 'cl' });
      if (!appDetails || !appDetails.title) return null;

      // Check if it's actually free right now
      const isFree = !appDetails.priceText || appDetails.priceText === 'Free' || appDetails.priceText === 'Gratis' || parseFloat(appDetails.price) === 0;
      if (!isFree) return null;

      // Original price from the "was" price
      const originalPrice = appDetails.originalPrice || appDetails.priceText || '';

      return {
        id: `nes-${appId.replace(/\./g, '-')}`,
        title: appDetails.title || 'Android App',
        description: (appDetails.summary || appDetails.description || '').substring(0, 300) || 'App gratuita temporal en Google Play',
        image: appDetails.icon || appDetails.coverImage || appDetails.headerImage || 'https://placehold.co/300x150/1a1a2e/3b82f6?text=App',
        url: playStoreUrl,
        platform: 'android',
        platformName: 'Play Store',
        platformIcon: '📱',
        category: 'android',
        endDate: null, // No end date info available
        worth: originalPrice || null,
        type: appDetails.genre ? 'Game' : 'App',
        genre: this.mapGenre(appDetails.genre || ''),
        source: 'notengosuelto',
        // Extra metadata
        publisher: appDetails.developer || appDetails.publisher || null,
        developer: appDetails.developer || null,
        rating: appDetails.score || null,
        ratingsCount: appDetails.ratings || null,
        installs: appDetails.installs || null,
      };
    } catch (e) {
      logger.warn(`NotengoSuelto: error enriqueciendo app (${e?.message || e})`);
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

module.exports = new NotengoSueltoService();
