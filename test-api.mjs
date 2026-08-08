

async function test() {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', password: 'password123' }) // assuming password123
    });
    
    if (!loginRes.ok) {
        console.error('Login failed', await loginRes.text());
        return;
    }
    
    const loginData = await loginRes.json();
    console.log('User ID:', loginData.user.id);
    
    const permRes = await fetch(`http://localhost:5000/api/permissions/${loginData.user.id}`, {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    
    if (!permRes.ok) {
        console.error('Fetch permissions failed', permRes.status, await permRes.text());
        return;
    }
    
    const perms = await permRes.json();
    console.log('Permissions count:', perms.permissions.length);
    console.log(perms.permissions.slice(0, 5));
}

test();
