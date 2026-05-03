import pg from 'pg';

// Production SSL: verify the server cert. If PG_CA_CERT (PEM body) is set we
// pin to it; otherwise rely on the system CA bundle (works for Railway/Neon).
function buildSsl() {
  if (process.env.NODE_ENV !== 'production') return false;
  const ca = process.env.PG_CA_CERT;
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSsl(),
  max: 20,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

const db = {
  query: (text, params) => pool.query(text, params),
  one: async (text, params) => {
    const { rows } = await pool.query(text, params);
    return rows[0] || null;
  },
  many: async (text, params) => {
    const { rows } = await pool.query(text, params);
    return rows;
  },
  pool
};

export default db;
