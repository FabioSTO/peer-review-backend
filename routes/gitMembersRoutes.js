const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();
const config = require("../config");
const con = require("../db");

const jwt = require('jsonwebtoken');

const { getMemberDataByMemberAccount, getSubmissionsByMember, getSuperReviewedOrganizationsByMemberID, getUserTagsByMemberID, getSuperReviewedReviews,
  getReviews } = require('../databaseQueries')

const jwt_secret_key = config.jwtConfig.jwtToken;

router.get("/:memberAccount/repositories", async (request, response) => {
  const memberAccount = request.params.memberAccount;
  
  try {

    const token = request.headers.authorization.split(' ')[1];

    jwt.verify(token, jwt_secret_key, async (err, decodedToken) => {
      if (err) {
        return response.status(401).json({ message: 'Token inválido' });
      } else {
        const memberData = await getMemberDataByMemberAccount(memberAccount);
        console.log(memberData);
        const memberToken = memberData.member_token;
        const getRepositories = await fetch(`https://api.github.com/users/${memberAccount}/repos` , {
          headers: {
            'Authorization': `token ${memberToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        const repos = await getRepositories.json();

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

        const commitDescriptions = branchesResponses.map(commit => {
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

        response.status(200).json(commitDescriptions);
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Hubo un error al obtener los repositorios", error });
  }
});

router.get("/:memberAccount/submissions", async (request, response) => {
  const memberAccount = request.params.memberAccount;

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
          response.status(200).json(submissions);
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
          console.log(reviews);
          response.status(200).json(reviews);
        } else {
          response.status(404).json({ message: "No hay ninguna review.", memberAccount });
        }
      }
    });
  } catch (error) {
    response.status(500).json({ message: "Error al obtener las reviews." });
  }
});


module.exports = router;