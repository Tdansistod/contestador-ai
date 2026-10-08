import pg from 'pg';
import config from '../config.js';

const { Pool } = pg;

/** @type {import('pg').Pool} */
const pool = new Pool({
  connectionString: config.databaseUrl,
  // Keep it simple for local/dev; tune later for VPS
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
});

/**
 * @param {string} text
 * @param {unknown[]} [params]
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params) {
  return pool.query(text, params);
}

/**
 * @returns {Promise<import('pg').PoolClient>}
 */
export async function getClient() {
  return pool.connect();
}

export { pool };
export default pool;
