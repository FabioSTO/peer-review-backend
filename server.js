const express = require("express");
const config = require("./config");  
const app = express ();
const cors = require("cors");
const bodyParser = require('body-parser');

// Conexión a Express

app.use(bodyParser.json({ limit: '10mb' })); // Para permitir fotos más grandes

app.use(express.json()); 

// Habilita CORS

app.use(cors());

// Servidor escuchando

app.listen(config.PORT, () => {
  console.log("Server Listening on PORT:", config.PORT);
});

module.exports = app;