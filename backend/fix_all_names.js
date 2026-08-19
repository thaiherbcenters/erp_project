const { poolPromise, sql } = require('./config/db'); 
async function fix() { 
    try { 
        const pool = await poolPromise; 
        
        // Let's just fix ALL Packaging tasks where Product = ยาสเปรย์ สูตรร้อน (พี่มัม) 
        // to be ยาน้ำมันสมุนไพร สูตรร้อน since they are all the same product anyway.
        await pool.request().query("UPDATE Packaging_Tasks SET Product = N'ยาน้ำมันสมุนไพร สูตรร้อน' WHERE Product = N'ยาสเปรย์ สูตรร้อน (พี่มัม)'");
        console.log("Fixed Packaging_Tasks");
        
        // Let's also make sure ALL Production_Tasks where FormulaName = ยาสเปรย์ สูตรร้อน (พี่มัม) 
        // have their ProductName set properly.
        await pool.request().query("UPDATE Production_Tasks SET ProductName = N'ยาน้ำมันสมุนไพร สูตรร้อน' WHERE FormulaName = N'ยาสเปรย์ สูตรร้อน (พี่มัม)'");
        console.log("Fixed Production_Tasks");
        
        // Let's also fix Planner
        await pool.request().query("UPDATE Planner SET ProductName = N'ยาน้ำมันสมุนไพร สูตรร้อน' WHERE FormulaName = N'ยาสเปรย์ สูตรร้อน (พี่มัม)'");
        console.log("Fixed Planner");
        
    } catch(e) { 
        console.error(e); 
    } 
    process.exit(0); 
} 
fix();
