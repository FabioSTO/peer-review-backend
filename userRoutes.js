const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("./config");
const { hashPassword, comparePasswords } = require("./bcryptUtils");
// const con = require("./db");

const accessTokenUrl = "https://github.com/login/oauth/access_token";
const client_id = config.githubConfig.clientID;
const client_secret = config.githubConfig.clientSecret;

router.post("/registerAccount", (request, response) => {
  const {name, email, password, tags} = request.body;

  hashPassword(password, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      response.status(500).json({ message: "Error al registrar el usuario" });
      return; 
    }

    console.log(name + ' - ' + tags);

    /*const post = { username: name, email, password: hashedPassword, tags };

    const sql = "INSERT INTO users SET ?";
    con.query(sql, post, (err, result) => {
      if (err) {
        console.error(err);
        response.status(500).json({ message: err.code });
      } else {
        response.status(201).json({ message: "Usuario registrado correctamente" });
      }
    });*/
  });
})

router.get("/githubLoginCallback", async (request, response) => {
  const code = request.query.code;
  
  try {
    const params = {
      client_id: client_id,
      client_secret: client_secret,
      code: code
    };

    const res = await fetch(accessTokenUrl, {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    const data = await res.json();

    const access_token = data.access_token;

    console.log(access_token);

    response.redirect("http://localhost:3000/yourcapeer")
  } catch (error) {
    console.error("Error al intercambiar código por token de acceso.", error);
    response.status(500).send("Error al intercambiar código por token de acceso.");
  }
});

module.exports = router;