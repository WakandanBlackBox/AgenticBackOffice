import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err.message);
});

const db = {
  query: (text, params) => pool.query(text, params),

  // Single row or null
  one: async (text, params) => {
    const { rows } = await pool.query(text, params);
    return rows[0] || null;
  },

  // All rows
  many: async (text, params) => {
    const { rows } = await pool.query(text, params);
    return rows;
  },

  pool
};

export default db;
