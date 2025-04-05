const express = require('express');

require('dotenv').config();

const app = express

const port = process.env.PORT || 3000;

app.use(express.json());
app.get('/',(req,res)=> {
    res.send('Servidor funcionando correctamente.');
})
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`)
})