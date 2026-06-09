const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { isVipGame } = require('../utils/gameUtils');

class InstagramService {
  constructor() {
    this.enabled = config.instagram.enabled;
    this.accessToken = config.instagram.accessToken;
    this.igUserId = config.instagram.igUserId;
    this.apiVersion = 'v22.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.maxPostsPerBatch = 3;
  }

  /**
   * Publicar un lote de juegos nuevos en Instagram
   * @param {Array} newGames - Lista de juegos nuevos detectados
   * @returns {Promise<number>} - Cantidad de posts publicados exitosamente
   */
  async sendAlert(newGames) {
    if (!this.enabled || !newGames || newGames.length === 0) {
      logger.info('Instagram: desactivado o sin juegos nuevos');
      return 0;
    }

    // Primero los juegos VIP (AAA), luego el resto
    const sorted = [...newGames].sort((a, b) => {
      const aVip = this.isVipGame(a.title) ? 1 : 0;
      const bVip = this.isVipGame(b.title) ? 1 : 0;
      return bVip - aVip;
    });

    // Limitar a maxPostsPerBatch para no abusar de la API
    const toPost = sorted.slice(0, this.maxPostsPerBatch);
    let posted = 0;

    for (const game of toPost) {
      const published = await this.postGame(game);
      if (published) {
        posted++;
        // Pequeña pausa entre posts para evitar rate limiting
        await this.sleep(2000);
      }
    }

    if (posted > 0) {
      logger.success(`Instagram: ${posted}/${toPost.length} juegos publicados`);
    }
    return posted;
  }

  /**
   * Publicar un juego individual en Instagram
   * @param {Object} game - Datos del juego
   * @returns {Promise<boolean>}
   */
  async postGame(game) {
    if (!game.image || !this.isValidImageUrl(game.image)) {
      logger.warn(`Instagram: "${game.title}" no tiene imagen válida, se omite`);
      return false;
    }

    const caption = this.buildCaption(game);

    try {
      // Paso 1: Crear el contenedor de medios
      logger.info(`Instagram: creando contenedor para "${game.title}"...`);
      const container = await this.createMediaContainer(game.image, caption);

      if (!container || !container.id) {
        logger.error('Instagram: no se pudo crear el contenedor');
        return false;
      }

      // Paso 2: Esperar a que el contenedor esté listo
      const ready = await this.waitForContainer(container.id);
      if (!ready) {
        logger.error(`Instagram: el contenedor ${container.id} no está listo`);
        return false;
      }

      // Paso 3: Publicar
      logger.info(`Instagram: publicando "${game.title}"...`);
      const published = await this.publishContainer(container.id);
      if (published && published.id) {
        logger.success(`Instagram: "${game.title}" publicado ✓`);
        return true;
      }

      return false;
    } catch (err) {
      logger.error(`Instagram: error en el proceso para "${game.title}"`, err);
      return false;
    }
  }

  /**
   * Crear un contenedor de medios (imagen + caption)
   * POST /{ig-user-id}/media
   */
  async createMediaContainer(imageUrl, caption) {
    try {
      const response = await axios.post(`${this.baseUrl}/${this.igUserId}/media`, null, {
        params: {
          image_url: imageUrl,
          caption: caption,
          access_token: this.accessToken
        },
        timeout: 15000
      });
      return response.data;
    } catch (err) {
      const errorDetail = err.response?.data?.error?.message || err.message;
      logger.error(`Instagram: error creating container: ${errorDetail}`);
      throw err;
    }
  }

  /**
   * Esperar a que el contenedor esté en estado FINISHED
   * GET /{container-id}?fields=status_code
   */
  async waitForContainer(containerId, maxRetries = 8) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await axios.get(`${this.baseUrl}/${containerId}`, {
          params: {
            fields: 'status_code',
            access_token: this.accessToken
          },
          timeout: 10000
        });

        const status = response.data?.status_code;
        
        if (status === 'FINISHED') {
          return true;
        }
        if (status === 'ERROR') {
          const errorMsg = response.data?.error?.message || 'Error desconocido';
          logger.error(`Instagram: container ${containerId} en estado ERROR: ${errorMsg}`);
          return false;
        }

        // Aún en progreso, esperar con backoff
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
        await this.sleep(waitTime);

      } catch (err) {
        const errorDetail = err.response?.data?.error?.message || err.message;
        logger.warn(`Instagram: polling container ${containerId} (intento ${attempt + 1}): ${errorDetail}`);
        await this.sleep(2000);
      }
    }

    logger.error(`Instagram: container ${containerId} no terminó después de ${maxRetries} intentos`);
    return false;
  }

  /**
   * Publicar el contenedor en el feed
   * POST /{ig-user-id}/media_publish
   */
  async publishContainer(containerId) {
    try {
      const response = await axios.post(`${this.baseUrl}/${this.igUserId}/media_publish`, null, {
        params: {
          creation_id: containerId,
          access_token: this.accessToken
        },
        timeout: 15000
      });
      return response.data;
    } catch (err) {
      const errorDetail = err.response?.data?.error?.message || err.message;
      logger.error(`Instagram: error publishing container: ${errorDetail}`);
      throw err;
    }
  }

  /**
   * Construir el caption para el post de Instagram
   */
  buildCaption(game) {
    const lines = [];
    const isVip = this.isVipGame(game.title);

    // Header
    if (isVip) {
      lines.push('🚨 ¡JUEGO AAA GRATIS! 🚨');
    } else {
      lines.push('🎮 ¡NUEVO JUEGO GRATIS!');
    }
    lines.push('');

    // Título
    lines.push(`💎 ${game.title}`);
    lines.push('');

    // Detalles
    if (game.platformName) {
      lines.push(`📦 Plataforma: ${game.platformName}`);
    }
    if (game.worth) {
      lines.push(`💰 Valor: $${game.worth}`);
    }
    if (game.genre && game.genre !== 'other') {
      lines.push(`🏷️ Género: ${game.genre.charAt(0).toUpperCase() + game.genre.slice(1)}`);
    }
    if (game.endDate) {
      const endDate = new Date(game.endDate);
      const formatted = endDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      lines.push(`⏰ Hasta: ${formatted}`);
    }
    lines.push('');

    // Link
    lines.push(`🔗 Reclámalo aquí 👉 ${game.url}`);
    lines.push('');

    // Hashtags
    lines.push('#FreeGames #JuegosGratis #FreeGameHub');
    if (game.platform) {
      const platformTag = this.platformToHashtag(game.platform);
      if (platformTag) lines.push(platformTag);
    }
    if (isVip) {
      lines.push('#AAA #Gratis');
    }

    const caption = lines.join('\n');

    // Instagram tiene un límite de 2200 caracteres para captions
    if (caption.length > 2200) {
      // Truncar inteligentemente
      return caption.substring(0, 2150) + '...\n#FreeGames #FreeGameHub';
    }

    return caption;
  }

  /**
   * Detectar si un juego es VIP (AAA)
   */
  isVipGame(title) {
    return isVipGame(title);
  }

  /**
   * Convertir plataforma a hashtag
   */
  platformToHashtag(platform) {
    const tags = {
      'pc': '#PCGaming',
      'steam': '#Steam',
      'epic': '#EpicGames',
      'gog': '#GOG',
      'ps4': '#PlayStation',
      'ps5': '#PlayStation5',
      'xbox': '#Xbox',
      'xbox-series': '#XboxSeriesX',
      'nintendo': '#NintendoSwitch',
      'android': '#AndroidGaming',
      'ios': '#iOSGaming'
    };
    const tag = tags[platform];
    return tag ? `#JuegosGratis ${tag}` : '';
  }

  /**
   * Validar que una URL de imagen sea accesible públicamente
   */
  isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('https://') || url.startsWith('http://');
  }

  /**
   * Enviar un mensaje de prueba (publica un post de prueba)
   */
  async sendTestMessage() {
    if (!this.enabled) {
      logger.warn('Instagram no configurado');
      return false;
    }

    try {
      const caption = [
        '🤖 ¡FreeGameHub está en línea!',
        '',
        'Este es un mensaje de prueba para verificar',
        'la integración con Instagram.',
        '',
        '🎮 Listo para publicar juegos gratis automáticamente.',
        '',
        '#FreeGameHub #Test #JuegosGratis'
      ].join('\n');

      // Usar un placeholder HTTPS estable — placehold.co es más confiable que via.placeholder.com
      const testImageUrl = 'https://placehold.co/1080x1080/1a1a2e/ef4444?text=FreeGameHub';

      const container = await this.createMediaContainer(testImageUrl, caption);
      if (!container?.id) return false;

      const ready = await this.waitForContainer(container.id);
      if (!ready) return false;

      const published = await this.publishContainer(container.id);
      if (published?.id) {
        logger.success('Instagram: mensaje de prueba publicado');
        return true;
      }
      return false;
    } catch (err) {
      logger.error('Instagram: error en mensaje de prueba', err);
      return false;
    }
  }

  /**
   * Utilidad: sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new InstagramService();
