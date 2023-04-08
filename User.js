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

module.exports = {
  registerUser,
  findUserByUsername,
  comparePassword,
};
