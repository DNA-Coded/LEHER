const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DEFAULT_PORT = parseInt(process.env.PORT || '8080', 10);
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

function createServer() {
    return http.createServer((req, res) => {
        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const parsedUrl = url.parse(req.url);
        let pathname = decodeURIComponent(parsedUrl.pathname);

        // Strip leading /earth if present
        if (pathname.startsWith('/earth/')) {
            pathname = pathname.substring('/earth'.length);
        } else if (pathname === '/earth') {
            pathname = '/';
        }

        if (pathname === '/' || pathname === '') {
            pathname = '/index.html';
        }

        const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        let filePath = path.join(PUBLIC_DIR, safePath);

        fs.stat(filePath, (err, stats) => {
            if (err) {
                // If requested a directory, try index.html
                if (err.code === 'ENOENT') {
                    const fallbackPath = path.join(PUBLIC_DIR, safePath, 'index.html');
                    if (fs.existsSync(fallbackPath)) {
                        filePath = fallbackPath;
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end(`404 Not Found: ${pathname}`);
                        return;
                    }
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end(`Server Error: ${err.code}`);
                    return;
                }
            } else if (stats.isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            fs.readFile(filePath, (readErr, content) => {
                if (readErr) {
                    res.writeHead(readErr.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end(`Error reading file: ${readErr.code}`);
                    return;
                }
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Cache-Control': 'no-cache'
                });
                res.end(content);
            });
        });
    });
}

function startServer(port) {
    const server = createServer();

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is already in use. Retrying on port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`====================================================`);
        console.log(`  Leher Earth Application is running locally!`);
        console.log(`  - Local URL:   http://localhost:${port}/`);
        console.log(`  - Earth Base:  http://localhost:${port}/earth/`);
        console.log(`====================================================`);
    });
}

startServer(DEFAULT_PORT);
