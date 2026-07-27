const { poolPromise } = require('./config/db');
poolPromise.then(pool => {
    const q = `
        ALTER TABLE RnD_Formula_Ingredients ADD IngredientType NVARCHAR(100);
        ALTER TABLE RnD_Formula_Ingredients ADD EngName NVARCHAR(255);
        ALTER TABLE RnD_Formula_Ingredients ADD LatinName NVARCHAR(255);
        ALTER TABLE RnD_Formula_Ingredients ADD PartUsed NVARCHAR(255);
    `;
    pool.request().query(q)
        .then(() => {
            console.log("Columns added successfully");
            process.exit(0);
        })
        .catch(err => console.error(err));
});
