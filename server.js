const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const port = 3000;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
  
  // Create items table if it doesn't exist
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seller_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      starting_price DECIMAL(10, 2) NOT NULL,
      FOREIGN KEY (seller_id) REFERENCES users(id)
    )
  `;
  
  db.query(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating items table:', err);
    } else {
      console.log('Items table created or already exists');
    }
  });
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
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: 'auction-secret',
  resave: false,
  saveUninitialized: true
}));

// SSL Configuration
const sslOptions = {
    key: fs.readFileSync('./cert/server.key'),
    cert: fs.readFileSync('./cert/server.cert')
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/homepage', (req, res) => {
  if (!req.session.user) {
    res.redirect('/');
    return;
  }
  
  // Fetch items from database
  const query = `
    SELECT i.*, u.username as seller_name 
    FROM items i 
    JOIN users u ON i.seller_id = u.id 
    ORDER BY i.id DESC
  `;
  
  db.query(query, (err, items) => {
    if (err) {
      console.error('Database error:', err);
      items = []; // If error, show empty list
    }
    
    res.render('homepage', { 
      items: items,
      username: req.session.user.username 
    });
  });
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


// Add route to check authentication status
app.get('/check-auth', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

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

// Add Item routes
app.get('/add-item', (req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
    return;
  }
  res.sendFile(path.join(__dirname, 'views', 'add-item.html'));
});

app.post('/api/add-item', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Please login to add items'
    });
  }

  const { title, description, starting_price } = req.body;
  
  // Validate required fields
  if (!title || !starting_price) {
    return res.status(400).json({
      success: false,
      message: 'Title and starting price are required'
    });
  }

  const seller_id = req.session.user.id;

  const query = `
    INSERT INTO items (
      seller_id, title, description, starting_price
    ) VALUES (?, ?, ?, ?)
  `;
  
  db.query(query, [
    seller_id, 
    title, 
    description || null,
    starting_price
  ], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Error adding item to database'
      });
    }

    return res.json({
      success: true,
      message: 'Item added successfully'
    });
  });
});

// Add this new route to fetch items
app.get('/api/items', (req, res) => {
  const query = `
    SELECT i.*, u.username as seller_name 
    FROM items i 
    JOIN users u ON i.seller_id = u.id 
    ORDER BY i.id DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching items'
      });
    }

    return res.json({
      success: true,
      items: results
    });
  });
});

// Add Item routes
app.get('/add-item', (req, res) => {
  if (!req.session.user) {
    res.redirect('/login');
    return;
  }
  res.sendFile(path.join(__dirname, 'views', 'add-item.html'));
});

app.post('/api/add-item', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'Please login to add items'
    });
  }

  const { title, description, starting_price } = req.body;
  
  // Validate required fields
  if (!title || !starting_price) {
    return res.status(400).json({
      success: false,
      message: 'Title and starting price are required'
    });
  }

  const seller_id = req.session.user.id;

  const query = `
    INSERT INTO items (
      seller_id, title, description, starting_price
    ) VALUES (?, ?, ?, ?)
  `;
  
  db.query(query, [
    seller_id, 
    title, 
    description || null,
    starting_price
  ], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Error adding item to database'
      });
    }

    return res.json({
      success: true,
      message: 'Item added successfully'
    });
  });
});

// Add this new route to fetch items
app.get('/api/items', (req, res) => {
  const query = `
    SELECT i.*, u.username as seller_name 
    FROM items i 
    JOIN users u ON i.seller_id = u.id 
    ORDER BY i.id DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Error fetching items'
      });
    }

    return res.json({
      success: true,
      items: results
    });
  });
});

// Create HTTPS server
const httpsServer = https.createServer(sslOptions, app);

// Start the server
httpsServer.listen(3000, () => {
    console.log('🔒 Secure server running at https://localhost:3000');
});