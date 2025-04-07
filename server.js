const express = require('express');

require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

const salesRoutes = require('./routes/salesRoutes');
app.use('/api',salesRoutes);
app.get('/',(req,res)=> {
    res.send('Servidor funcionando correctamente.');
})
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`)
})