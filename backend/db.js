const { Pool } = require('pg')

const pool = new Pool({
  user: process.env.PG_USER || 'vami',
  host: process.env.PG_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'rehab',
  password: process.env.PG_PASSWORD || 'vami',
  port: Number(process.env.PG_PORT || 5432),
})

module.exports = { pool }
