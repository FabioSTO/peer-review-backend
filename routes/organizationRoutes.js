const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("../config");
const { hashPassword, comparePasswords } = require("../bcryptUtils");
const con = require("../db");

const { getGitMemberAccountAndMemberTokenByUserID, getOrgIDsByOrgName, getMemberIDsByOrgID,
  getIsOwnerByOrgNameAndMemberID, insertOrganizationQuery, insertMemberInOrganization,
   getMemberDataByMemberAccount, getOrganizationsByUserID, insertInvitationsByOrgName, respondInvitation } = require('../databaseQueries')

router.post("/", async (request, response) => {
  const {orgName, orgDesc, memberAccount} = request.body;

  try {
    const memberData = await getMemberDataByMemberAccount(memberAccount);
    if (memberData) {
      const memberID = memberData.memberID;
      const is_owner = await getIsOwnerByOrgNameAndMemberID(orgName, memberID);
      if (is_owner === true) {
        return response.status(409).json({ message: "Ya eres owner de una organización con ese nombre", orgName });
      } else {
        const insertedOrgID = await insertOrganizationQuery(orgName, orgDesc);
        await insertMemberInOrganization(insertedOrgID, memberID, true, false, false); // El owner solo va a tener el rol de owner
        return response.status(200).json({ message: "Organización insertada con éxito", orgName });
      }
    } else {
      response.status(404).json({ message: "Usuario no encontrado", memberAccount });
    }
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir la organización", error });
  }
});

router.get("/:userID", async (request, response) => {
  const userID = request.params.userID;

  try {
    const organizations = await getOrganizationsByUserID(userID);
    if (organizations) {
      response.status(200).json(organizations);
    } else {
      response.status(404).json({ message: "No perteneces a ninguna organización", userID });
    }
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al añadir la organización", error });
  }
});

router.post("/:orgName/invitations", async (request, response) => {
  const orgName = request.params.orgName;
  const {members} = request.body;

  try {
    const result = await insertInvitationsByOrgName(orgName, members);
    return response.status(200).json({ 
      message: result.message, 
      alreadyInvitedMembers: result.alreadyInvitedMembers,
      members: members 
    });
  } catch (error) {
    response.status(500).json({ 
      message: "Hubo un error al invitar a los miembros", 
      error: error 
    });
  }
});

router.post("/:orgName/invitations/:member_account", async (request, response) => {
  const orgName = request.params.orgName;
  const member_account = request.params.member_account;
  const responseValue = request.query.response;

  try {
    const memberData = await getMemberDataByMemberAccount(member_account);
    const orgData = await getOrgIDsByOrgName(orgName);
    const resultInv = await respondInvitation(orgData.orgID, memberData.memberID, responseValue);
    if (responseValue === "ACCEPTED") {
      await insertMemberInOrganization(orgData.orgID, memberData.memberID, false, false, false) // Es un usuario normal
      return response.status(200).json({ message: resultInv });
    } else {
      return response.status(200).json({ message: "Invitación rechazada." });
    }
  } catch (error) {
    response.status(500).json({ 
      message: "Hubo un error al responder a la invitación.", 
      error: error 
    });
  }
});

module.exports = router;