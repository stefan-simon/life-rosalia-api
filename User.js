const pool = require('./db');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function registerUser(email, name, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const userCode = uuidv4();
  const query = {
    text: 'INSERT INTO users (user_code, email, name, password) VALUES ($1, $2, $3, $4)',
    values: [userCode, email, name, hashedPassword],
  };
  return pool.query(query);
}

async function updatePassword(userId, newPassword) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const query = {
    text: 'UPDATE users SET password = $1 WHERE id = $2',
    values: [hashedPassword, userId],
  };
  return pool.query(query);
}

async function deleteResetToken(userId) {
  const query = {
    text: 'UPDATE users SET reset_token = null, reset_expiration = null WHERE id = $1',
    values: [userId],
  };
  return pool.query(query);
}

async function findUserByUsername(username) {
  const query = {
    text: 'SELECT * FROM users WHERE email = $1',
    values: [username],
  };
  const result = await pool.query(query);
  return result.rows[0];
}

async function comparePassword(plaintext, hashed) {
  return bcrypt.compare(plaintext, hashed);
}

async function addResetToken(userId, resetToken, resetExpiration) {
  const query = {
    text: 'UPDATE users SET reset_token = $1, reset_expiration = $2 WHERE id = $3',
    values: [resetToken, resetExpiration, userId],
  };
  return pool.query(query);
}


module.exports = {
  registerUser,
  findUserByUsername,
  comparePassword,
  updatePassword,
  addResetToken,
  deleteResetToken,
};
