const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("../config");
const { hashPassword, comparePasswords } = require("../bcryptUtils");
const con = require("../db");

const { getGitMemberAccountAndMemberTokenByUserID, getOrgIDsByOrgName, getMemberIDsByOrgID,
  getIsOwnerByOrgNameAndMemberID, insertOrganizationQuery, insertMemberInOrganization,
   getMemberDataByMemberAccount } = require('../databaseQueries')

const accessTokenUrl = "https://github.com/login/oauth/access_token";
const client_id = config.githubConfig.clientID;
const client_secret = config.githubConfig.clientSecret;

module.exports = router;