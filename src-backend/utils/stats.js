class StatsManager {
  constructor() {
    this.bootTime = new Date().toISOString();
    this.data = {
      totalScans: 0,
      alertsSent: 0,
      gamesFoundHistory: 0,
      lastScanDuration: 0,
      errors: [],
      // Monitoreo de fuentes: registro de cuántas veces falla cada fuente
      sourceErrors: {},
      // Historial de precios: seguimiento de juegos que han tenido cambios de precio
      priceHistory: [],
    };
  }

  incrementScans() {
    this.data.totalScans++;
  }

  incrementAlerts() {
    this.data.alertsSent++;
  }

  setGamesFound(count) {
    this.data.gamesFoundHistory = count;
  }

  setScanDuration(duration) {
    this.data.lastScanDuration = duration;
  }

  addError(error) {
    this.data.errors.unshift({
      message: error.message,
      timestamp: new Date().toISOString()
    });
    // Mantener solo los últimos 10 errores
    if (this.data.errors.length > 10) {
      this.data.errors = this.data.errors.slice(0, 10);
    }
  }

  /**
   * Registra un error de una fuente específica.
   * Útil para monitorear qué fuentes están fallando recurrentemente.
   */
  recordSourceError(sourceName, errorMessage) {
    if (!this.data.sourceErrors[sourceName]) {
      this.data.sourceErrors[sourceName] = {
        errors: [],
        totalErrors: 0,
        lastError: null,
        consecutiveFailures: 0,
      };
    }
    const record = this.data.sourceErrors[sourceName];
    record.errors.push({
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
    record.totalErrors++;
    record.lastError = errorMessage;
    record.consecutiveFailures++;
    // Mantener solo los últimos 5 errores por fuente
    if (record.errors.length > 5) {
      record.errors = record.errors.slice(-5);
    }
  }

  /**
   * Resetea el contador de fallos consecutivos de una fuente (cuando funciona).
   */
  resetSourceErrors(sourceName) {
    if (this.data.sourceErrors[sourceName]) {
      this.data.sourceErrors[sourceName].consecutiveFailures = 0;
    }
  }

  /**
   * Registra un cambio de precio detectado.
   */
  recordPriceChange(gameTitle, oldPrice, newPrice, source) {
    this.data.priceHistory.unshift({
      gameTitle,
      oldPrice,
      newPrice,
      source,
      detectedAt: new Date().toISOString(),
    });
    // Mantener solo los últimos 50 cambios de precio
    if (this.data.priceHistory.length > 50) {
      this.data.priceHistory = this.data.priceHistory.slice(0, 50);
    }
  }

  getStats(currentGamesCount) {
    return {
      ...this.data,
      bootTime: this.bootTime,
      currentGames: currentGamesCount,
      uptime: process.uptime(),
      uptimeFormatted: this.formatUptime(process.uptime()),
      memoryUsage: process.memoryUsage()
    };
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    return parts.join(' ') || '< 1m';
  }
}

module.exports = new StatsManager();
