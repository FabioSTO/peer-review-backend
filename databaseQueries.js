const con = require("./db");

async function getGitMemberAccountAndMemberTokenByUserID(userID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT * FROM gitmember WHERE userID = ?";
    con.query(selectQuery, [userID], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function getOrgIDsByOrgName(orgName) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT orgID FROM organization WHERE orgname = ?";
    con.query(selectQuery, [orgName], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Si no encuentra orgID, devuelve null
        if (rows.length === 0) {
          resolve(null);
        } else {
          // Si encuentra un orgID, los devuelve
          resolve(rows);
        }
      };
    });
  });
};

async function getMemberIDsByOrgID(orgID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT memberID FROM organization_member WHERE orgID = ? AND is_active = TRUE";
    con.query(selectQuery, [orgID], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        if (rows.length === 0) {
          resolve(null);
        } else {
          resolve(rows);
        }
      };
    });
  });
}

async function getMemberOwnerIDByOrgIDAndMemberID(orgID, member_id) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT is_owner FROM org_roles WHERE orgID = ? AND memberID = ?";
    con.query(selectQuery, [orgID, member_id], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        if (rows.length === 0) {
          resolve(null);
        } else {
          resolve(rows[0]);
        }
      };
    });
  });
}

async function insertOrganizationQuery(orgName, orgDesc) {
  return new Promise((resolve, reject) => {
    const insertOrganizationQuery = "INSERT INTO organization (orgname, org_desc, org_creation_date) VALUES (?, ?, CURDATE())"
    con.query(insertOrganizationQuery, [orgName, orgDesc], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.insertId); // Te devuelve el ID
      }
    });
  });
};

async function getMemberDataByMemberAccount(member_account) {
  return new Promise((resolve, reject) => {
    const getMemberDataQuery = "SELECT * from gitmember WHERE member_acount = ?"
    con.query(getMemberDataQuery, [member_account], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows[0]); 
      }
    });
  });
};

async function insertMemberInOrganization(orgID, member_id) {
  return new Promise((resolve, reject) => {
    const insertMemberInOrganizationQuery = "INSERT INTO organization_member (orgID, memberID, join_date) VALUES (?, ?, CURDATE())"
    con.query(insertMemberInOrganizationQuery, [orgID, member_id], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

module.exports = {
  getGitMemberAccountAndMemberTokenByUserID,
  getOrgIDsByOrgName,
  getMemberIDsByOrgID,
  getMemberOwnerIDByOrgIDAndMemberID,
  insertOrganizationQuery,
  insertMemberInOrganization,
  getMemberDataByMemberAccount
};