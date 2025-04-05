const express = require('express');
const router = express.Router();
const pool = require('../db/db');
router.get('/productos', async (req, res)=> {
    try {
        const result = await pool.query('SELECt * FROM productos');
        res.json(result.rows);
    } catch (err) {
        console.log('Error al obtener Productos: ', err);
        res.status(500).json({error: 'Error al obtener Productos'})
    }
})

module.exports = router;    