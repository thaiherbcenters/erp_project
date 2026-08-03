const { poolPromise, sql } = require('./config/db');

// Product catalog promo definition
const PRODUCT_PROMOS = {
    "ยาดมสมุนไพร": { newQty: 40, newPrice: 25, oldQty: 50, oldPrice: 20 },
    "ยาดมสมุนไพร จัมโบ้": { newQty: 5, newPrice: 200 },
    "ยาหม่อง": { newQty: 35, newPrice: 1000/35, oldQty: 40, oldPrice: 25 },
    "ยาหมอง": { newQty: 35, newPrice: 1000/35, oldQty: 40, oldPrice: 25 },
    "ยาน้ำมัน ขนาด 10 มล.": { newQty: 20, newPrice: 50, oldQty: 17, oldPrice: 59 },
    "ยาน้ำมัน ขนาด 5 มล.": { newQty: 25, newPrice: 40 },
    "ยาน้ำมันสมุนไพร สูตรเย็น": { newQty: 14, newPrice: 71 },
    "ยาน้ำมันสมุนไพร สูตรร้อน": { newQty: 14, newPrice: 71 },
    "ยาสเปรย์ผสมกระดูกไก่ดำ": { newQty: 14, newPrice: 71 }
};

async function fixSOItemsPromo() {
    try {
        console.log('Connecting to database...');
        const pool = await poolPromise;
        
        // Fetch all SalesOrderItems
        const res = await pool.request().query(`
            SELECT ItemID, SalesOrderID, ItemName, Qty, Price, Amount, IsPromo, PromoType, PromoMultiplier, BasePromoName
            FROM SalesOrderItem
        `);

        console.log(`Found ${res.recordset.length} items in SalesOrderItem table.`);

        let updatedCount = 0;
        for (const item of res.recordset) {
            const rawName = item.BasePromoName || item.ItemName || '';
            const name = rawName.trim();
            const pData = PRODUCT_PROMOS[name] || PRODUCT_PROMOS[name.replace('หมอง', 'หม่อง')];
            
            let pType = item.PromoType || null;
            let isPromo = item.IsPromo ? 1 : 0;
            let promoMultiplier = item.PromoMultiplier || 1;
            let basePromoName = item.BasePromoName || name;

            if (pData) {
                const qty = parseFloat(item.Qty) || 0;
                const amount = parseFloat(item.Amount) || (qty * (parseFloat(item.Price) || 0));

                if (pData.oldQty && qty > 0 && qty % pData.oldQty === 0) {
                    pType = 'old';
                    isPromo = 1;
                    promoMultiplier = Math.max(1, Math.round(qty / pData.oldQty));
                } else if (pData.newQty && qty > 0 && qty % pData.newQty === 0) {
                    pType = 'new';
                    isPromo = 1;
                    promoMultiplier = Math.max(1, Math.round(qty / pData.newQty));
                } else if (Math.abs(amount - 1000) < 10) {
                    pType = pData.newQty ? 'new' : 'old';
                    isPromo = 1;
                    promoMultiplier = 1;
                }
            }

            if (pType !== item.PromoType || isPromo !== (item.IsPromo ? 1 : 0) || promoMultiplier !== item.PromoMultiplier || basePromoName !== item.BasePromoName) {
                const updateReq = pool.request();
                updateReq.input('itemId', sql.Int, item.ItemID);
                updateReq.input('isPromo', sql.Bit, isPromo);
                updateReq.input('promoType', sql.NVarChar, pType);
                updateReq.input('promoMultiplier', sql.Int, promoMultiplier);
                updateReq.input('basePromoName', sql.NVarChar, basePromoName);

                await updateReq.query(`
                    UPDATE SalesOrderItem
                    SET IsPromo = @isPromo,
                        PromoType = @promoType,
                        PromoMultiplier = @promoMultiplier,
                        BasePromoName = @basePromoName
                    WHERE ItemID = @itemId
                `);
                updatedCount++;
                console.log(`Updated ItemID ${item.ItemID} (${item.ItemName}): IsPromo=${isPromo}, PromoType=${pType}, Multiplier=${promoMultiplier}`);
            }
        }

        console.log(`Successfully backfilled ${updatedCount} items in SalesOrderItem.`);
        process.exit(0);
    } catch (err) {
        console.error('Error fixing SalesOrderItem promo fields:', err);
        process.exit(1);
    }
}

fixSOItemsPromo();
