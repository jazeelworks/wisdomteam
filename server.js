const http = require('http');
const url = require('url');
const sqlite3 = require('sqlite3').verbose();

// Connect to the SQLite database (creates a new file if it doesn't exist)
const db = new sqlite3.Database('colors.db');

// List of 15 colors
const colors = [
    '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF',
    '#33FFA1', '#FF8C33', '#33FFF6', '#F6FF33', '#8C33FF',
    '#FF338C', '#33A1FF', '#57FF33', '#FF5733', '#FF33F6'
];

// Create the table if it doesn't exist and insert initial data
db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS ColorIndex (id INTEGER PRIMARY KEY, currentIndex INTEGER)');
    db.run('INSERT OR IGNORE INTO ColorIndex (id, currentIndex) VALUES (1, 0)');
    db.run('CREATE TABLE IF NOT EXISTS ColorVisitors (color TEXT PRIMARY KEY, count INTEGER)');
    colors.forEach(color => {
        db.run('INSERT OR IGNORE INTO ColorVisitors (color, count) VALUES (?, 0)', [color]);
    });
});

// Create the server
const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname === '/random-color' && req.method === 'GET') {
        db.get('SELECT currentIndex FROM ColorIndex WHERE id = 1', (err, row) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Database error' }));
                return;
            }
            const colorIndex = row.currentIndex;
            const color = colors[colorIndex];
            const newIndex = (colorIndex + 1) % colors.length;

            db.run('UPDATE ColorIndex SET currentIndex = ? WHERE id = 1', [newIndex], (err) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Database error' }));
                    return;
                }
                db.run('UPDATE ColorVisitors SET count = count + 1 WHERE color = ?', [color], (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Database error' }));
                        return;
                    }
                    db.all('SELECT color, count FROM ColorVisitors', (err, rows) => {
                        if (err) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ message: 'Database error' }));
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ currentColor: color, visitorCounts: rows }));
                    });
                });
            });
        });
    } else if (parsedUrl.pathname === '/color-stats' && req.method === 'GET') {
        db.all('SELECT * FROM ColorVisitors', (err, rows) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Database error' }));
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ colors: rows }));
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Endpoint not found' }));
    }
});

// Define the port
const PORT = 3000;

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});