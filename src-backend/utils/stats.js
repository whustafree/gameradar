class StatsManager {
  constructor() {
    this.bootTime = new Date().toISOString();
    this.data = {
      totalScans: 0,
      alertsSent: 0,
      gamesFoundHistory: 0,
      lastScanDuration: 0,
      errors: []
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
