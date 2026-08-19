const { poolPromise, sql } = require('./config/db'); 
async function migrate() { 
    try { 
        const pool = await poolPromise; 
        
        // Add to Planner
        try {
            await pool.request().query("ALTER TABLE Planner ADD ProductName NVARCHAR(255) NULL");
            console.log("Added ProductName to Planner");
            // Set existing
            await pool.request().query("UPDATE Planner SET ProductName = FormulaName");
        } catch(e) { console.log(e.message); }

        // Add to Production_Tasks
        try {
            await pool.request().query("ALTER TABLE Production_Tasks ADD ProductName NVARCHAR(255) NULL");
            console.log("Added ProductName to Production_Tasks");
            // Set existing
            await pool.request().query("UPDATE Production_Tasks SET ProductName = FormulaName");
        } catch(e) { console.log(e.message); }
        
        console.log("Migration complete");
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
migrate();
