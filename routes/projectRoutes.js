const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("../config");
const con = require("../db");

const jwt = require('jsonwebtoken');

const { getMemberDataByMemberAccount, insertProjectQuery, insertMemberInProject, getOrgIDsByOrgName,
   getProjectsByOrgID, getProIDsByProName, getMembersByProID, insertTaskQuery, insertMemberInTask,
   getTasksByProID } = require('../databaseQueries')

const jwt_secret_key = config.jwtConfig.jwtToken;

router.post("/", async (request, response) => {
  const {orgName, proName, proDesc, adminMember} = request.body;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(adminMember);
        const orgData = await getOrgIDsByOrgName(orgName);
        if (memberData && orgData) {
          const memberID = memberData.memberID;
          const insertedProID = await insertProjectQuery(orgData.orgID, proName, proDesc);
          await insertMemberInProject(insertedProID, memberID, true, false); // El admin solo es ADMIN de primeras
          return response.status(200).json({ message: "Proyecto insertado con éxito", proName });
        } else {
          response.status(404).json({ message: "Usuario no encontrado", adminMember });
        }
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir el proyecto", error });
}
});

router.get("/:orgName", async (request, response) => {
  const orgName = request.params.orgName;

  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const orgData = await getOrgIDsByOrgName(orgName);
        const projects = await getProjectsByOrgID(orgData.orgID);
        
        if (projects) {
          response.status(200).json(projects);
        } else {
          response.status(404).json({ message: "No hay ningún proyecto.", orgName });
        }
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Error al obtener los proyectos." });
  }
});

router.get("/:proName/gitmembers", async (request, response) => {
  const proName = request.params.proName;
  
  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const proData = await getProIDsByProName(proName);
        const members = await getMembersByProID(proData.proID);
        response.status(200).json(members);
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir la organización", error });
  }
});

router.post("/:proName/gitmembers", async (request, response) => {
  const proName = request.params.proName;
  const {members} = request.body;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const proData = await getProIDsByProName(proName);
        await Promise.all(members.map(async (member) => {
          const memberData = await getMemberDataByMemberAccount(member);
          const memberID = memberData.memberID;
          await insertMemberInProject(proData.proID, memberID, false, true); // Es reviewer de primeras
        }));
        
        return response.status(200).json({ message: "Miembros añadidos con éxito", proName });
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al invitar a los miembros" });
  }
});

router.post("/:proName/tasks", async (request, response) => {
  const proName = request.params.proName;
  const {taskName, taskDesc, assignMember, creatorMember} = request.body;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(assignMember);
        const memberDataAdmin = await getMemberDataByMemberAccount(creatorMember);
        const proData = await getProIDsByProName(proName);
        if (memberData && proData) {
          const memberID = memberData.memberID;
          const memberAdminID = memberDataAdmin.memberID;
          const insertedTaskID = await insertTaskQuery(proData.proID, taskName, taskDesc);
          if (memberID === memberAdminID) {
            await insertMemberInTask(insertedTaskID, memberID, true, true); // El creador se asigna como admin
          } else {
            await insertMemberInTask(insertedTaskID, memberAdminID, true, false); // Insertamos el creador
            await insertMemberInTask(insertedTaskID, memberID, false, true); // Insertamos el asignado
          }
          return response.status(200).json({ message: "Tarea insertada con éxito", taskName });
        } else {
          response.status(404).json({ message: "Usuario no encontrado", assignMember });
        }
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir la tarea", error });
}
});

router.get("/:proName/tasks", async (request, response) => {
  const proName = request.params.proName;

  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const proData = await getProIDsByProName(proName);
        const tasks = await getTasksByProID(proData.proID);
        
        if (tasks) {
          response.status(200).json(tasks);
        } else {
          response.status(404).json({ message: "No hay ningún task.", proName });
        }
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Error al obtener las tareas." });
  }
});

module.exports = router;