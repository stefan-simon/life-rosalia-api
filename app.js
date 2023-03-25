const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const pool = new Pool({
  connectionString: 'postgres://postgres:ils121wk@localhost:5432/insects'
});

const IMAGES_DIR = path.join(__dirname, 'images');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGES_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const newFilename = uuidv4() + ext;
    cb(null, newFilename);
  }
});
const upload = multer({ storage: storage });

app.use(express.json());

// get all species
app.get('/api/sightings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sightings');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching species.' });
  }
});

// insert a new sighting record and upload up to 3 files
app.post('/api/sightings', upload.array('pictures', 3), async (req, res) => {
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
    const picture1 = req.files && req.files.length > 0 ? req.files[0].filename : null;
    const picture2 = req.files && req.files.length > 1 ? req.files[1].filename : null;
    const picture3 = req.files && req.files.length > 2 ? req.files[2].filename : null;

    // insert the new record into the sightings table
    const result = await pool.query(insertQuery, [sightingCode, species, sighting_date, notes, picture1, picture2, picture3, longitude, latitude, created_by]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while creating sighting.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
