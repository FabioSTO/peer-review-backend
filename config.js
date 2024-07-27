require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || "<port>", //Puerto del servidor
  dbConfig: {
    host: process.env.DB_HOST || "<host>",
    user: process.env.DB_USER || "<user>",
    password: process.env.DB_PASSWORD || "<contraseña>",
    database: process.env.DB_DATABASE || "<database>",
  },
  githubConfig: {
    clientID: process.env.GITHUB_CLIENT_ID || "<Github Client ID>",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "<Github Client Secret>",
  },
  jwtConfig: {
    jwtToken: process.env.JWT_SECRET_KEY || "<JWT Secret Key>",
  },
  huggingFaceConfig: {
    huggingFaceKey: process.env.HUGGING_FACE_SECRET_KEY || "<Hugging Face Secret Key>",
  }
};