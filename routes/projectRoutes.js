const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("../config");
const con = require("../db");

const { getMemberDataByMemberAccount, insertProjectQuery, insertMemberInProject, getOrgIDsByOrgName,
   getProjectsByOrgID, getProIDsByProName, getMembersByProID } = require('../databaseQueries')

router.post("/", async (request, response) => {
  const {orgName, proName, proDesc, adminMember} = request.body;

  try {
    const memberData = await getMemberDataByMemberAccount(adminMember);
    const orgData = await getOrgIDsByOrgName(orgName);
    if (memberData && orgData) {
      const memberID = memberData.memberID;
      const insertedProID = await insertProjectQuery(orgData.orgID, proName, proDesc);
      await insertMemberInProject(insertedProID, memberID, true, false, false); // El admin solo es ADMIN de primeras
      return response.status(200).json({ message: "Proyecto insertado con éxito", proName });
    } else {
      response.status(404).json({ message: "Usuario no encontrado", adminMember });
    }
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir el proyecto", error });
}
});

router.get("/:orgName", async (request, response) => {
  const orgName = request.params.orgName;

  try {
    const orgData = await getOrgIDsByOrgName(orgName);
    const projects = await getProjectsByOrgID(orgData.orgID);
    
    if (projects) {
      response.status(200).json(projects);
    } else {
      response.status(404).json({ message: "No hay ningún proyecto.", orgName });
    }
  } catch (error) {
    response.status(500).json({ message: "Error al obtener las invitaciones del usuario." });
  }
});

router.get("/:proName/gitmembers", async (request, response) => {
  const proName = request.params.proName;
  
  try {
    const proData = await getProIDsByProName(proName);
    const members = await getMembersByProID(proData.proID);
    response.status(200).json(members);
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir la organización", error });
  }
});

router.post("/:proName/gitmembers", async (request, response) => {
  const proName = request.params.proName;
  const {members} = request.body;

  try {
    const proData = await getProIDsByProName(proName);
    await Promise.all(members.map(async (member) => {
      const memberData = await getMemberDataByMemberAccount(member);
      const memberID = memberData.memberID;
      await insertMemberInProject(proData.proID, memberID, false, false, false);
    }));
    
    return response.status(200).json({ message: "Miembros añadidos con éxito", proName });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al invitar a los miembros" });
  }
});

module.exports = router;