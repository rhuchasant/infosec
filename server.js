const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',        // replace with your MySQL username
  password: 'root123', // replace with your MySQL password
  database: 'auctiondb'  // replace with your database name
});

// Handle connection errors
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Handle errors after initial connection
db.on('error', (err) => {
  console.error('MySQL error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection was closed.');
  }
  if (err.code === 'ER_CON_COUNT_ERROR') {
    console.log('Database has too many connections.');
  }
  if (err.code === 'ECONNREFUSED') {
    console.log('Database connection was refused.');
  }
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'auction-secret',
  resave: false,
  saveUninitialized: true
}));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/homepage', (req, res) => {
  if (!req.session.user) {
    res.redirect('/');
    return;
  }
  res.sendFile(path.join(__dirname, 'views', 'homepage.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/search', (req, res) => {
  const query = req.query.q || '';
  res.sendFile(path.join(__dirname, 'views', 'search.html'));
});

app.get('/profile', (req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
    return;
  }
  res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

app.get('/checkout', (req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
    return;
  }
  res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Check for common SQL injection patterns
    // const hasSQLInjection = username.includes("'") || 
    //                        username.includes('"') || 
    //                        username.includes('=') ||
    //                        username.includes('--') ||
    //                        username.includes(';') ||
    //                        password.includes("'") ||
    //                        password.includes('"') ||
    //                        password.includes('=') ||
    //                        password.includes('--') ||
    //                        password.includes(';');
    
    // ❌ Vulnerable version: using string concatenation
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred'
        });
      }
      
      if (results.length > 0) {
        // Successful login
        req.session.user = results[0];
        return res.json({
          success: true,
        //   isVulnerable: hasSQLInjection, // Only true if SQL injection was detected
          username: username,
          redirectUrl: '/homepage'
        });
      } else {
        // Failed login
        return res.status(401).json({
          success: false,
          message: '❌ Invalid username or password'
        });
      }
    });
});
  
//non-vulnerable query
// app.post('/login', (req, res) => {
//   const { username, password } = req.body;

//   const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
//   db.query(query, [username, password], (err, results) => {
//     if (err) throw err;

//     if (results.length > 0) {
//       req.session.user = results[0];
//       res.send(`<h2>✅ Welcome, ${username}! You are now logged in.</h2>`);
//     } else {
//       res.send('<h3>❌ Invalid username or password</h3>');
//     }
//   });
// });

// Search endpoint
app.get('/api/search', (req, res) => {
    const searchQuery = req.query.q || '';
    
    // ❌ Vulnerable version: using string concatenation
    const query = `SELECT * FROM Items WHERE prodinfo LIKE '%${searchQuery}%' OR username LIKE '%${searchQuery}%'`;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error occurred'
            });
        }
        
        return res.json({
            success: true,
            results: results
        });
    });
});

//Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});