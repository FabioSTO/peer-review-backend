const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("./config");
const { hashPassword, comparePasswords } = require("./bcryptUtils");
const con = require("./db");

const { getGitMemberAccountAndMemberTokenByUserID, getOrgIDsByOrgName, getMemberIDsByOrgID,
   getMemberOwnerIDByOrgIDAndMemberID, insertOrganizationQuery, insertMemberInOrganization,
   getMemberDataByMemberAccount } = require('./databaseQueries')

const accessTokenUrl = "https://github.com/login/oauth/access_token";
const client_id = config.githubConfig.clientID;
const client_secret = config.githubConfig.clientSecret;

router.post("/registerAccount", (request, response) => {
  const {name, email, password, tags} = request.body;

  hashPassword(password, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      response.status(500).json({ message: "Error al registrar el usuario" });
      return; 
    }

    const postUser = { username: name, email, password: hashedPassword };

    const userSql = "INSERT INTO user SET ?";
    con.query(userSql, postUser, (err, result) => {
      if (err) {
        console.error(err);
        response.status(500).json({ message: err.code });
      } 
      
      const userID = result.insertId;

      console.log(userID);

      if (!userID) {
        console.error("Fallo al obtener el userID");
        response.status(500).json({ message: "Hubo un fallo al registrar el usuario" });
        return;
      }

      if (tags && tags.length > 0) {
        const tagInserts = tags.map(tag => {
          return [userID, tag];
        });

        const sqlUserTags = "INSERT INTO user_tags (userID, tag) VALUES ?";
        con.query(sqlUserTags, [tagInserts], (err, result) => {
          if (err) {
            console.error(err);
            response.status(500).json({ message: err.code });
          } else {
            response.status(201).json({ message: "Usuario registrado correctamente", userID });
          }
        });
      } else {
        response.status(201).json({ message: "Usuario registrado correctamente sin tags" });
      }
      
    });
  });
});


router.post("/loginAccount", async (request, response) => {
  const { email, password } = request.body;

  const findUserQuery = "SELECT userID, username, email, password FROM user WHERE email = ?";
  con.query(findUserQuery, email, (err, results) => {
    if (err) {
      console.error(err);
      response.status(500).json({ message: "Error en la base de datos" });
    } else if (results.length === 0) {
      response.status(404).json({ message: "Usuario no encontrado" });
    } else {
      const storedPassword = results[0].password;
    
      // Compara la contraseña ingresada con el hash almacenado
      comparePasswords(password, storedPassword, (compareErr, passwordsMatch) => {
        if (compareErr) {
          console.error(compareErr);
          response.status(500).json({ message: "Error al comparar contraseñas" });
        } else if (passwordsMatch) {
          const { userID, username, email } = results[0];

          const getUserTagsQuery = "SELECT tag from user_tags WHERE userID = ?"

          con.query(getUserTagsQuery, userID, (err, tagResults) => {
            if (err) {
              console.error(err);
              response.status(500).json({ message: "Error en la base de datos" });
            } else {
              const userTags = tagResults.map(tagResult => tagResult.tag);;
              response.status(200).json({ message: "Usuario logueado correctamente", userID, username, email, userTags});
            }
          });
        } else {
          response.status(401).json({ message: "Contraseña incorrecta" });
        }
      });    
    }
  });
})

router.post("/githubAddAccount", async (request, response) => {
  const {code, userID} = request.body;
  
  try {
    const params = {
      client_id: client_id,
      client_secret: client_secret,
      code: code
    };

    const res = await fetch(accessTokenUrl, {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    const data = await res.json();

    const access_token = data.access_token;

    // Obtener el nombre de usuario de GitHub
    const githubUserRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${access_token}`
      }
    });

    const userData = await githubUserRes.json();
    const member_account = userData.login;

    const insertGitMemberQuery = "INSERT INTO gitmember (userID, member_account, member_token) VALUES (?, ?, ?)";    
    con.query(insertGitMemberQuery, [userID, member_account, access_token], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          // Cuenta duplicada, informar al usuario
          response.status(409).json({ message: "La cuenta de miembro ya existe.", member_account });
        } else {
          console.error(err);
          response.status(500).json({ message: err.code });
        }
      } else {
        response.status(200).json({ message: "Git Member guardado correctamente", member_account });
      }
    });
  } catch (error) {
    response.status(500).send("Error al intercambiar código por token de acceso.");
  }
});

router.get("/gitMemberData/:userID", async (request, response) => {
  const userID = request.params.userID;

  try {
    const gitMemberEntries = await getGitMemberAccountAndMemberTokenByUserID(userID);
    response.status(200).json(gitMemberEntries);
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Error al obtener las entries del miembro." });
  }
});

router.post("/addOrganization", async (request, response) => {
  const {orgName, orgDesc, memberAccount} = request.body;
  const memberID = 1;

  /*try {
    const memberData = await getMemberDataByMemberAccount(memberAccount);
    console.log("Se encontró el miembro con el ID:", memberID);
    if (memberData) {
      memberID = memberData.memberID;
      console.log("Se encontró el miembro con el ID:", memberID);
      
      // Aquí puedes usar memberID como necesites en tu lógica de aplicación
    } else {
      console.log("No se encontró ningún miembro con la cuenta:", memberAccount);
    }
  } catch (error) {
    response.status(500).json({ message: "Error al obtener el memberID", error });
  } */
  

  try {
    const orgIDs = await getOrgIDsByOrgName(orgName);
    if (orgIDs !== null) {
        for (const orgID of orgIDs) {
            const member_ids = await getMemberIDsByOrgID(orgID);
            console.log(member_ids)
            if (member_ids !== null) {
                for (const member_id of member_ids) {
                    if (member_id === memberID) {
                        const is_owner = await getMemberOwnerIDByOrgIDAndMemberID(orgID, member_id);
                        if (is_owner) {
                            return response.status(409).json({ message: "Ya eres owner de una organización con ese nombre", orgName });
                        } else {
                            const insertedOrgID = await insertOrganizationQuery(orgName, orgDesc);
                            await insertMemberInOrganization(insertedOrgID, memberID);
                            return response.status(200).json({ message: "Organización insertada con éxito", orgName });
                        }
                    }
                }
            }
        }
    }

    // If orgIDs is null or no matching memberID is found in any organization
    const insertedOrgID = await insertOrganizationQuery(orgName, orgDesc);
    await insertMemberInOrganization(insertedOrgID, memberID);
    response.status(200).json({ message: "Organización insertada con éxito", orgName });
} catch (error) {
    response.status(500).json({ message: "Hubo un error en el servidor", error });
}
});

module.exports = router;