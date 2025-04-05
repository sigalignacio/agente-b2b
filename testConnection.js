const pool = require('./db/db');

async function testConnection() {
    try {
        const res = await pool.query('SELECT NOw()')
        console.log('Conexion Exitosa: ', res.rows[0]);
    } catch (err) {
        console.error('Error al conectarse a la base de datos ', err);
    } finally {
        await pool.end();
    }
 }

testConnection();