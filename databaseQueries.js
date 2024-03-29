const con = require("./db");

async function getGitMemberAccountAndMemberTokenByUserID(userID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT * FROM gitmember WHERE userID = ?";
    con.query(selectQuery, [userID], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        if (rows.length === 0) {
          resolve(null);
        } else {
          resolve(rows);
        }
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
          resolve(rows[0]);
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

async function getMemberDataByMemberAccount(member_account) {
  return new Promise((resolve, reject) => {
    const getMemberDataQuery = "SELECT * from gitmember WHERE member_account = ?";
    con.query(getMemberDataQuery, [member_account], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows[0]); 
      }
    });
  });
};

async function getIsOwnerByOrgNameAndMemberID(orgName, member_id) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT is_owner, r.orgID, orgname FROM organization_member r JOIN organization o ON r.orgID = o.orgID WHERE memberID = ? AND orgname = ? AND is_owner = TRUE;";
    con.query(selectQuery, [member_id, orgName], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        if (rows.length === 0) {
          resolve(false);
        } else {
          resolve(true);
        }
      };
    });
  });
};

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

async function insertMemberInOrganization(orgID, member_id, is_owner, is_admin, is_super_reviewer) {
  return new Promise((resolve, reject) => {
    const insertMemberInOrganizationQuery = "INSERT INTO organization_member (orgID, memberID, join_date, is_owner, is_admin, is_super_reviewer) VALUES (?, ?, CURDATE(), ?, ?, ?)"
    con.query(insertMemberInOrganizationQuery, [orgID, member_id, is_owner, is_admin, is_super_reviewer], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

async function getOrganizationsByUserID(userID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT orgname, org_desc, org_creation_date, member_account, join_date, is_active, is_owner, is_admin, is_super_reviewer FROM gitmember m JOIN organization_member om on m.memberID = om.memberID JOIN organization o on om.orgID = o.orgID WHERE userID = ?";
    con.query(selectQuery, [userID], (err, rows) => {
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
};

async function getInvitationsByUserID(userID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT orgname, member_account FROM gitmember g JOIN invited_to i ON g.memberID = i.memberID JOIN organization o ON i.orgID = o.orgID WHERE userID = ? AND inv_state = 'PENDING'";
    con.query(selectQuery, [userID], (err, rows) => {
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
};

async function isInvitedByMemberIDAndOrgID(memberID, orgID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT * FROM invited_to WHERE memberID = ? AND orgID = ?";
    con.query(selectQuery, [memberID, orgID], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        if (rows.length === 0) {
          resolve(false);
        } else {
          resolve(true);
        }
      };
    });
  });
};

async function insertInvitationsByOrgName(orgName, members) {
  return new Promise(async (resolve, reject) => {

    if (members && members.length > 0) {
      try {
      const alreadyInvitedMembers = [];
      const promises = members.map( async (member) => {
        const memberData = await getMemberDataByMemberAccount(member);
        const orgData = await getOrgIDsByOrgName(orgName);
        const isInvited = await isInvitedByMemberIDAndOrgID(memberData.memberID, orgData.orgID);
        if (isInvited) { 
          alreadyInvitedMembers.push(member); // Guardo aquellos ya invitados en un array para mostrarlos en la página
          return null; 
        }
        return [memberData.memberID, orgData.orgID, 'PENDING']
      });

      const values = await Promise.all(promises);

      const validValues = values.filter(value => value !== null); 
      
      if (validValues.length === 0) {
        resolve({ message: "Todos los miembros ya están invitados a esta organización", alreadyInvitedMembers});
        return;
      }

      const insertOrganizationQuery = "INSERT INTO invited_to (memberID, orgID, inv_state) VALUES ?"
      con.query(insertOrganizationQuery, [validValues], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve({ message: "Invitaciones enviadas correctamente.", alreadyInvitedMembers});
        }
      });
    } catch (error) {
      reject(error);
    }
  } else {
    resolve({
      message: "No se proporcionaron miembros para invitar.",
      alreadyInvitedMembers: []
    });
  }
    
  });
};

async function respondInvitation(orgID, memberID, responseValue) {
  return new Promise((resolve, reject) => {
    const insertMemberInOrganizationQuery = "UPDATE invited_to SET inv_state = ? WHERE orgID = ? AND memberID = ? ;"
    con.query(insertMemberInOrganizationQuery, [responseValue, orgID, memberID], (err, result) => {
      if (err) {
        reject(err);
      } else {
        if (result.affectedRows > 0) {
          resolve("Invitación aceptada con éxito.");
        } else {
          reject(new Error("No se encontró ninguna invitación para actualizar."));
        }
      }
    });
  });
};

module.exports = {
  getGitMemberAccountAndMemberTokenByUserID,
  getOrgIDsByOrgName,
  getMemberIDsByOrgID,
  getIsOwnerByOrgNameAndMemberID,
  insertOrganizationQuery,
  insertMemberInOrganization,
  getMemberDataByMemberAccount,
  getOrganizationsByUserID,
  insertInvitationsByOrgName,
  getInvitationsByUserID,
  respondInvitation
};