const Pool = require('pg').Pool
const pool = new Pool({
  user: 'vami',
  host: 'localhost',
  database: 'rehab',
  password: 'vami',
  port: 5432,
});
