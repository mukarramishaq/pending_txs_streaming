const { Pool, Client } = require('pg')
const pool = new Pool({
    user: process.env.db_user || 'postgres',
    host: process.env.db_host || 'localhost',
    database: process.env.db_name || 'ethereumetl',
    password: process.env.db_pass || 'root',
    port: process.env.db_port || 5432,
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err)
    process.exit(-1)
});

module.exports = pool;