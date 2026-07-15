async function test() {
    try {
        const res = await fetch('http://localhost:5173/api/corp-rep-documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                signatoryCount: 1,
                signatory1Prefix: 'นาย',
                signatory1Name: 'Test'
            })
        });
        const data = await res.text();
        console.log("STATUS:", res.status);
        console.log("RESPONSE:", data);
    } catch (err) {
        console.error("ERROR:", err.message);
    }
}
test();
