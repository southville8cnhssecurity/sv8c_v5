import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sv8cidsystem',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // ── TiDB Cloud requires TLS. Without this, connections may be
      // silently unstable or rejected depending on driver defaults. ──
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      // ── TiDB Cloud (and most managed DBs) close idle connections after
      // a timeout. Without keep-alive, the pool hands out dead connections
      // and every query on one fails with ECONNRESET. ──
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000, // 10s
    });

    // If a pooled connection dies for any reason, log it instead of letting
    // it crash unhandled — the pool will create a fresh one on next use.
    pool.on('connection', () => {});
    (pool as any).on?.('error', (err: any) => {
      console.error('[db] Pool error:', err.code || err.message);
    });
  }
  return pool;
}

export async function query<T>(sql: string, params?: any[]): Promise<T> {
  try {
    const [rows] = await getPool().execute(sql, params);
    return rows as T;
  } catch (err: any) {
    // ── On connection-level failures, drop the pool so the NEXT call
    // builds a fresh one instead of repeatedly handing out dead
    // connections until the process restarts. ──
    if (['ECONNRESET', 'PROTOCOL_CONNECTION_LOST'].includes(err.code)) {
      console.error('[db] Connection lost, resetting pool:', err.code);
      pool = null;
    }
    throw err;
  }
}

export default getPool;
