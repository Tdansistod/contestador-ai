/**
 * Postgres-backed job queue (no Redis).
 * Claim jobs with SELECT ... FOR UPDATE SKIP LOCKED.
 */
import { getClient, query } from '../db/pool.js';

/**
 * Enqueue a job. Idempotent callers should pass a unique payload key and
 * check existence themselves when needed (e.g. by ml_question_id).
 *
 * @param {string} type
 * @param {object} payload
 * @param {Date} [runAt]
 * @returns {Promise<{ id: number }>}
 */
export async function enqueue(type, payload, runAt = new Date()) {
  const { rows } = await query(
    `INSERT INTO jobs (type, payload, status, run_at)
     VALUES ($1, $2, 'queued', $3)
     RETURNING id`,
    [type, JSON.stringify(payload), runAt]
  );
  return { id: rows[0].id };
}

/**
 * Claim the next available job of any type (or of a given type).
 * Returns null if none.
 *
 * @param {string} [type]
 * @returns {Promise<{ id: number, type: string, payload: object, attempts: number } | null>}
 */
export async function claimNext(type) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const params = type ? [type] : [];
    const typeClause = type ? 'AND type = $1' : '';
    const { rows } = await client.query(
      `SELECT id, type, payload, attempts
       FROM jobs
       WHERE status = 'queued' AND run_at <= now() ${typeClause}
       ORDER BY run_at ASC, id ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1`,
      params
    );

    if (rows.length === 0) {
      await client.query('COMMIT');
      return null;
    }

    const job = rows[0];
    await client.query(
      `UPDATE jobs SET status = 'running', attempts = attempts + 1 WHERE id = $1`,
      [job.id]
    );
    await client.query('COMMIT');

    return {
      id: job.id,
      type: job.type,
      payload: typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload,
      attempts: job.attempts + 1,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * @param {number} jobId
 * @returns {Promise<void>}
 */
export async function markDone(jobId) {
  await query(`UPDATE jobs SET status = 'done' WHERE id = $1`, [jobId]);
}

/**
 * @param {number} jobId
 * @param {string} errorMessage
 * @param {{ retry?: boolean, delayMs?: number }} [opts]
 * @returns {Promise<void>}
 */
export async function markFailed(jobId, errorMessage, opts = {}) {
  const { retry = false, delayMs = 60_000 } = opts;
  if (retry) {
    await query(
      `UPDATE jobs
       SET status = 'queued', error = $2, run_at = now() + ($3 || ' milliseconds')::interval
       WHERE id = $1`,
      [jobId, errorMessage, String(delayMs)]
    );
  } else {
    await query(`UPDATE jobs SET status = 'failed', error = $2 WHERE id = $1`, [
      jobId,
      errorMessage,
    ]);
  }
}
