const fetch = require('node-fetch');
async function testPut() {
    const res = await fetch('http://localhost:5000/api/receipts/5', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            paymentMethod: 'transfer',
            customerBank: 'KBank',
            customerBranch: 'Siam',
            dueDate: '2026-08-30'
        })
    });
    const data = await res.json();
    console.log(data);
}
testPut();
