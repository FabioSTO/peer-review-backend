const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("../config");
const con = require("../db");

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nombre único para cada archivo
  }
});

const upload = multer({ storage });

const jwt = require('jsonwebtoken');

const { getMembersByTaskID, insertMemberInTask, getMemberDataByMemberAccount, insertReview, insertReviewTags, editTask, insertPending, getMembersByOrgID, getOrgIDsByOrgName,
   getSuperReviewedOrganizationsByMemberID, getUserTagsByMemberID, getSuperReviewedReviews, getReviews, getUpdatesByTaskID, insertUpdate } = require('../databaseQueries')

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

router.put("/:taskID", async (request, response) => {
  const taskID = request.params.taskID;
  const { taskName, taskDesc, taskState } = request.body;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        await editTask(taskID, taskName, taskDesc, taskState);
        return response.status(200).json({ message: "Tarea editada con éxito", taskName });
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al editar la tarea" });
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

router.post("/:taskID/reviews", upload.single('image'), async (request, response) => {
  const taskID = request.params.taskID;
  const { title, desc, scope, reviewContent, contentType, organization} = request.body;
  const tags = JSON.parse(request.body.tags); // Convertir tags de JSON string a objeto
  const member = JSON.parse(request.body.member); // Convertir member de JSON string a objeto
  const image = request.file ? `/uploads/${request.file.filename}` : null; // Ruta de la imagen subida

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(member);
        const memberID = memberData.memberID;
        const reviewID = await insertReview( taskID, title, desc, scope, image, reviewContent, contentType, memberID );
        await insertPending(memberID, reviewID);
        
        // Necesito el orgName o orgID
        const orgData = await getOrgIDsByOrgName(organization);
        const membersByOrg = await getMembersByOrgID(orgData.orgID);

        for (const memberO of membersByOrg) {
          const superReviewedOrganizations = await getSuperReviewedOrganizationsByMemberID(memberO.memberID);
      
          if (superReviewedOrganizations && superReviewedOrganizations.includes(orgData.orgID)) {
            const userTags = await getUserTagsByMemberID(memberO.memberID);
      
            const tags = userTags.map(tag => tag.tag);
      
            var reviews = await getSuperReviewedReviews(tags, orgData.orgID, memberO.memberID);
          } else {
            var reviews = await getReviews(memberO.memberID);
          }
      
          if (reviews.some(r => r.reviewID === reviewID)) {
            await insertPending(memberO.memberID, reviewID);
          }
        }

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

router.post("/:taskID/updates", async (request, response) => {
  const taskID = request.params.taskID;
  const {memberAccount, taskUpdate} = request.body;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(memberAccount);
        const memberID = memberData.memberID;
        await insertUpdate(memberID, taskID, taskUpdate);
        return response.status(200).json({ message: "Update enviado con éxito", taskID });
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir la update", error });
}
});

router.get("/:taskID/updates", async (request, response) => {
  const taskID = request.params.taskID;

  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const updates = await getUpdatesByTaskID(taskID);
        
        if (updates) {
          response.status(200).json(updates);
        } else {
          response.status(404).json({ message: "No hay ningún update.", taskID });
        }
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Error al obtener los updates." });
  }
});

module.exports = router;