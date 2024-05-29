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

async function getMembersByOrgID(orgID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT om.memberID, join_date, member_account, is_owner, is_admin, is_super_reviewer FROM organization_member om JOIN gitmember g ON om.memberID = g.memberID WHERE orgID = ? AND is_active = TRUE";
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
    const insertOrganizationQuery = "INSERT INTO organization (orgname, org_desc, org_creation_date) VALUES (?, ?, DATE(NOW()))"
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
    const insertMemberInOrganizationQuery = "INSERT INTO organization_member (orgID, memberID, join_date, is_owner, is_admin, is_super_reviewer) VALUES (?, ?, DATE(NOW()), ?, ?, ?)"
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

async function insertProjectQuery(orgID, proName, proDesc) {
  return new Promise((resolve, reject) => {
    const insertProjectQuery = "INSERT INTO project (orgID, proname, pro_desc, pro_creation_date) VALUES (?, ?, ?, DATE(NOW()))"
    con.query(insertProjectQuery, [orgID, proName, proDesc], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.insertId); // Te devuelve el ID
      }
    });
  });
};

async function insertMemberInProject(proID, member_id, is_admin, is_reviewer, is_submitter) {
  return new Promise((resolve, reject) => {
    const insertMemberInProjectQuery = "INSERT INTO project_member (proID, memberID, assign_date, is_admin, is_reviewer, is_submitter) VALUES (?, ?, DATE(NOW()), ?, ?, ?)"
    con.query(insertMemberInProjectQuery, [proID, member_id, is_admin, is_reviewer, is_submitter], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

async function getProjectsByOrgID(orgID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT proname, pro_desc, pro_creation_date, pm.memberID, member_account, orgname FROM project p JOIN project_member pm ON p.proID = pm.proID JOIN gitmember g ON pm.memberID = g.memberID JOIN organization o ON p.orgID = o.orgID WHERE p.orgID = ? AND is_active = TRUE";
    con.query(selectQuery, [orgID], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      };
    });
  });
}

///////////////////////////// PROYECTOS ///////////////////////////////

async function getProIDsByProName(proName) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT proID FROM project WHERE proname = ?";
    con.query(selectQuery, [proName], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Si no encuentra proID, devuelve null
        if (rows.length === 0) {
          resolve(null);
        } else {
          // Si encuentra un proID, lo devuelve
          resolve(rows[0]);
        }
      };
    });
  });
};

async function getMembersByProID(proID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT pm.memberID, assign_date, member_account, is_admin, is_reviewer, is_submitter FROM project_member pm JOIN gitmember g ON pm.memberID = g.memberID WHERE proID = ? AND is_active = TRUE";
    con.query(selectQuery, [proID], (err, rows) => {
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

async function insertTaskQuery(proID, taskName, taskDesc) {
  return new Promise((resolve, reject) => {
    const insertTaskQuery = "INSERT INTO task (proID, taskname, task_desc, task_creation_date) VALUES (?, ?, ?, DATE(NOW()))"
    con.query(insertTaskQuery, [proID, taskName, taskDesc], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.insertId); // Te devuelve el ID
      }
    });
  });
};

async function insertMemberInTask(taskID, member_id, is_creator, is_assigned) {
  return new Promise((resolve, reject) => {
    const insertMemberInProjectQuery = "INSERT INTO task_member (taskID, memberID, assign_date, is_creator, is_assigned) VALUES (?, ?, DATE(NOW()), ?, ?)"
    con.query(insertMemberInProjectQuery, [taskID, member_id, is_creator, is_assigned], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

async function getTasksByProID(proID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT t.taskID AS task_ID, taskname, task_desc, task_state, task_creation_date, creator.memberID AS creator_memberID, creatorAccount.member_account AS creator_member_account, assigned.memberID AS assigned_memberID, assignedAccount.member_account AS assigned_member_account FROM task t JOIN task_member creator ON t.taskID = creator.taskID AND creator.is_creator = 1 JOIN gitmember creatorAccount ON creator.memberID = creatorAccount.memberID JOIN task_member assigned ON t.taskID = assigned.taskID AND assigned.is_assigned = 1 JOIN gitmember assignedAccount ON assigned.memberID = assignedAccount.memberID WHERE t.proID = ?";
    con.query(selectQuery, [proID], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      };
    });
  });
}

module.exports = {
  getGitMemberAccountAndMemberTokenByUserID,
  getOrgIDsByOrgName,
  getMembersByOrgID,
  getIsOwnerByOrgNameAndMemberID,
  insertOrganizationQuery,
  insertMemberInOrganization,
  getMemberDataByMemberAccount,
  getOrganizationsByUserID,
  insertInvitationsByOrgName,
  getInvitationsByUserID,
  respondInvitation,
  insertProjectQuery,
  insertMemberInProject, 
  getProjectsByOrgID,
  getProIDsByProName,
  getMembersByProID,
  insertTaskQuery,
  insertMemberInTask,
  getTasksByProID
};