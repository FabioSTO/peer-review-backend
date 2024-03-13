// Para hashear la contraseña

const bcrypt = require('bcrypt');
const saltRounds = 10; // Número de rondas de sal que se utilizarán

function hashPassword(password, callback) {
  bcrypt.genSalt(saltRounds, (err, salt) => {
    if (err) {
      console.error(err);
      callback(err, null);
    } else {
      bcrypt.hash(password, salt, (err, hashedPassword) => {
        if (err) {
          console.error(err);
          callback(err, null);
        } else {
          callback(null, hashedPassword);
        }
      });
    }
  });
}

function comparePasswords(inputPassword, hashedPassword, callback) {
  bcrypt.compare(inputPassword, hashedPassword, (err, passwordsMatch) => {
    if (err) {
      console.error(err);
      callback(err, null);
    } else {
      callback(null, passwordsMatch);
    }
  });
}

module.exports = {
  hashPassword,
  comparePasswords,
};