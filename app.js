require('dotenv').config();

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const jwt = require("jsonwebtoken");
const Jimp = require('jimp');

const User = require("./User");
const path = require('path');
const pool = require('./db');

const app = express();

const IMAGES_DIR = path.join(__dirname, 'users_pictures');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGES_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const newFilename = uuidv4() + '_o' + ext;
    cb(null, newFilename);
  }
});
const upload = multer({ storage: storage });

const mime = require('mime');

app.use(express.json());

const cors = require('cors');
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware function to verify JWT token
function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).send({ error: "Missing or invalid token" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: "Token is expired or invalid" });
    }
    req.user_code = decoded.user_code; // use decoded.user_code instead of decoded.id
    req.role = decoded.role;
    next();
  });
}

function authorizeAdmin(req, res, next) {
  if (req.role !== "admin") {
    return res.status(403).send({ error: "Access denied, you must be an admin to access this route" });
  }
  next();
}

// homepage
app.get('/', (req, res) => {
  res.send('Welcome to the Bird Sightings API');
});

// get all species
app.get('/api/sightings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_sightings');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching species.' });
  }
});

// get image by name
app.get('/api/image/:imageName', (req, res) => {
  const imageName = req.params.imageName;
  const imagePath = path.join(IMAGES_DIR, imageName);
  fs.readFile(imagePath, (err, data) => {
    if (err) {
      console.error(err);
      res.status(404).json({ error: 'Image not found.' });
    } else {
      const ext = path.extname(imageName);
      const mimeType = mime.getType(ext);
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(data);
    }
  });
});

// insert a new sighting record and upload up to 3 files
app.post('/api/sightings', authenticate, upload.array('pictures', 3), async (req, res) => {
  const { species, sighting_date, notes, longitude, latitude, created_by } = req.body;
  try {
    // construct the SQL query to insert a new record in the sightings table
    const insertQuery = `
      INSERT INTO sightings (
        sighting_code, species, sighting_date, notes, picture1, picture2, picture3, longitude, latitude, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *
    `;

    // generate a unique sighting code for the new record
    const sightingCode = Math.floor(100000 + Math.random() * 900000);

    // get the filenames of the uploaded files (if any)
    let picture1 = req.files && req.files.length > 0 ? req.files[0].filename : null;
    let picture2 = req.files && req.files.length > 1 ? req.files[1].filename : null;
    let picture3 = req.files && req.files.length > 2 ? req.files[2].filename : null;

    // resize the images using Jimp
    if (picture1) {
      const originalPic = picture1;
      picture1 = picture1.replace('_o', '');
      const image = await Jimp.read(path.join(IMAGES_DIR, originalPic));
      image.resize(800, Jimp.AUTO).write(path.join(IMAGES_DIR, picture1));
    }
    if (picture2) {
      const originalPic = picture2;
      picture2 = picture2.replace('_o', '');
      const image = await Jimp.read(path.join(IMAGES_DIR, originalPic));
      image.resize(800, Jimp.AUTO).write(path.join(IMAGES_DIR, picture2));
    }
    if (picture3) {
      const originalPic = picture3;
      picture3 = picture3.replace('_o', '');
      const image = await Jimp.read(path.join(IMAGES_DIR, originalPic));
      image.resize(800, Jimp.AUTO).write(path.join(IMAGES_DIR, picture3));
    }

    // insert the new record into the sightings table
    const result = await pool.query(insertQuery, [sightingCode, species, sighting_date, notes, picture1, picture2, picture3, longitude, latitude, created_by]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while creating sighting.' });
  }
});

// set verified status of a sighting
app.patch('/api/sightings/:id/verified', authenticate, authorizeAdmin, async (req, res) => {
  const id = req.params.id;
  const verified = req.body.verified;

  try {
    // update the sighting in the database
    const result = await pool.query('UPDATE sightings SET verified=$1 WHERE id=$2 RETURNING *', [verified, id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Sighting not found.' });
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while updating sighting.' });
  }
});

// get the list of users
app.get('/api/users', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching users.' });
  }
});

app.post('/api/register', async (req, res) => {
  const { email, name, password } = req.body;
  try {
    const user = await User.findUserByUsername(email);
    if (user) {
      res.status(409).send({ error: "Adresa de email este deja folosita." });
    } else {
      await User.registerUser(email, name, password);
      res.status(201).send({ message: "inregistrare cu success" });
    }
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});


app.post('/api/login', async (req, res) => {
  try {
    const user = await User.findUserByUsername(req.body.username);
    if (!user || !(await User.comparePassword(req.body.password, user.password))) {
      return res.status(401).send({ error: "Invalid username or password" });
    }
    const token = jwt.sign({ id: user.user_code, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1w" });
    res.send({ token });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.post('/api/renew-token', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findUserById(decoded.id);
    const newToken = jwt.sign({ id: user.id, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1w" });
    res.send({ token: newToken });
  } catch (err) {
    res.status(401).send({ error: "Invalid or expired token" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
