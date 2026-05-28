const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class TelegramService {
  constructor() {
    this.enabled = config.telegram.enabled;
    this.token = config.telegram.token;
    this.chatId = config.telegram.chatId;
  }

  async sendAlert(newGames) {
    if (!this.enabled || !newGames || newGames.length === 0) return false;

    const vips = newGames.filter(g => 
      config.vipKeywords.some(k => g.title.toLowerCase().includes(k))
    );
    const isVipAlert = vips.length > 0;

    let header = isVipAlert 
      ? '🚨🚨 <b>¡ALERTA SNIPER: JUEGO AAA!</b> 🚨🚨' 
      : '✨ <b>¡Nuevos Juegos Gratis!</b>';
    
    let message = `${header}\n\n`;
    const limit = 10;
    const showList = newGames.slice(0, limit);

    showList.forEach(game => {
      const isVip = config.vipKeywords.some(k => game.title.toLowerCase().includes(k));
      const icon = isVip ? '💎' : (game.category === 'android' ? '📱' : '🎮');
      const title = this.escapeHtml(game.title);
      const platform = game.platformName || game.platform;
      message += `${icon} <b>${title}</b>\n   📦 ${platform}\n   ➜ <a href="${game.url}">Reclamar Ahora</a>\n\n`;
    });

    if (newGames.length > limit) {
      message += `<i>...y ${newGames.length - limit} juegos más</i>\n`;
    }
    
    message += `\n👀 <a href="${config.app.url}">Ver Todos en FreeGameHub</a>`;

    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });
      logger.success('Notificación Telegram enviada');
      return true;
    } catch (err) {
      logger.error('Error enviando a Telegram', err);
      return false;
    }
  }

  async sendTestMessage() {
    if (!this.enabled) {
      logger.warn('Telegram no configurado');
      return false;
    }

    try {
      await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        chat_id: this.chatId,
        text: '🤖 <b>FreeGameHub</b> está en línea!',
        parse_mode: 'HTML'
      });
      logger.success('Mensaje de prueba enviado');
      return true;
    } catch (err) {
      logger.error('Error en mensaje de prueba', err);
      return false;
    }
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

module.exports = new TelegramService();
