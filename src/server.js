import express from 'express';
import config from './config.js';
import { query } from './db/pool.js';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({
      status: 'ok',
      env: config.nodeEnv,
      llm: config.llm.provider,
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[health] DB check failed:', err.message);
    res.status(503).json({
      status: 'degraded',
      error: 'database_unavailable',
      time: new Date().toISOString(),
    });
  }
});

// Placeholders for upcoming routes (Phase 1–2)
// app.use('/auth/ml', authRoutes);
// app.use('/webhooks', webhookRoutes);
// app.use('/api', apiRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'internal_error' });
});

const server = app.listen(config.port, () => {
  console.log(`[server] contestador-ai listening on :${config.port}`);
  console.log(`[server] LLM provider: ${config.llm.provider}`);
  console.log(`[server] NODE_ENV: ${config.nodeEnv}`);
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down...`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
