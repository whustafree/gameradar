/**
 * Utilidades compartidas para servicios de juegos
 */
const config = require('../config');

/**
 * Detectar si un juego es VIP (AAA) basado en keywords
 * @param {string} title - Título del juego
 * @returns {boolean}
 */
function isVipGame(title) {
  if (!title) return false;
  return config.vipKeywords.some(k => title.toLowerCase().includes(k));
}

/**
 * Escapar HTML para mensajes de texto
 * @param {string} text - Texto a escapar
 * @returns {string}
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = {
  isVipGame,
  escapeHtml
};
