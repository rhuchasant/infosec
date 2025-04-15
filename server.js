const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files (JS, CSS, etc.) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the login.html file as the landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Example route for other pages (if you have them)
app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'search.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
