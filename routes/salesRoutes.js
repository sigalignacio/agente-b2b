const express = require('express');
const router = express.Router();
const pool = require('../db/db');

// Sinónimos para tipo_prenda
const synonyms = {
    remera: ['remera', 'camiseta'],
    camisa: ['camisa'],
    sudadera: ['sudadera'],
    pantalón: ['pantalón'],
    chaqueta: ['chaqueta'],
    falda: ['falda'],
};

// GET de productos con filtros
router.get('/productos', async (req, res) => {
    try {
        const { tipo_prenda, color, talla } = req.query;

        let conditions = [];
        let values = [];

        if (tipo_prenda) {
            const palabrasClave = synonyms[tipo_prenda.toLowerCase()] || [tipo_prenda.toLowerCase()];
            const placeholders = palabrasClave.map((_, i) => `$${values.length + i + 1}`);
            conditions.push(`LOWER(tipo_prenda) IN (${placeholders.join(',')})`);
            values.push(...palabrasClave);
        }

        if (color) {
            conditions.push(`LOWER(color) = $${values.length + 1}`);
            values.push(color.toLowerCase());
        }

        if (talla) {
            conditions.push(`LOWER(talla) = $${values.length + 1}`);
            values.push(talla.toLowerCase());
        }

        let query = 'SELECT * FROM productos';
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener productos:', err);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// POST para registrar pedidos
router.post('/pedidos', async (req, res) => {
    const { cliente, prenda, color, talla, cantidad } = req.body;

    if (!cliente || !prenda || !color || !talla || !cantidad) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    if (![50, 100, 200].includes(cantidad)) {
        return res.status(400).json({ error: 'La cantidad debe ser 50, 100 o 200' });
    }

    try {
        const producto = await pool.query(
            `SELECT * FROM productos
             WHERE LOWER(tipo_prenda) = LOWER($1)
             AND LOWER(color) = LOWER($2)
             AND LOWER(talla) = LOWER($3)
             AND disponible = true
             LIMIT 1`,
            [prenda, color, talla]
        );

        if (producto.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado o no disponible' });
        }

        const p = producto.rows[0];
        let total = 0;

        if (cantidad === 50) total = p.precio_50_u;
        if (cantidad === 100) total = p.precio_100_u;
        if (cantidad === 200) total = p.precio_200_u;

        const result = await pool.query(
            `INSERT INTO pedidos (cliente, prenda, color, talla, cantidad, total)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [cliente, prenda, color, talla, cantidad, total]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error al registrar pedido:', err.message, err.stack);
        res.status(500).json({ error: 'Error al registrar el pedido' });
    }
});

// PUT para editar pedido dentro de los primeros 5 minutos
router.put('/pedidos/:id', async (req, res) => {
    const { id } = req.params;
    const { prenda, color, talla, cantidad } = req.body;

    if (!prenda || !color || !talla || !cantidad) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    if (![50, 100, 200].includes(cantidad)) {
        return res.status(400).json({ error: 'La cantidad debe ser 50, 100 o 200' });
    }

    try {
        const existing = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        const pedido = existing.rows[0];
        const now = new Date();
        const creado = new Date(pedido.fecha);
        const diffMinutes = (now - creado) / (1000 * 60);

        if (diffMinutes > 5) {
            return res.status(403).json({ error: 'Solo se puede editar dentro de los primeros 5 minutos' });
        }

        const producto = await pool.query(
            `SELECT * FROM productos
             WHERE LOWER(tipo_prenda) = LOWER($1)
             AND LOWER(color) = LOWER($2)
             AND LOWER(talla) = LOWER($3)
             AND disponible = true
             LIMIT 1`,
            [prenda, color, talla]
        );

        if (producto.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado o no disponible' });
        }

        const p = producto.rows[0];
        let total = 0;

        if (cantidad === 50) total = p.precio_50_u;
        if (cantidad === 100) total = p.precio_100_u;
        if (cantidad === 200) total = p.precio_200_u;

        const update = await pool.query(
            `UPDATE pedidos
             SET prenda = $1, color = $2, talla = $3, cantidad = $4, total = $5
             WHERE id = $6
             RETURNING *`,
            [prenda, color, talla, cantidad, total, id]
        );

        res.json(update.rows[0]);
    } catch (err) {
        console.error('Error al editar pedido:', err);
        res.status(500).json({ error: 'Error al editar el pedido' });
    }
});

// GET para obtener un pedido por ID
router.get('/pedidos/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error al obtener pedido por ID:', err);
        res.status(500).json({ error: 'Error al obtener el pedido' });
    }
});

module.exports = router;
