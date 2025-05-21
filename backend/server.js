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
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 5, // maksimalno 5 pokušaja
  message: { error: 'Previše pokušaja prijave. Molimo pokušajte kasnije' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());                        //za parsiranje
app.use(express.urlencoded({ extended: true }));//isto za HTML format
app.use(cookieParser());

// dodaj ovo kad kreiras poziv da ne mozes korisiti API ako nisi ulogiran
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Potrebna je autorizacija.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Nevažeći token.' });
    }
    req.user = user;
    next();
  });
};

//ruta za registraciju
app.post('/api/register', async (req, res) => {
    console.log('Request body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    
    const { name, email, password } = req.body
  
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Sva polja su obavezna.' })
    }
  
    try {
      // Hashiranje lozinke
      const hashedPassword = await bcrypt.hash(password, 10) // 10 = salt rounds
  
      // Spremi usera u bazu
      const sql = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`
      await query(sql, [name, email, hashedPassword])
  
      res.status(201).json({ message: 'Korisnik registriran.' })
    } catch (err) {
      console.error('Registration error details:', err);
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({ error: 'Email već postoji.' })
      } else {
        res.status(500).json({ error: 'Greška prilikom registracije.' })
      }
    }
  })

// Login ruta, dodan login limiter
app.post('/api/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ error: 'Email i lozinka su obavezni.' });
    }
  
    try {
      const sql = 'SELECT * FROM users WHERE email = ?';
      const users = await query(sql, [email]);
  
      if (users.length === 0) {
        return res.status(401).json({ error: 'Pogrešan email ili lozinka.' });
      }
  
      const user = users[0];
  
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Pogrešan email ili lozinka.' });
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
        message: 'Uspješna prijava.',
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Greška prilikom prijave.' });
    }
  });

app.post('/api/refresh', (req, res) => {
const token = req.cookies.refreshToken;
if (!token) {
    return res.status(401).json({ error: 'Nema refresh tokena.' });
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
    res.status(403).json({ error: 'Nevažeći refresh token.' });
}
});
  




// Primjer zasticene rute
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const sql = 'SELECT id, name, email FROM users WHERE id = ?';
    const users = await query(sql, [req.user.userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    res.json(users[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Greška prilikom dohvaćanja profila.' });
  }
});

app.get('/api/check-token', authenticateToken, (req, res) => {
    res.json({
      message: 'Token je važeći.',
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
  
  res.json({ message: 'Uspješna odjava.' });
});

//listen() otvori HTTP server i čeka zahtjeve
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 