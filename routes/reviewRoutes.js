const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("../config");
const con = require("../db");

const { HfInference } = require("@huggingface/inference");

const jwt = require('jsonwebtoken');

const { insertComment, getMemberDataByMemberAccount, getCommentsByReviewID, closeReview, updatePending, getReviewByReviewID } = require('../databaseQueries')

const jwt_secret_key = config.jwtConfig.jwtToken;

const hugging_face_secret_key = config.huggingFaceConfig.huggingFaceKey;
const inference = new HfInference(hugging_face_secret_key);

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

async function getAIAnswer(review) {
  const reviewQuestion = `Can you write a 700-character message solution or recommendation to a review question with the title: ${review.reviewtitle}. And the description: ${review.review_desc}. And the code content: ${review.review_content}. Just write the answer directly without introduction.`;

  const out = await inference.chatCompletion({
    model: "mistralai/Mistral-7B-Instruct-v0.2",
    messages: [{ role: "user", content: reviewQuestion }],
    max_tokens: 100
  });

  return out.choices[0].message;

}

router.post("/:reviewID/AI", async (request, response) => {
  const reviewID = request.params.reviewID;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount("AICapeerUser");
        const memberID = memberData.memberID;

        const review = await getReviewByReviewID(reviewID);

        const AIAnswer = await getAIAnswer(review[0]);

        await insertComment(memberID, reviewID, AIAnswer.content);
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

router.put("/:reviewID/close", async (request, response) => {
  const reviewID = request.params.reviewID;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        await closeReview(reviewID);
        return response.status(200).json({ message: "Review cerrada", reviewID });
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir la tarea", error });
}
});

router.put("/:reviewID/gitmembers/:memberAccount", async (request, response) => {
  const reviewID = request.params.reviewID;
  const memberAccount = request.params.memberAccount;
  const {pending} = request.body;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(memberAccount);
        const memberID = memberData.memberID;
        
        await updatePending(memberID, reviewID, pending);

        return response.status(200).json({ message: "Review pending", reviewID });
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al actualizar el estado", error });
}
});

module.exports = router;