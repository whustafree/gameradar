/**
 * FreeGameHub v2.0 - Vercel Serverless Entry Point
 * 
 * Este archivo adapta la app Express para funcionar como 
 * función serverless en Vercel.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Cargar .env solo si no estamos en Vercel (Vercel injecta las env vars)
if (!process.env.VERCEL) {
  require('dotenv').config();
}

const config = require('../src-backend/config');
const gamesService = require('../src-backend/services/games');
const apiRoutes = require('../src-backend/routes/api');
const errorHandler = require('../src-backend/middleware/errorHandler');
const rateLimiter = require('../src-backend/middleware/rateLimiter');
const logger = require('../src-backend/utils/logger');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimiter);

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stats page
app.get('/stats', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'stats.html'));
});

// Error handler
app.use(errorHandler);

// Iniciar carga de juegos inmediatamente en background (no bloqueante)
// En Vercel serverless la cache comienza vacia en cada cold start
logger.info('Iniciando carga inicial de juegos (Vercel serverless)...');
gamesService.updateAll();

// Exportar para Vercel serverless
module.exports = app;
