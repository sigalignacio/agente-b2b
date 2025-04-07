const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox']
    }
});

const adminNumber = '5491166525621@c.us';

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ BOT CONECTADO Y LISTO.');
});

client.on('message_create', async (message) => {
    const respuestasBot = [
        '✅ Pedido registrado',
        '❌ No entendí el pedido.',
        '⚠️ Hubo un error al registrar el pedido.',
        '✏️ Pedido editado'
    ];

    // Ignorar mensajes generados por el bot (loop)
    if (respuestasBot.some(frase => message.body.includes(frase))) return;

    // Solo responder a tu número
    if (message.from !== adminNumber) return;

    await handleMessage(message);
});

async function handleMessage(message) {
    const body = message.body.toLowerCase().trim();
    console.log('📩 MENSAJE RECIBIDO');
    console.log('👤 DE:', message.from);
    console.log('💬 TEXTO:', body);

    if (body === '!hola') {
        await client.sendMessage(message.from, '👋 ¡Hola, Nachi! Tu bot está funcionando.');
        return;
    }

    // Intentar editar pedido
    if (body.startsWith('editar pedido')) {
        const datos = parseEditarPedido(body);
        if (!datos) {
            await client.sendMessage(message.from, '❌ No entendí cómo editar el pedido. Ejemplo: "editar pedido 12 cantidad 100 color azul talla M"');
            return;
        }

        try {
            // Obtener pedido actual
            const pedidoActual = await axios.get(`http://localhost:3000/api/pedidos/${datos.id}`);
            const original = pedidoActual.data;

            // Usar datos originales como base y sobrescribir con los nuevos
            const actualizado = {
                cliente: original.cliente,
                prenda: original.prenda,
                color: datos.color || original.color,
                talla: datos.talla || original.talla,
                cantidad: datos.cantidad || original.cantidad
            };

            // Enviar actualización
            const res = await axios.put(`http://localhost:3000/api/pedidos/${datos.id}`, actualizado);
            const p = res.data;

            await client.sendMessage(message.from,
                `✏️ Pedido editado (ID: ${p.id}):\n` +
                `🧍 Cliente: ${p.cliente}\n` +
                `👕 Prenda: ${p.prenda}\n` +
                `🎨 Color: ${p.color}\n` +
                `📏 Talla: ${p.talla}\n` +
                `📦 Cantidad: ${p.cantidad}\n` +
                `💵 Total: $${p.total}`
            );
        } catch (err) {
            console.error('❌ Error al editar pedido:', err.response?.data || err.message);
            await client.sendMessage(message.from, '⚠️ Hubo un error al editar el pedido. Verificá si el ID es correcto o si pasaron más de 5 minutos.');
        }

        return;
    }

    // Si no es edición, intentar registrar nuevo pedido
    const pedido = parsePedido(body);
    if (!pedido) {
        await client.sendMessage(message.from, '❌ No entendí el pedido. Ejemplo válido: "Quiero 100 remeras negras talle M"');
        return;
    }

    try {
        const res = await axios.post('http://localhost:3000/api/pedidos', pedido);
        const p = res.data;
        await client.sendMessage(message.from,
            `✅ Pedido registrado (ID: ${p.id}):\n` +
            `🧍 Cliente: ${p.cliente}\n` +
            `👕 Prenda: ${p.prenda}\n` +
            `🎨 Color: ${p.color}\n` +
            `📏 Talla: ${p.talla}\n` +
            `📦 Cantidad: ${p.cantidad}\n` +
            `💵 Total: $${p.total}`
        );
    } catch (err) {
        console.error('❌ Error al registrar pedido:', err.response?.data || err.message);
        await client.sendMessage(message.from, '⚠️ Hubo un error al registrar el pedido. Verificá si el producto existe o si los datos son correctos.');
    }
}

function normalizarTexto(texto) {
    const singularMap = {
        remeras: 'camiseta',
        remera: 'camiseta',
        camisetas: 'camiseta',
        camisas: 'camisa',
        sudaderas: 'sudadera',
        pantalones: 'pantalón',
        chaquetas: 'chaqueta',
        faldas: 'falda',
        negros: 'negro',
        negras: 'negro',
        rojas: 'rojo',
        rojos: 'rojo',
        azules: 'azul',
        blancas: 'blanco',
        blancos: 'blanco',
        verdes: 'verde',
        grises: 'gris'
    };
    return singularMap[texto.toLowerCase()] || texto.toLowerCase();
}

function parsePedido(texto) {
    const regex = /(\d+)\s+(remeras?|camisetas?|camisas?|sudaderas?|pantalones?|chaquetas?|faldas?)\s+(\w+)\s+talle\s+([a-zA-Z]+)/i;
    const match = texto.match(regex);
    if (!match) return null;

    const cantidad = parseInt(match[1]);
    if (![50, 100, 200].includes(cantidad)) return null;

    const prenda = normalizarTexto(match[2]);
    const color = normalizarTexto(match[3]);
    const talla = match[4].toUpperCase();

    return {
        cliente: 'Nachi',
        prenda,
        color,
        talla,
        cantidad
    };
}

function parseEditarPedido(texto) {
    const regex = /editar pedido (\d+)(?:.*cantidad\s+(\d+))?(?:.*color\s+(\w+))?(?:.*talla\s+([a-zA-Z]+))?/i;
    const match = texto.match(regex);
    if (!match) return null;

    const id = parseInt(match[1]);
    const cantidad = match[2] ? parseInt(match[2]) : undefined;
    const color = match[3] ? normalizarTexto(match[3]) : undefined;
    const talla = match[4] ? match[4].toUpperCase() : undefined;

    const datos = { id };
    if (cantidad) datos.cantidad = cantidad;
    if (color) datos.color = color;
    if (talla) datos.talla = talla;

    return datos;
}

client.initialize();
