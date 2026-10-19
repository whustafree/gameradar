const axios = require('axios');
const logger = require('../utils/logger');

class RedditService {
  constructor() {
    this.timeout = 10000;
    this.clientId = process.env.REDDIT_CLIENT_ID;
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiresAt = 0;

    // Reddit responde 429 si se le golpea en ráfaga: cacheamos el resultado
    // y, si nos limita, dejamos de pedir durante un rato.
    this.rssCache = { at: 0, deals: [] };
    this.cacheTtl = 15 * 60 * 1000;
    this.blockedUntil = 0;
  }

  async getAccessToken() {
    if (!this.clientId || !this.clientSecret) return null;
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return this.accessToken;
    try {
      const response = await axios.post('https://www.reddit.com/api/v1/access_token',
        'grant_type=client_credentials',
        { timeout: this.timeout, auth: { username: this.clientId, password: this.clientSecret },
          headers: { 'User-Agent': 'GameRadar/2.1 (by /u/whustafree)', 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 300) * 1000;
      return this.accessToken;
    } catch (err) {
      return null;
    }
  }

  async fetchReddit(url) {
    const headers = { 'User-Agent': 'GameRadar/2.1 (by /u/whustafree)' };
    const token = await this.getAccessToken();
    if (token) headers['Authorization'] = `bearer ${token}`;
    return axios.get(url, { timeout: this.timeout, headers });
  }

  /**
   * Reddit bloquea los endpoints .json a IPs de datacenter (403), pero los
   * feeds .rss sí responden. Se usan como fuente principal y se normalizan
   * al mismo formato que devolvía la API JSON.
   */
  async fetchRedditRss(subreddit, limit = 25) {
    const url = `https://www.reddit.com/r/${subreddit}/new/.rss`;
    const response = await axios.get(url, {
      timeout: this.timeout,
      responseType: 'text',
      headers: {
        'User-Agent': 'GameRadar/2.1 (by /u/whustafree)',
        'Accept': 'application/atom+xml, application/xml, text/xml',
      },
    });
    return this.parseAtom(response.data, subreddit).slice(0, limit);
  }

  /** Extrae entradas de un feed Atom de Reddit. */
  parseAtom(xml, subreddit) {
    const decode = (s) => String(s || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&');

    const posts = [];
    const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRe.exec(xml)) !== null) {
      const raw = match[1];
      const title = decode((raw.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1]).trim();
      const link = (raw.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
      const updated = (raw.match(/<updated>([\s\S]*?)<\/updated>/) || [])[1] || '';
      const content = decode((raw.match(/<content[^>]*>([\s\S]*?)<\/content>/) || [])[1] || '');

      const image = (content.match(/<img[^>]*src="([^"]+)"/) || [])[1] || '';
      const playLink = (content.match(/href="(https:\/\/(?:play\.google\.com|apps\.apple\.com|store\.steampowered\.com)[^"]+)"/) || [])[1] || '';
      const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (!title) continue;

      // id estable a partir del enlace (o del título si no hay enlace)
      const idSource = link || `${subreddit}:${title}`;
      let hash = 0;
      for (let i = 0; i < idSource.length; i++) {
        hash = ((hash << 5) - hash + idSource.charCodeAt(i)) | 0;
      }

      const createdUtc = Date.parse(updated);
      posts.push({
        id: `${subreddit}_${Math.abs(hash).toString(36)}`,
        title,
        selftext: text.slice(0, 600),
        url: playLink || link,
        thumbnail: image,
        created_utc: Number.isNaN(createdUtc) ? null : Math.floor(createdUtc / 1000),
        over_18: false,
      });
    }

    return posts;
  }

  async fetchDeals(limit = 25) {
    const now = Date.now();

    // Backoff activo: devolvemos lo último bueno que tengamos
    if (now < this.blockedUntil) {
      logger.warn('Reddit: en espera por rate limit (429), usando caché');
      return this.rssCache.deals;
    }

    // Caché fresca
    if (this.rssCache.deals.length > 0 && now - this.rssCache.at < this.cacheTtl) {
      return this.rssCache.deals;
    }

    try {
      logger.info('Obteniendo ofertas Android desde Reddit (RSS)...');
      const startTime = Date.now();

      // Feed .rss: la API .json devuelve 403 desde IPs de servidor.
      // Se piden de a uno y con pausa: en paralelo Reddit responde 429.
      const subreddits = ['googleplaydeals', 'AndroidGameDeals', 'AppSales'];

      const allDeals = [];
      let rateLimited = false;

      for (const name of subreddits) {
        try {
          const posts = await this.fetchRedditRss(name, limit);
          const valid = posts
            .filter(post => this.isValidDeal(post, name.toLowerCase()))
            .map(post => this.formatDeal(post));
          allDeals.push(...valid);
        } catch (err) {
          const status = err?.response?.status;
          if (status === 429) {
            rateLimited = true;
            logger.warn('Reddit: 429, se detiene la consulta y se aplica backoff');
            break;
          }
          logger.warn(`Reddit r/${name}: ${err?.message || err}`);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (rateLimited) {
        this.blockedUntil = Date.now() + 5 * 60 * 1000;
      }

      // Deduplicate by title
      const seen = new Set();
      const unique = allDeals.filter(d => {
        const key = d.title.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (unique.length > 0) {
        this.rssCache = { at: Date.now(), deals: unique };
      }

      logger.success(`Reddit: ${unique.length} ofertas Android obtenidas de ${subreddits.length} subreddits (${Date.now() - startTime}ms)`);
      return unique;

    } catch (err) {
      logger.error('Error fetching Reddit deals', err?.message || err);
      return this.rssCache.deals;
    }
  }

  isValidDeal(post, subName) {
    if (post.over_18) return false;
    const title = (post.title || '').toLowerCase();
    const selfText = (post.selftext || '').toLowerCase();
    const combined = `${title} ${selfText}`;

    // For googleplaydeals, all posts are Android deals
    if (subName === 'googleplaydeals') return true;

    // For FreeGameFindings, check if it mentions Android/Play Store
    if (subName === 'freegamefindings') {
      const androidKeywords = ['android', 'google play', 'play store', 'gplay', 'apk', '.apk'];
      if (!androidKeywords.some(k => combined.includes(k))) return false;
    }

    // For AndroidGaming, check for free/deal keywords
    if (subName === 'androidgaming') {
      const dealKeywords = ['free', '100% off', 'freebie', 'gratis', '$0', '0.00'];
      if (!dealKeywords.some(k => combined.includes(k))) return false;
    }

    // For AppHookup, check for Android/Play Store keywords
    if (subName === 'apphookup') {
      const androidKeywords = ['android', 'google play', 'play store', 'gplay', 'apk'];
      if (!androidKeywords.some(k => combined.includes(k))) return false;
    }

    // For efreebies, check for Android keywords
    if (subName === 'efreebies') {
      const androidKeywords = ['android', 'google play', 'play store', 'apk', 'mobile', 'app'];
      if (!androidKeywords.some(k => combined.includes(k))) return false;
    }

    // For AndroidApps, check for free/deal keywords
    if (subName === 'androidapps') {
      const dealKeywords = ['free', '100% off', 'freebie', 'gratis', 'sale', 'promo', 'discount', 'deal'];
      if (!dealKeywords.some(k => combined.includes(k))) return false;
    }

    // For AppSales, filter for Android deals
    if (subName === 'appsales') {
      const androidKeywords = ['android', 'google play', 'play store', 'gplay', 'apk', 'mobile'];
      const dealKeywords = ['free', '100% off', 'freebie', 'sale', 'promo', 'discount'];
      if (!dealKeywords.some(k => combined.includes(k))) return false;
      if (!androidKeywords.some(k => combined.includes(k))) return false;
    }

    // For GameDeals, filter for Android/Google Play + deal keywords
    if (subName === 'gamedeals') {
      const androidKeywords = ['android', 'google play', 'play store', 'gplay', 'apk', 'mobile'];
      const dealKeywords = ['free', '100% off', 'sale', 'discount', 'giveaway', 'promo', 'coupon'];
      if (!androidKeywords.some(k => combined.includes(k))) return false;
      if (!dealKeywords.some(k => combined.includes(k))) return false;
    }

    // For GameDealsFree, filter for Android/Google Play
    if (subName === 'gamedealsfree') {
      const androidKeywords = ['android', 'google play', 'play store', 'gplay', 'apk', 'mobile'];
      if (!androidKeywords.some(k => combined.includes(k))) return false;
    }

    return true;
  }

  formatDeal(post) {
    let image = 'https://play-lh.googleusercontent.com/f6o5Q0KUC7lKJ7j0Gk0v0k0v0k0v0k0v0k0v0k0v0';
    if (post.thumbnail && post.thumbnail.startsWith('http') && !post.thumbnail.includes('default')) {
      image = post.thumbnail;
    } else if (post.preview?.images?.[0]?.source?.url) {
      image = post.preview.images[0].source.url.replace(/&amp;/g, '&');
    }

    const titleLower = (post.title || '').toLowerCase();
    let type = 'Game';
    if (titleLower.includes('[app') || titleLower.includes('(app') || titleLower.includes('app,')) type = 'App';

    // Better title cleaning: remove tags, brackets, common prefixes
    let title = (post.title || '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/^\s*(?:100% off|FREE|Freebie|Deal|Sale|Giveaway|App|Game)\s*[:-]\s*/i, '')
      .replace(/&amp;/g, '&')
      .trim();

    // Detect actual platform from URL if it's a Play Store link
    let platform = 'android';
    let platformName = 'Play Store';
    let platformIcon = '📱';
    let category = 'android';

    const postUrl = post.url || '';
    if (postUrl.includes('play.google.com')) {
      platform = 'android';
      platformName = 'Play Store';
      platformIcon = '📱';
      category = 'android';
    } else if (postUrl.includes('apps.apple.com') || postUrl.includes('itunes.apple.com')) {
      platform = 'ios';
      platformName = 'App Store';
      platformIcon = '🍎';
      category = 'ios';
    } else if (postUrl.includes('steampowered.com') || postUrl.includes('store.steampowered.com')) {
      platform = 'steam';
      platformName = 'Steam';
      platformIcon = '🟦';
      category = 'pc';
    }

    return {
      id: `rd-${post.id}`,
      title: title || 'App Deal',
      description: post.selftext?.substring(0, 200) + '...' || 'Oferta temporal gratuita',
      image: image,
      url: post.url || 'https://play.google.com/store/apps',
      platform: platform,
      platformName: platformName,
      platformIcon: platformIcon,
      category: category,
      endDate: this.extractEndDate(post.title, post.selftext),
      startDate: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
      worth: this.extractPrice(titleLower),
      type: type,
      genre: 'other',
      source: 'reddit'
    };
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

  extractPrice(text) {
    if (!text) return null;
    // Try to extract price like $4.99, 4,99€, 3.99 USD, etc.
    const patterns = [
      /\$(\d+\.?\d*)/,
      /(\d+[.,]\d+)\s*(?:€|eur|usd)/i,
      /(?:was|precio|original|before|normally|valía)\s*(?::|)\s*\$?(\d+\.?\d*)/i,
      /(?:\$|€)(\d+\.?\d*)\s*(?:→|->|⇒|➡️|➡|>)\s*(?:0|free|gratis)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const price = match[1] || match[0];
        const numPrice = parseFloat(price.replace(',', '.'));
        if (!isNaN(numPrice) && numPrice > 0 && numPrice < 1000) {
          return `$${numPrice.toFixed(2)}`;
        }
      }
    }
    
    // Special case: "100% off" - no price info but clearly a deal
    if (text.includes('100%') || text.includes('gratis') || text.includes('freebie')) {
      return null; // No original price known
    }
    
    return null;
  }
}

module.exports = new RedditService();
