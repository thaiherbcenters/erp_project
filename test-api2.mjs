
async function test() {
    try {
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'test', password: 'password' })
        });
        
        const loginData = await loginRes.json();
        console.log('Login Status:', loginRes.status);
        console.log('User:', loginData.user);
        if (!loginData.user) return;
        
        const permRes = await fetch(`http://localhost:5000/api/permissions/${loginData.user.id}`, {
            headers: { 'Authorization': `Bearer ${loginData.token}` }
        });
        
        console.log('Permissions Status:', permRes.status);
        if (permRes.ok) {
            const data = await permRes.json();
            console.log('Permissions count:', data.permissions.length);
        } else {
            console.log('Permissions Error:', await permRes.text());
        }
    } catch (e) {
        console.error(e);
    }
}
test();
