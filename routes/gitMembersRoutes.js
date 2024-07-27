const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("../config");
const con = require("../db");

const jwt = require('jsonwebtoken');

const { getMemberDataByMemberAccount, getSubmissionsByMember, getSuperReviewedOrganizationsByMemberID, getUserTagsByMemberID, getSuperReviewedReviews,
  getReviews, getCommentsByReviewID, getMemberRoles, updateMemberRoles, getPending } = require('../databaseQueries')

const jwt_secret_key = config.jwtConfig.jwtToken;

router.get("/:memberAccount/repositories", async (request, response) => {
  const memberAccount = request.params.memberAccount;
  let commitDescriptions = null;
  
  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(memberAccount);
        const memberToken = memberData.member_token;
        const getRepositories = await fetch(`https://api.github.com/users/${memberAccount}/repos` , {
          headers: {
            'Authorization': `token ${memberToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        const repos = await getRepositories.json();

        if (Array.isArray(repos) && repos.length > 0) {
          const getBranchesPromises = repos.map(async repo => {
            const branchesUrl = (repo.branches_url).replace('{/branch}', '');
            const branchesResponse = await fetch(branchesUrl, {
              headers: {
                'Authorization': `token ${memberToken}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            });
            const branches = await branchesResponse.json();
  
            const branchCommitsPromises = branches.map(async branch => {
              const commitsUrl = `https://api.github.com/repos/${memberAccount}/${repo.name}/commits?sha=${branch.name}&per_page=5`;
              const commitsResponse = await fetch(commitsUrl, {
                headers: {
                  'Authorization': `token ${memberToken}`,
                  'Accept': 'application/vnd.github.v3+json'
                }
              });
              const commits = await commitsResponse.json();
  
              const commitDetailsPromises = commits.map(async commit => {
                const commitUrl = `https://api.github.com/repos/${memberAccount}/${repo.name}/commits/${commit.sha}`;
                const commitDetailResponse = await fetch(commitUrl, {
                  headers: {
                    'Authorization': `token ${memberToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                  }
                });
                const commitDetail = await commitDetailResponse.json();
  
                const files = commitDetail.files.map(file => ({
                  status: file.status,
                  filename: file.filename,
                  patch: file.patch
                }));
  
                return {
                  sha: commit.sha,
                  message: commitDetail.commit.message,
                  author: commitDetail.commit.author.name,
                  date: commitDetail.commit.author.date,
                  files: files
                };
              });
  
              const detailedCommits = await Promise.all(commitDetailsPromises);
              return { branchName: branch.name, commits: detailedCommits };
            });
  
            const branchCommits = await Promise.all(branchCommitsPromises);
            return { repoName: repo.name, branches: branchCommits };
          });

          const branchesResponses = await Promise.all(getBranchesPromises);

          commitDescriptions = branchesResponses.map(commit => {
            return {
              repoName: commit.repoName,
              branches: commit.branches.map(branch => {
                return {
                  branchName: branch.branchName,
                  commits: branch.commits.map(commit => ({
                    sha: commit.sha,
                    message: commit.message,
                    author: commit.author,
                    date: commit.date,
                    files: commit.files
                  }))
                };
              })
            };
          })
        }

        response.status(200).json(commitDescriptions);
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al obtener los repositorios", error });
  }
});

router.get("/:memberAccount/submissions", async (request, response) => {
  const memberAccount = request.params.memberAccount;
  var submissionsWithComments = null;

  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(memberAccount);
        const memberID = memberData.memberID;
        const submissions = await getSubmissionsByMember(memberID);

        if (submissions) {
          submissionsWithComments = await Promise.all(
            submissions.map(async (submission) => {
              const comments = await getCommentsByReviewID(submission.reviewID);

              const pending = await getPending(memberID, submission.reviewID);
  
              const uniqueMemberAccounts = [...new Set(comments.map(comment => comment.member_account))];

              return {
                ...submission,
                userLogs: uniqueMemberAccounts,
                pending: pending.length>0 ? pending[0].pending : 0
              };
            })
          );
        } else {
          submissionsWithComments = submissions;
        }
        
        if (submissionsWithComments) {
          submissionsWithComments.sort((a, b) => b.pending - a.pending);
          response.status(200).json(submissionsWithComments);
        } else {
          response.status(404).json({ message: "No hay ninguna submission.", memberAccount });
        }
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Error al obtener las submissions." });
  }
});

router.get("/:memberAccount/reviews", async (request, response) => {
  const memberAccount = request.params.memberAccount;
  var reviewsWithComments = null;

  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        var reviews = null;
        const memberData = await getMemberDataByMemberAccount(memberAccount);
        const memberID = memberData.memberID;

        // Check organization superreviewer
        const superReviewedOrganizations = await getSuperReviewedOrganizationsByMemberID(memberID);
        if (superReviewedOrganizations) {
          const userTags = await getUserTagsByMemberID(memberID);

          const orgIDs = superReviewedOrganizations.map(org => org.orgID);
          const tags = userTags.map(tag => tag.tag);

          reviews = await getSuperReviewedReviews(tags, orgIDs, memberID);
        } else {
          reviews = await getReviews(memberID);
        }

        if (reviews) {
          reviewsWithComments = await Promise.all(
            reviews.map(async (review) => {
              const comments = await getCommentsByReviewID(review.reviewID);
  
              const pending = await getPending(memberID, review.reviewID);

              const uniqueMemberAccounts = [...new Set(comments.map(comment => comment.member_account))];

              return {
                ...review,
                userLogs: uniqueMemberAccounts,
                pending: pending.length>0 ? pending[0].pending : 0
              };
            })
          );
        } else {
          reviewsWithComments = reviews;
        }
        
        
        if (reviewsWithComments) {
          reviewsWithComments.sort((a, b) => b.pending - a.pending);
          response.status(200).json(reviewsWithComments);
        } else {
          response.status(404).json({ message: "No hay ninguna review.", memberAccount });
        }
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Error al obtener las reviews." });
  }
});

router.get("/:memberAccount/organizations/:orgName/roles", async (request, response) => {
  const memberAccount = request.params.memberAccount;
  const orgName = request.params.orgName;

  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(memberAccount);
        const memberID = memberData.memberID;

        const roles = await getMemberRoles(memberID, orgName, true); // IsOrg a true
        response.status(200).json(roles);
      }
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Error al obtener las entries del miembro." });
  }
});

router.get("/:memberAccount/projects/:proName/roles", async (request, response) => {
  const memberAccount = request.params.memberAccount;
  const proName = request.params.proName;

  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(memberAccount);
        const memberID = memberData.memberID;

        const roles = await getMemberRoles(memberID, proName, false); // IsOrg a false
        response.status(200).json(roles);
      }
    });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: "Error al obtener las entries del miembro." });
  }
});

router.put("/:memberAccount/projects/:proName/roles", async (request, response) => {
  const memberAccount = request.params.memberAccount;
  const proName = request.params.proName;
  const {isAdmin, isRevOrSuperRev} = request.body;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(memberAccount);
        const memberID = memberData.memberID;

        await updateMemberRoles(memberID, proName, false, isAdmin, isRevOrSuperRev);
        return response.status(200).json({ message: "Roles actualizados con éxito", memberAccount });
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al actualizar roles", error });
}
});

router.put("/:memberAccount/organizations/:orgName/roles", async (request, response) => {
  const memberAccount = request.params.memberAccount;
  const orgName = request.params.orgName;
  const {isAdmin, isRevOrSuperRev} = request.body;

  try {
    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(memberAccount);
        const memberID = memberData.memberID;

        await updateMemberRoles(memberID, orgName, true, isAdmin, isRevOrSuperRev);
        return response.status(200).json({ message: "Roles actualizados con éxito", memberAccount });
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al actualizar roles", error });
}
});

module.exports = router;