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

async function getMemberRoles(member_id, entityName, isOrg) {
  let getRolesQuery = "";
  return new Promise((resolve, reject) => {
    if (isOrg) {
      getRolesQuery = "SELECT is_owner, is_admin, is_super_reviewer from organization_member om LEFT JOIN organization o on o.orgID=om.orgID WHERE memberID = ? AND orgname = ?";
    } else {
      getRolesQuery = "SELECT is_admin, is_reviewer from project_member pm LEFT JOIN project p on p.proID=pm.proID WHERE memberID = ? AND proname = ?";
    }
    
    con.query(getRolesQuery, [member_id, entityName], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows[0]); 
      }
    });
  });
};

async function updateMemberRoles(member_id, entityName, isOrg, is_admin, is_rev_or_super_rev) {
  let updateRolesQuery = "";
  return new Promise((resolve, reject) => {
    if (isOrg) {
      updateRolesQuery = "UPDATE organization_member om SET om.is_admin = ?, om.is_super_reviewer = ? WHERE om.memberID = ? AND om.orgID = (SELECT o.orgID FROM organization o WHERE o.orgname = ?)";
    } else {
      updateRolesQuery = "UPDATE project_member pm SET pm.is_admin = ?, pm.is_reviewer = ? WHERE pm.memberID = ? AND pm.proID = (SELECT p.proID FROM project p WHERE p.proname = ?)";
    }
    
    con.query(updateRolesQuery, [is_admin, is_rev_or_super_rev, member_id, entityName], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.insertId); 
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

async function insertMemberInProject(proID, member_id, is_admin, is_reviewer) {
  return new Promise((resolve, reject) => {
    const insertMemberInProjectQuery = "INSERT INTO project_member (proID, memberID, assign_date, is_admin, is_reviewer) VALUES (?, ?, DATE(NOW()), ?, ?)"
    con.query(insertMemberInProjectQuery, [proID, member_id, is_admin, is_reviewer], (err) => {
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
    const selectQuery = "SELECT pm.memberID, assign_date, member_account, is_admin, is_reviewer FROM project_member pm JOIN gitmember g ON pm.memberID = g.memberID WHERE proID = ? AND is_active = TRUE";
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

///////////////////////////// TASKS ///////////////////////////////

async function getMembersByTaskID(taskID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT tm.memberID, assign_date, member_account, is_creator, is_assigned FROM task_member tm JOIN gitmember g ON tm.memberID = g.memberID WHERE taskID = ?";
    con.query(selectQuery, [taskID], (err, rows) => {
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

///////////////////////////// REVIEWS ///////////////////////////////

async function insertReview(taskID, title, desc, scope, image, reviewContent, contentType, memberID) {
  return new Promise((resolve, reject) => {
    const insertReviewQuery = "INSERT INTO review (taskID, reviewtitle, review_desc, review_scope, review_image, review_content, review_content_type, review_owner, review_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE(NOW()))"
    con.query(insertReviewQuery, [taskID, title, desc, scope, image, reviewContent, contentType, memberID], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.insertId); // Te devuelve el ID
      }
    });
  });
};

async function insertReviewTags(tags, reviewID) {
  return new Promise((resolve, reject) => {

    const tagInserts = tags.map(tag => {
      return [reviewID, tag];
    });

    const sqlUserTags = "INSERT INTO review_tags (reviewID, tag) VALUES ?";
    con.query(sqlUserTags, [tagInserts], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

async function getSubmissionsByMember(memberID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT reviewID, member_account, taskname, proname, orgname, r.taskID, p.proID, o.orgID, reviewtitle, review_desc, review_scope, review_content, review_content_type, review_image, review_date, is_closed, review_owner from review r JOIN task t on r.taskID=t.taskID JOIN project p on t.proID=p.proID JOIN organization o on p.orgID=o.orgID JOIN gitmember g on r.review_owner = g.memberID where review_owner = ?;";
    
    con.query(selectQuery, [memberID], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        if (rows.length === 0) {
          resolve(null);
        } else {
          const reviewPromises = rows.map(review => {
            return new Promise((resolve, reject) => {
              const tagsQuery = "SELECT tagID, tag from review_tags where reviewID = ?";
              con.query(tagsQuery, [review.reviewID], (err, tagRows) => {
                if (err) {
                  reject(err);
                } else {
                  if (tagRows.length === 0) {
                    resolve(review);
                  } else {
                    review.tags = tagRows.map(row => ({
                      tagID: row.tagID,
                      tag: row.tag
                    }));
                    resolve(review);
                  }
                };
              });
            });
          });
          Promise.all(reviewPromises)
            .then(reviewsWithTags => {
              resolve(reviewsWithTags);
            })
            .catch(error => {
              reject(error);
            });
        }
      };
    });
  });
}

async function getSuperReviewedOrganizationsByMemberID(memberID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT is_super_reviewer, is_active, orgID FROM organization_member WHERE memberID = ? AND is_super_reviewer != 0"
    con.query(selectQuery, [memberID], (err, rows) => {
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

async function getUserTagsByMemberID(memberID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT tag, g.userID FROM user u JOIN gitmember g on u.userID=g.userID JOIN user_tags ut on g.userID = ut.userID where memberID = ?"
    con.query(selectQuery, [memberID], (err, rows) => {
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

async function getSuperReviewedReviews(tags, orgIDs, memberID) {
  return new Promise((resolve, reject) => {

    const orgIDPlaceholders = orgIDs.map(() => '?').join(',');
    const tagsPlaceholders = tags.map(() => '?').join(',');


    const selectQuery = `
      SELECT 
        DISTINCT reviewID, taskname, proname, orgname, r.taskID, p.proID, o.orgID, 
        reviewtitle, review_desc, review_scope, review_content, 
        review_content_type, review_image, review_date, is_closed, review_owner, member_account
      FROM review r 
      JOIN task t ON r.taskID = t.taskID 
      JOIN project p ON t.proID = p.proID 
      JOIN organization o ON p.orgID = o.orgID 
      JOIN organization_member om ON o.orgID = om.orgID
      JOIN project_member pm ON p.proID = pm.proID 
      JOIN gitmember g ON r.review_owner = g.memberID
      WHERE om.is_active = 1 AND pm.is_active = 1
      AND review_owner != ?
      AND r.is_closed != 1
      AND (
      (review_scope = 'Task' AND (
        t.taskID IN (
          SELECT taskID FROM task_member WHERE memberID = ? AND ((is_creator = 1 AND is_assigned = 0) OR (is_creator = 0 AND is_assigned = 0))
        )
      ))
      OR (review_scope = 'Project'
        AND p.proID IN (
        SELECT proID FROM project_member WHERE memberID = ? AND (is_reviewer = 1 OR is_admin = 1 OR (
          t.taskID IN (
            SELECT taskID FROM task_member WHERE memberID = ? AND ((is_creator = 1 AND is_assigned = 0) OR (is_creator = 0 AND is_assigned = 0))
          )
        )))
        ) 
      OR (o.orgID IN (${orgIDPlaceholders}) 
        AND r.reviewID IN (
        SELECT reviewID FROM review_tags WHERE tag IN (${tagsPlaceholders})
      ))
      );
    `;

    con.query(selectQuery, [memberID, memberID, memberID, memberID, ...orgIDs, ...tags], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        if (rows.length === 0) {
          resolve(null);
        } else {
          const reviewPromises = rows.map(review => {
            return new Promise((resolve, reject) => {
              const tagsQuery = "SELECT tagID, tag from review_tags where reviewID = ?";
              con.query(tagsQuery, [review.reviewID], (err, tagRows) => {
                if (err) {
                  reject(err);
                } else {
                  if (tagRows.length === 0) {
                    resolve(review);
                  } else {
                    review.tags = tagRows.map(row => ({
                      tagID: row.tagID,
                      tag: row.tag
                    }));
                    resolve(review);
                  }
                };
              });
            });
          });
          Promise.all(reviewPromises)
            .then(reviewsWithTags => {
              resolve(reviewsWithTags);
            })
            .catch(error => {
              reject(error);
            });
        }
      };
    });
  });
}

async function getReviews(memberID) {
  return new Promise((resolve, reject) => {

    const selectQuery = `
      SELECT 
        DISTINCT reviewID, taskname, proname, orgname, r.taskID, p.proID, o.orgID, 
        reviewtitle, review_desc, review_scope, review_content, 
        review_content_type, review_image, review_date, is_closed, review_owner, member_account
      FROM review r 
      JOIN task t ON r.taskID = t.taskID 
      JOIN project p ON t.proID = p.proID 
      JOIN organization o ON p.orgID = o.orgID 
      JOIN organization_member om ON o.orgID = om.orgID
      JOIN project_member pm ON p.proID = pm.proID 
      JOIN gitmember g ON r.review_owner = g.memberID
      WHERE om.is_active = 1 AND pm.is_active = 1
      AND review_owner != ?
      AND r.is_closed != 1
      AND ((review_scope = 'Task'
      AND (
        t.taskID IN (
          SELECT taskID FROM task_member WHERE memberID = ? AND ((is_creator = 1 AND is_assigned = 0) OR (is_creator = 0 AND is_assigned = 0))
        )
      ))
      OR (review_scope = 'Project'
        AND p.proID IN (
        SELECT proID FROM project_member WHERE memberID = ? AND (is_reviewer = 1 OR is_admin = 1 OR (
          t.taskID IN (
            SELECT taskID FROM task_member WHERE memberID = ? AND ((is_creator = 1 AND is_assigned = 0) OR (is_creator = 0 AND is_assigned = 0))
          )
        )))
        ) 
      );
    `;

    con.query(selectQuery, [memberID, memberID, memberID, memberID], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        if (rows.length === 0) {
          resolve(null);
        } else {
          const reviewPromises = rows.map(review => {
            return new Promise((resolve, reject) => {
              const tagsQuery = "SELECT tagID, tag from review_tags where reviewID = ?";
              con.query(tagsQuery, [review.reviewID], (err, tagRows) => {
                if (err) {
                  reject(err);
                } else {
                  if (tagRows.length === 0) {
                    resolve(review);
                  } else {
                    review.tags = tagRows.map(row => ({
                      tagID: row.tagID,
                      tag: row.tag
                    }));
                    resolve(review);
                  }
                };
              });
            });
          });
          Promise.all(reviewPromises)
            .then(reviewsWithTags => {
              resolve(reviewsWithTags);
            })
            .catch(error => {
              reject(error);
            });
        }
      };
    });
  });
}

///////////////////////////// COMMENTS ///////////////////////////////

async function insertComment(memberID, reviewID, comment) {
  return new Promise((resolve, reject) => {
    const insertCommentQuery = "INSERT INTO comment (comment_owner, comment_content, reviewID, comment_date) VALUES (?, ?, ?, NOW())"
    con.query(insertCommentQuery, [memberID, comment, reviewID], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.insertId); 
      }
    });
  });
};

async function getCommentsByReviewID(reviewID) {
  return new Promise((resolve, reject) => {
    const selectQuery = "SELECT comment_owner, member_account, comment_content, comment_date FROM comment c JOIN review r on c.reviewID = r.reviewID JOIN gitmember g on c.comment_owner = g.memberID WHERE c.reviewID = ? ORDER BY comment_date ASC;";
    con.query(selectQuery, [reviewID], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows.reverse());
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
  getTasksByProID,
  getMembersByTaskID,
  insertReview,
  insertReviewTags,
  getSubmissionsByMember,
  getSuperReviewedOrganizationsByMemberID,
  getUserTagsByMemberID,
  getSuperReviewedReviews,
  getReviews,
  insertComment,
  getCommentsByReviewID,
  getMemberRoles,
  updateMemberRoles
};

