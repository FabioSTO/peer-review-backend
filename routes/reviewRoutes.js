const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("../config");
const con = require("../db");

const jwt = require('jsonwebtoken');

const { insertComment, getMemberDataByMemberAccount, getCommentsByReviewID } = require('../databaseQueries')

const jwt_secret_key = config.jwtConfig.jwtToken;

router.post("/:reviewID/comments", async (request, response) => {
  const reviewID = request.params.reviewID;
  const {memberAccount, comment} = request.body;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(memberAccount);
        const memberID = memberData.memberID;
        await insertComment(memberID, reviewID, comment);
        return response.status(200).json({ message: "Mensaje enviado con éxito", reviewID });
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir la tarea", error });
}
});

router.get("/:reviewID/comments", async (request, response) => {
  const reviewID = request.params.reviewID;

  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const comments = await getCommentsByReviewID(reviewID);
        
        if (comments) {
          response.status(200).json(comments);
        } else {
          response.status(404).json({ message: "No hay ningún comentario.", reviewID });
        }
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Error al obtener los comentarios." });
  }
});

module.exports = router;