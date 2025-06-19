const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const { query } = require('./db')
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT;
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // maximum 20 attempts
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // maximum 10 attempts
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure CORS
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());                        //za parsiranje
app.use(express.urlencoded({ extended: true }));//isto za HTML format
app.use(cookieParser());

// dodaj ovo kad kreiras poziv da ne mozes korisiti API ako nisi ulogiran
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authorization required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token.' });
    }
    req.user = user;
    next();
  });
};

// Helper function to check if email exists
async function checkEmailExists(email) {
  try {
    const sql = 'SELECT email FROM users WHERE email = ?';
    const users = await query(sql, [email]);
    return users.length > 0;
  } catch (err) {
    console.error('Error checking email:', err);
    throw err;
  }
}

//ruta za registraciju
app.post('/api/register', registerLimiter, async (req, res) => {
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    
    const { email, password } = req.body
  
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        return res.status(409).json({ error: 'This email is already registered. Please use a different email or try logging in.' });
      }
  
      // Hashiranje lozinke
      const hashedPassword = await bcrypt.hash(password, 10) // 10 = salt rounds
  
      // Spremi usera u bazu
      const sql = `INSERT INTO users (email, password) VALUES (?, ?)`
      await query(sql, [email, hashedPassword])
  
      res.status(201).json({ message: 'User registered successfully.' })
    } catch (err) {
      console.error('Registration error details:', err);
      res.status(500).json({ error: 'Registration error.' })
    }
  })

// Login ruta, dodan login limiter
app.post('/api/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
  
    try {
      const sql = 'SELECT * FROM users WHERE email = ?';
      const users = await query(sql, [email]);
  
      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
  
      const user = users[0];
  
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
  
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, email: user.email },
        REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
      );
  
      // Pošalji refresh token kao HttpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
  
      res.json({
        message: 'Login successful.',
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login error.' });
    }
  });

app.post('/api/refresh', (req, res) => {
const token = req.cookies.refreshToken;
if (!token) {
    return res.status(401).json({ error: 'No refresh token.' });
}

try {
    const user = jwt.verify(token, REFRESH_TOKEN_SECRET);

    const newAccessToken = jwt.sign(
    { userId: user.userId, email: user.email },
    JWT_SECRET,
    { expiresIn: '15m' }
    );

    res.json({ accessToken: newAccessToken });
} catch (err) {
    res.status(403).json({ error: 'Invalid refresh token.' });
}
});
  




// Primjer zasticene rute
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const sql = 'SELECT id, name, email FROM users WHERE id = ?';
    const users = await query(sql, [req.user.userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(users[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Error fetching profile.' });
  }
});

app.get('/api/check-token', authenticateToken, (req, res) => {
    res.json({
      message: 'Token is valid.',
      user: req.user
    });
  });

// Logout ruta
app.post('/api/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  });
  
  res.json({ message: 'Logout successful.' });
});

// Fields endpoints
app.get('/api/fields', authenticateToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        id, 
        name, 
        location, 
        latitude, 
        longitude, 
        size, 
        surface_type, 
        created_at 
      FROM fields 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    const fields = await query(sql, [req.user.userId]);
    res.json(fields);
  } catch (err) {
    console.error('Error fetching fields:', err);
    res.status(500).json({ error: 'Error fetching fields.' });
  }
});

app.post('/api/fields', authenticateToken, async (req, res) => {
  const { name, location, latitude, longitude, size, surface_type } = req.body;
  
  console.log('Received field data:', req.body); // Debug log
  console.log('User ID:', req.user.userId); // Debug log

  if (!name || !location || !latitude || !longitude) {
    console.log('Missing required fields:', { name, location, latitude, longitude }); // Debug log
    return res.status(400).json({ error: 'Name, location, latitude, and longitude are required.' });
  }

  try {
    const sql = `
      INSERT INTO fields (
        user_id, 
        name, 
        location, 
        latitude, 
        longitude, 
        size, 
        surface_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    console.log('SQL Query:', sql); // Debug log
    console.log('Query params:', [req.user.userId, name, location, latitude, longitude, size || null, surface_type || null]); // Debug log
    
    const result = await query(sql, [
      req.user.userId,
      name,
      location,
      latitude,
      longitude,
      size || null,
      surface_type || null
    ]);

    console.log('Query result:', result); // Debug log

    res.status(201).json({
      id: result.insertId,
      name,
      location,
      latitude,
      longitude,
      size,
      surface_type
    });
  } catch (err) {
    console.error('Detailed error creating field:', err); // More detailed error logging
    res.status(500).json({ error: 'Error creating field.', details: err.message });
  }
});

app.delete('/api/fields/:id', authenticateToken, async (req, res) => {
  const fieldId = req.params.id;
  const userId = req.user.userId;

  try {
    // Ensure the field belongs to the user
    const checkSql = 'SELECT id FROM fields WHERE id = ? AND user_id = ?';
    const fields = await query(checkSql, [fieldId, userId]);
    if (fields.length === 0) {
      return res.status(404).json({ error: 'Field not found or not authorized.' });
    }

    const deleteSql = 'DELETE FROM fields WHERE id = ? AND user_id = ?';
    await query(deleteSql, [fieldId, userId]);
    res.json({ message: 'Field deleted successfully.' });
  } catch (err) {
    console.error('Error deleting field:', err);
    res.status(500).json({ error: 'Error deleting field.' });
  }
});

//listen() otvori HTTP server i čeka zahtjeve
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 