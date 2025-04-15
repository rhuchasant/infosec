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
  user: 'root',        // use your MySQL username
  password: 'Rhucha2301$',        // your password
  database: 'auctiondb'
});

db.connect(err => {
  if (err) throw err;
  console.log('Connected to MySQL');
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

//vulnerable query
app.post('/login', (req, res) => {
    const { username, password } = req.body;
  
    // ❌ Vulnerable version: using string concatenation
    const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
  
    db.query(query, (err, results) => {
      if (err) throw err;
  
      if (results.length > 0) {
        req.session.user = results[0];
        res.send(`<h2>✅ Welcome, ${username}! You are now logged in (via vulnerable login).</h2>`);
      } else {
        res.send('<h3>❌ Invalid username or password</h3>');
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

//Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
