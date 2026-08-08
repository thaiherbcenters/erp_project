const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backend/database.sqlite');
db.all('SELECT * FROM RnD_Formulas WHERE formulaId IN ("FM-012", "FM-011")', [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
});
