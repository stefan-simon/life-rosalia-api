require('dotenv').config();

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const jwt = require("jsonwebtoken");
const Jimp = require('jimp');

const nodemailer = require('nodemailer');

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

// setup the sendgrid mailer
const sgMail = require('@sendgrid/mail')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)


app.use(express.json());

const cors = require('cors');
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware function to extract user_code from JWT token
function decode_jwt(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  let user_code = "";
  let role = "";

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (!err) {
        user_code = decoded.user_code;
        role = decoded.role;
      }
    });
    req.user_code = decoded.user_code;
    req.role = decoded.role;
  }

  req.user_code = user_code;
  req.role = role;
  next();
}

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

function authorizeValidator(req, res, next) {
  if (req.role !== "validator" && req.role !== "admin") {
    return res.status(403).send({ error: "Access denied, you must be an admin to access this route" });
  }
  next();
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

// get verified sightings
app.get('/api/sightings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_sightings where verified = true ORDER BY sighting_date DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching species.' });
  }
});

// get all sightings
app.get('/api/all-sightings', authenticate, authorizeValidator, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM v_sightings ORDER BY sighting_date DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching species.' });
  }
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
app.patch('/api/sightings/:id', authenticate, authorizeValidator, async (req, res) => {
  const id = req.params.id;
  const verified = req.body.verified;

  try {
    // update the sighting in the database
    const result = await pool.query('UPDATE sightings SET verified=$1 WHERE id=$2 RETURNING *', [verified, id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Inregistrarea nu a fost gasita' });
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Inregistrarea a fost actualizata cu success' });
  }
});

// delete a sighting by ID
app.delete('/api/sightings/:id', authenticate, authorizeValidator, async (req, res) => {
  const id = req.params.id;

  try {
    // delete the sighting from the database
    const result = await pool.query('DELETE FROM sightings WHERE id=$1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Inregistrarea nu a fost gasita.' });
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Eroare in timpul stergerii inregistrarii' });
  }
});

// get the list of users
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT user_code, name FROM users where active = true');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Eroare la citirea utilizatorilor activi' });
  }
});

// get the list of users
app.get('/api/all-users', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, user_code, email, name, role, active, created_at FROM users');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Eroare la citirea utilizatorilor' });
  }
});

// activate/inactivate a user
app.post('/api/users/:userId/activate', authenticate, authorizeAdmin, async (req, res) => {
  const { userId } = req.params;
  const { active } = req.body;

  try {
    const result = await pool.query('UPDATE users SET active = $1 WHERE id = $2', [active, userId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Utilizatorul nu a fost gasit' });
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Eroare la activarea/dezactivarea utilizatorului' });
  }
});

// set role to a user
app.post('/api/users/:userId/role', authenticate, authorizeAdmin, async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  try {
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Utilizatorul nu a fost gasit' });
    } else {
      res.status(200).json(result.rows[0]);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Eroare la actualizarea rolului' });
  }
});


app.post('/api/register', async (req, res) => {
  const { email, name, password } = req.body;
  try {
    const user = await User.findUserByUsername(email);
    if (user) {
      res.status(409).send({ error: "Adresa de email este deja folosita." });
    } if (name.length < 3) {
      res.status(409).send({ error: "Numele nu poate avea mai putin de 3 litere." });
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
    if (!user || !user.active || !(await User.comparePassword(req.body.password, user.password))) {
      return res.status(401).send({ error: "Eroare la logare. Utilizator inexistent sau inactive sau parola gresita" });
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

// Endpoint to initiate the password reset process
app.post('/api/reset-password', async (req, res) => {
  const { email } = req.body;

  // Check if the email exists in the database
  const user = await User.findUserByUsername(email);
  if (!user) {
    // Return a success response
    return res.status(200).json({
      message: 'Instructiunile pentru resetarea parolei a fost trimis pe adresa de email!',
    });
  } else {
    console.log('User found');
  }

  // Generate a unique reset token and store it in the database
  const resetToken = uuidv4();
  // resetExpiration is one hour from now and is timestamp in milliseconds
  const resetExpirationMs = Date.now() + 60 * 60 * 1000;
  const resetExpiration = new Date(resetExpirationMs);
  console.log('resetExpiration', resetExpiration);
  await User.addResetToken(user.id, resetToken, resetExpiration);

  // Create a JSON Web Token containing the reset token and email
  const token = jwt.sign({ email, resetToken }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });


  // setup email data
  let mailOptions = {
    to: email,
    from: 'aplicatie@liferosalia.ro',
    subject: 'Resetare parola Aplicatie LifeRosalia',
    html: `Va rugam sa accesati <a href="https://aplicatie.liferosalia.ro/set-password?token=${token}">acest link</a> pentru resetarea parolei.`,
    text: `Va rugam sa accesati acest link pentru resetarea parolei: https://aplicatie.liferosalia.ro/set-password?token=${token}`,
  };

  // Send the email using sgMail. sgMail will replace the transporter
  sgMail
    .send(mailOptions)
    .then(() => {
      // Return a success response
      return res.status(200).json({
        message: 'Instructiunile pentru resetarea parolei a fost trimis pe adresa de email.',
      });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({ error: 'Eroare la trimiterea emailului' });
    });
});

app.post('/api/set-password', async (req, res) => {
  const { token, password } = req.body;

  // Verify the JWT token and extract the reset token and email
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid' });
  }
  const { email, resetToken } = decodedToken;

  // Check if the reset token exists in the users table and is not expired
  const user = await User.findUserByUsername(email);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (user.reset_token !== resetToken) {
    return res.status(400).json({ error: 'Reset token invalid' });
  }
  const resetExpiration = new Date(user.reset_expiration);
  if (resetExpiration.getTime() < Date.now()) {
    return res.status(400).json({ error: 'Reset token expired' });
  }

  // Update the user's password in the users table and delete the reset token
  // const hashedPassword = await bcrypt.hash(password, 10);
  // await User.updatePassword(user.id, hashedPassword);
  await User.updatePassword(user.id, password);
  await User.deleteResetToken(user.id);

  return res.status(200).json({ message: 'Password reset successful' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
