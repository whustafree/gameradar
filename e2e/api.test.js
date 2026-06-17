/**
 * E2E Tests — GameRadar API
 * 
 * Tests de integración para los endpoints de la API pública.
 * Se ejecutan contra el servidor local (puerto 3000) o producción.
 *
 * Run: npx playwright test e2e/ --config=playwright.config.js
 */

const { test, expect } = require('@playwright/test');

const API_BASE = process.env.API_URL || 'http://localhost:5173'; // Usa el proxy de Vite

test.describe('API /api/free-games', () => {
  test('should return games list with valid structure', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/free-games`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.games)).toBe(true);
    expect(typeof data.count).toBe('number');
    expect(typeof data.lastUpdated).toBe('string');
    
    if (data.games.length > 0) {
      const game = data.games[0];
      expect(typeof game.id).toBe('string');
      expect(typeof game.title).toBe('string');
      expect(typeof game.url).toBe('string');
      expect(typeof game.platform).toBe('string');
      expect(typeof game.category).toBe('string');
      expect(typeof game.source).toBe('string');
    }
  });

  test('should return at least some games', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/free-games`);
    const data = await response.json();
    expect(data.count).toBeGreaterThan(0);
  });

  test('should have Android games in the response', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/free-games`);
    const data = await response.json();
    const androidGames = data.games.filter(g => g.category === 'android');
    expect(androidGames.length).toBeGreaterThan(0);
  });
});

test.describe('API /api/stats', () => {
  test('should return stats with valid structure', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/stats`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(typeof data.currentGames).toBe('number');
    expect(typeof data.totalScans).toBe('number');
    expect(typeof data.uptimeFormatted).toBe('string');
  });
});

test.describe('API /api/health', () => {
  test('should return health status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/health`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(typeof data.timestamp).toBe('string');
  });
});

test.describe('API /api/docs', () => {
  test('should return API documentation', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/docs`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.api).toBeDefined();
    expect(data.api.name).toBe('GameRadar API');
    expect(Array.isArray(data.api.endpoints)).toBe(true);
    expect(data.api.endpoints.length).toBeGreaterThan(0);
  });
});

test.describe('Frontend', () => {
  test('should load the app homepage', async ({ page }) => {
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    
    // Debería mostrar la interfaz de GameRadar
    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('should have search input', async ({ page }) => {
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    
    // Buscar input de búsqueda
    const searchInput = page.locator('.header-search input');
    await expect(searchInput).toBeVisible();
  });

  test('should display game cards when loaded', async ({ page }) => {
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    
    // Esperar a que carguen los juegos
    await page.waitForSelector('.game-card', { timeout: 15000 });
    const cards = page.locator('.game-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});
