require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || "<port>", //Puerto del servidor
  
  githubConfig: {
    clientID: process.env.GITHUB_CLIENT_ID || "<Github Client ID>",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "<Github Client Secret>",
  }
};