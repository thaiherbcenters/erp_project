const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/production/tasks/JO-20260819-001/route-wip',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
});

req.on('error', error => {
  console.error(error);
});

req.write(JSON.stringify({ action: 'wip_stock' }));
req.end();
