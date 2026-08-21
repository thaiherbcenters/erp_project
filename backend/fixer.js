require('dotenv').config({ path: 'C:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/backend/.env' });
const { poolPromise } = require('C:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/backend/config/db');

(async () => {
  try {
    const pool = await poolPromise;
    const t = pool.transaction();
    await t.begin();
    try {
      await t.request().query("UPDATE Stock_Logs SET ItemID = 'PM-009' WHERE ItemID = 'PM-101'; UPDATE Stock_Items SET ItemID = 'PM-009' WHERE ItemID = 'PM-101';");
      
      const fixes = [
        {p: 'FG-', n: 33},
        {p: 'PM-', n: 9},
        {p: 'RM-', n: 16},
        {p: 'SP-', n: 5},
        {p: 'WIP-', n: 6}
      ];
      
      for(let f of fixes) {
        const query = "IF EXISTS (SELECT 1 FROM Sequences WHERE Prefix = '" + f.p + "') UPDATE Sequences SET LastNumber = " + f.n + ", UpdatedAt = GETDATE() WHERE Prefix = '" + f.p + "' ELSE INSERT INTO Sequences (Prefix, LastNumber, UpdatedAt) VALUES ('" + f.p + "', " + f.n + ", GETDATE());";
        await t.request().query(query);
      }
      
      await t.commit();
      console.log('Done!');
      process.exit(0);
    } catch(e) { 
      await t.rollback(); 
      console.error('Transaction Error:', e);
      process.exit(1); 
    }
  } catch (err) {
      console.error('Connection Error:', err);
      process.exit(1);
  }
})();
