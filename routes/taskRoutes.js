const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("../config");
const con = require("../db");

const jwt = require('jsonwebtoken');

const { getMembersByTaskID, insertMemberInTask, getMemberDataByMemberAccount, insertReview, insertReviewTags } = require('../databaseQueries')

const jwt_secret_key = config.jwtConfig.jwtToken;

router.get("/:taskID/gitmembers", async (request, response) => {
  const taskID = request.params.taskID;
  
  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const members = await getMembersByTaskID(taskID);
        response.status(200).json(members);
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir la organización", error });
  }
});

router.post("/:taskID/gitmembers", async (request, response) => {
  const taskID = request.params.taskID;
  const {member} = request.body;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(member);
        const memberID = memberData.memberID;
        await insertMemberInTask(taskID, memberID, false, false);
        return response.status(200).json({ message: "Miembros añadidos con éxito", member });
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir a los miembros" });
  }
});

router.post("/:taskID/reviews", async (request, response) => {
  const taskID = request.params.taskID;
  const { title, desc, scope, tags, image, reviewContent, contentType, member } = request.body;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(member.member_account);
        const memberID = memberData.memberID;
        const reviewID = await insertReview( taskID, title, desc, scope, image, reviewContent, contentType, memberID );
        if (tags && tags.length > 0) {
          await insertReviewTags(tags, reviewID);
        }
        return response.status(200).json({ message: "Review añadida con éxito", title });
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir la review." });
  }
});

module.exports = router;