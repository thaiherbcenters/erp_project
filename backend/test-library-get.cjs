const http = require('http');

async function testLib() {
    console.log('Testing GET /api/library...');
    http.get('http://localhost:5000/api/library', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('GET /api/library Status:', res.statusCode);
            const parsed = JSON.parse(data);
            console.log('Docs count:', parsed.length);
            process.exit(0);
        });
    }).on('error', (e) => {
        console.error('GET error:', e.message);
        process.exit(1);
    });
}
testLib();
