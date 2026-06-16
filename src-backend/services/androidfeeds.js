const axios = require('axios');
const logger = require('../utils/logger');

/**
 * AndroidFeedsService - Obtiene ofertas Android desde RSS feeds y blogs
 *
 * Fuentes:
 * - Android Police RSS (app sales coverage)
 * - xda-developers RSS (app deals)
 *
 * No requiere autenticación ni dependencias externas.
 * Parseo de RSS manual (son XML simples) para evitar instalar xml parser.
 */
class AndroidFeedsService {
  constructor() {
    this.timeout = 8000;
    this.feeds = [
      {
        url: 'https://www.androidpolice.com/feed/',
        name: 'Android Police',
        keywords: ['free app', 'app sale', 'free game', 'paid app', 'gone free',
                    'app of the day', 'freebie', 'gratis', '100% off', 'discount',
                    'app sales', 'game sale'],
      },
    ];
  }

  async fetchAll() {
    const startTime = Date.now();
    const allDeals = [];
    const seen = new Set();

    try {
      logger.info('Obteniendo ofertas Android desde RSS feeds...');

      for (const feed of this.feeds) {
        try {
          const response = await axios.get(feed.url, {
            timeout: this.timeout,
            headers: { 'User-Agent': 'GameRadar/2.1' },
          });

          if (!response.data) continue;

          const items = this.parseRssItems(response.data, feed);
          allDeals.push(...items);

        } catch (e) {
          logger.warn(`AndroidFeeds: error en ${feed.name} (${e?.message || e})`);
        }
      }

      // Deduplicate by title
      const unique = allDeals.filter(d => {
        const key = d.title.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      logger.success(`AndroidFeeds: ${unique.length} ofertas obtenidas de ${this.feeds.length} feeds (${Date.now() - startTime}ms)`);
      return unique;

    } catch (err) {
      logger.warn(`AndroidFeeds: error general (${err?.message || err})`);
      return [];
    }
  }

  parseRssItems(xml, feed) {
    const items = [];
    // Simple RSS <item> extraction without XML parser
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      try {
        const itemXml = match[1];

        const title = this.extractTag(itemXml, 'title');
        const description = this.extractTag(itemXml, 'description') || '';
        const link = this.extractTag(itemXml, 'link');
        const pubDate = this.extractTag(itemXml, 'pubDate');

        if (!title) continue;

        const combined = `${title} ${description}`.toLowerCase();

        // Check if this article matches our deal keywords
        const isDeal = feed.keywords.some(kw => combined.includes(kw));
        if (!isDeal) continue;

        // Skip articles that are clearly NOT about Android app deals
        const skipKeywords = ['review', 'scam', 'warning', 'malware', 'virus',
                              'interview', 'podcast', 'opinion', 'editorial',
                              'best phone', 'best tablet', 'accessories',
                              'how to', 'tips', 'tricks',
                              'microsd', 'micro sd', 'sd card', 'memory card',
                              'usb-c', 'usb c', 'usb-c cable', 'charger', 'charging',
                              'power bank', 'cable', 'adapter', 'headphone',
                              'earbuds', 'speaker', 'bluetooth', 'case', 'cover',
                              'screen protector', 'tempered glass', 'stand',
                              'mount', 'tripod', 'keyboard', 'mouse', 'smartwatch',
                              'fitness tracker', 'router', 'modem', 'wifi',
                              'smart home', 'security camera', 'ring light',
                              'laptop', 'chromebook', 'tablet', 'monitor',
                              'tv', 'streaming', 'subscription', 'music',
                              'movie', 'book', 'kindle', 'audible',
                              'printer', 'scanner', 'shipping', 'pixel',
                              'samsung galaxy', 'oneplus', 'xiaomi', 'motorola',
                              'google home', 'nest', 'echo', 'alexa',
                              'app of the week', 'weekly roundup', 'weekly recap'];
        if (skipKeywords.some(kw => combined.includes(kw))) continue;

        // Must contain at least one app-related keyword to pass
        const appKeywords = ['app', 'game', 'play store', 'google play', 'apk',
                             'android app', 'mobile game', 'free to play',
                             'update', 'feature', 'launch', 'release', 'beta',
                             'iap', 'in-app', 'store', 'gratis', 'paid'];
        if (!appKeywords.some(kw => combined.includes(kw))) continue;

        // Extract possible app name from title (first meaningful part)
        const cleanTitle = title
          .replace(/<[^>]+>/g, '') // Strip HTML
          .replace(/\([^)]*\)/g, '') // Remove parenthetical 
          .replace(/\[[^\]]*\]/g, '') // Remove bracketed content
          .replace(/^.*?:\s*/, '') // Remove leading "Android Police: " etc
          .replace(/^(Deal|Sale|Free|App).*?:\s*/i, '') // Remove leading labels
          .replace(/&amp;/g, '&')
          .replace(/&[lg]t;/g, '')
          .trim()
          .substring(0, 200);

        if (!cleanTitle || cleanTitle.length < 5) continue;            // Try to extract price info
            const worth = this.extractPrice(combined);

            // Try to extract an image from description
            const image = this.extractImage(description);

        items.push({
          id: `rss-${Buffer.from(title).toString('base64').substring(0, 20).replace(/[^a-z0-9]/gi, '')}`,
          title: cleanTitle,
          description: description
            .replace(/<[^>]+>/g, '')
            .substring(0, 300) || 'Android app deal',
          image: image || 'https://play-lh.googleusercontent.com/f6o5Q0KUC7lKJ7j0Gk0v0k0v0k0v0k0v0k0v0k0v0',
          url: link || 'https://play.google.com/store/apps',
          platform: 'android',
          platformName: 'Play Store',
          platformIcon: '📱',
          category: 'android',
          endDate: null,
          worth: worth,
          type: 'Game',
          genre: 'other',
          source: 'androidfeeds',
        });
      } catch (e) {
        // Skip malformed items
      }
    }

    return items;
  }

  extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    if (match) {
      return (match[1] || match[2] || '').trim();
    }
    return '';
  }

  extractPrice(text) {
    const priceMatch = text.match(/\$(\d+\.?\d*)/);
    if (priceMatch) return `$${priceMatch[1]}`;
    return null;
  }

  extractImage(html) {
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/i;
    const match = html.match(imgRegex);
    if (match && match[1] && !match[1].includes('gravatar') && !match[1].includes('logo')) {
      return match[1];
    }
    return null;
  }
}

module.exports = new AndroidFeedsService();
