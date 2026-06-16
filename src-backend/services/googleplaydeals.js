const axios = require('axios');
const logger = require('../utils/logger');

/**
 * GooglePlayDealsService - Obtiene ofertas Android desde redes sociales y RSS
 * SIN Puppeteer (funciona en Vercel).
 *
 * Fuentes:
 * 1. Reddit r/googleplaydeals RSS feed
 * 2. Opcionalmente enriquece con google-play-scraper para rating/installs/precio
 */
class GooglePlayDealsService {
  constructor() {
    this.timeout = 10000;
    this.maxDeals = 30;
  }

  async fetchAll() {
    const startTime = Date.now();
    logger.info('GooglePlayDeals: obteniendo ofertas Android desde RSS...');

    try {
      // 1. Fetch from Reddit googleplaydeals subreddit via JSON API (no auth needed)
      const url = 'https://www.reddit.com/r/googleplaydeals/new.json?limit=30&raw_json=1';
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'GameRadar/2.1 (by /u/whustafree)' }
      });

      if (!response?.data?.data?.children) {
        logger.warn('GooglePlayDeals: respuesta inesperada de Reddit');
        return [];
      }

      const posts = response.data.data.children
        .filter(child => {
          const post = child.data;
          if (post.over_18) return false;
          if (!post.url) return false;
          // Must link to Google Play Store
          return post.url.includes('play.google.com');
        })
        .map(child => this.formatDeal(child.data))
        .filter(Boolean);

      // 2. Also try FreeGameFindings for Android posts
      const fgfUrl = 'https://www.reddit.com/r/FreeGameFindings/new.json?limit=25&raw_json=1';
      const fgfResponse = await axios.get(fgfUrl, {
        timeout: this.timeout,
        headers: { 'User-Agent': 'GameRadar/2.1 (by /u/whustafree)' }
      });

      if (fgfResponse?.data?.data?.children) {
        const fgfPosts = fgfResponse.data.data.children
          .filter(child => {
            const post = child.data;
            if (post.over_18) return false;
            const text = `${post.title || ''} ${post.selftext || ''}`.toLowerCase();
            const hasAndroidKeyword = ['android', 'google play', 'play store', 'gplay', 'apk'].some(k => text.includes(k));
            const hasPlayLink = (post.url || '').includes('play.google.com');
            return hasPlayLink || hasAndroidKeyword;
          })
          .map(child => this.formatDeal(child.data))
          .filter(Boolean);
        posts.push(...fgfPosts);
      }

      // Deduplicate by title
      const seen = new Set();
      const unique = posts.filter(d => {
        const key = d.title.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (unique.length > 0) {
        logger.success(`GooglePlayDeals: ${unique.length} ofertas obtenidas (${Date.now() - startTime}ms)`);
      } else {
        logger.info('GooglePlayDeals: no se encontraron ofertas Android');
      }

      return unique.slice(0, this.maxDeals);

    } catch (err) {
      logger.warn(`GooglePlayDeals: error (${err?.message || err})`);
      return [];
    }
  }

  formatDeal(post) {
    try {
      const title = (post.title || '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/^100%\s*off\s*/i, '')
        .replace(/^FREE\s*/i, '')
        .replace(/&amp;/g, '&')
        .trim();

      if (!title || title.length < 3) return null;

      // Extract app ID from Play Store URL for enrichment later
      const playUrl = post.url || '';
      const appIdMatch = playUrl.match(/[?&]id=([^&]+)/);
      const appId = appIdMatch ? appIdMatch[1] : null;

      // Extract image
      let image = 'https://play-lh.googleusercontent.com/f6o5Q0KUC7lKJ7j0Gk0v0k0v0k0v0k0v0k0v0k0v0';
      if (post.thumbnail && post.thumbnail.startsWith('http') && !post.thumbnail.includes('default')) {
        image = post.thumbnail;
      } else if (post.preview?.images?.[0]?.source?.url) {
        image = post.preview.images[0].source.url.replace(/&amp;/g, '&');
      }

      // Try to extract original price from title
      const priceMatch = (post.title || '').match(/\$(\d+\.?\d*)/);
      const worth = priceMatch ? `$${priceMatch[1]}` : null;

      return {
        id: `gpd-${post.id}`,
        title: title || 'Android App Deal',
        description: (post.selftext || '').substring(0, 300) || 'App gratuita temporal en Google Play',
        image: image,
        url: playUrl || 'https://play.google.com/store/apps',
        platform: 'android',
        platformName: 'Play Store',
        platformIcon: '📱',
        category: 'android',
        endDate: this.extractEndDate(post.title, post.selftext),
        worth: worth,
        type: 'Game',
        genre: 'other',
        source: 'googleplaydeals',
        // Store appId so it can be enriched later if needed
        _appId: appId,
      };
    } catch (e) {
      return null;
    }
  }

  extractEndDate(title, selfText) {
    const text = `${title || ''} ${selfText || ''}`;
    const patterns = [
      /(?:until|ends?|expires?|válido hasta|finaliza)\s*(?::|)\s*(\d{1,2})[\/\s\.](\d{1,2})[\/\s\.]?(\d{2,4})/i,
      /(?:until|ends?|válido hasta|finaliza)\s*(?::|)\s*(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*,?\s*(\d{4})?)/i,
      /(\d{1,2})\s*(?:day|día)s?\s*(?:left|restantes)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const date = new Date(match[0]);
          if (!isNaN(date.getTime())) return date.toISOString();
        } catch (e) { /* ignore */ }
      }
    }
    return null;
  }
}

module.exports = new GooglePlayDealsService();
