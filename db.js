const mysql = require("mysql2");
const config = require("./config");

// Conexión a BD

const con = mysql.createConnection(config.dbConfig);

con.connect(function(err) {
  if (err) throw err;
  console.log("Conectado!");
});

module.exports = con;