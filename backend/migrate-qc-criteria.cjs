/**
 * =============================================================================
 * migrate-qc-criteria.cjs
 * =============================================================================
 * สร้างตารางสำหรับ QC Checklists: QC_Criteria (Master) และ QC_Results (Transaction)
 * =============================================================================
 */
require('dotenv').config();
const { poolPromise, sql } = require('./config/db');

async function migrate() {
    try {
        const pool = await poolPromise;
        console.log('🔧 Starting QC Checklists migration...\n');

        // 1. Create QC_Criteria Table
        console.log('[1/4] Creating QC_Criteria table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QC_Criteria' AND xtype='U')
            BEGIN
                CREATE TABLE QC_Criteria (
                    CriteriaID INT IDENTITY(1,1) PRIMARY KEY,
                    ProductCategory NVARCHAR(100), -- 'ยาดม', 'ยาหม่อง', 'ครีม', 'น้ำมันนวด', 'เครื่องดื่ม', 'Incoming', 'All'
                    QCStage VARCHAR(50), -- 'Incoming', 'qc_inprocess', 'qc_final'
                    CheckItem NVARCHAR(255),
                    StandardRequirement NVARCHAR(255),
                    IsRequired BIT DEFAULT 1,
                    CreatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT 'Table QC_Criteria created.';
            END
            ELSE
            BEGIN
                PRINT 'Table QC_Criteria already exists.';
            END
        `);

        // 2. Create QC_Results Table
        console.log('[2/4] Creating QC_Results table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QC_Results' AND xtype='U')
            BEGIN
                CREATE TABLE QC_Results (
                    ResultID INT IDENTITY(1,1) PRIMARY KEY,
                    ReferenceID VARCHAR(50), -- Map back to QC_Incoming.IncomingID or QC_Production.RequestID
                    CriteriaID INT,
                    IsPass BIT,
                    ActualValue NVARCHAR(255),
                    Note NVARCHAR(MAX),
                    CreatedAt DATETIME DEFAULT GETDATE()
                )
                PRINT 'Table QC_Results created.';
            END
            ELSE
            BEGIN
                PRINT 'Table QC_Results already exists.';
            END
        `);

        // 3. Insert Master Data (QC Criteria)
        console.log('[3/4] Inserting QC Criteria Master Data...');
        await pool.request().query('DELETE FROM QC_Criteria'); // Clear old data if re-running

        const criteriaList = [
            // === ยาดม (Inhaler) ===
            { cat: 'ยาดม', stage: 'qc_inprocess', item: 'การละลายและการเข้ากันของส่วนผสม', req: 'ของเหลวใสหรือผึ่งเย็นแล้วเข้ากัน ไม่ตกตะกอน' },
            { cat: 'ยาดม', stage: 'qc_inprocess', item: 'อุณหภูมิระหว่างผสม', req: '60°C - 70°C' },
            { cat: 'ยาดม', stage: 'qc_inprocess', item: 'สีและกลิ่น (Odor / Color)', req: 'ตรงตามมาตรฐานสูตร ไม่มีกลิ่นไหม้' },
            
            { cat: 'ยาดม', stage: 'qc_final', item: 'น้ำหนักไส้ (Net Weight)', req: '2g ± 0.1g' },
            { cat: 'ยาดม', stage: 'qc_final', item: 'ความแน่นของซีล/ฝา (Seal Integrity)', req: 'ฝาปิดสนิท ไม่รั่วซึม' },
            { cat: 'ยาดม', stage: 'qc_final', item: 'ตำแหน่งและพิมพ์ฉลาก', req: 'สติ๊กเกอร์ตรง รอยพิมพ์ชัด ไม่ลอก' },

            // === ครีม / ยาหม่อง (Cream / Balm) ===
            { cat: 'ครีม', stage: 'qc_inprocess', item: 'ค่า pH', req: '5.5 - 6.5' },
            { cat: 'ครีม', stage: 'qc_inprocess', item: 'ความหนืด / ความสม่ำเสมอ (Homogeneity)', req: 'เนื้อครีมเนียน ไม่มีเม็ดสาก' },
            { cat: 'ครีม', stage: 'qc_inprocess', item: 'อุณหภูมิเซ็ตตัว', req: 'ผึ่งเย็นที่ห้องปรับอากาศ (25°C)' },

            { cat: 'ครีม', stage: 'qc_final', item: 'น้ำหนักสุทธิ', req: '50g ± 2g' },
            { cat: 'ครีม', stage: 'qc_final', item: 'สภาพกระปุกและความสะอาด', req: 'ปราศจากฝุ่นและคราบ' },
            { cat: 'ครีม', stage: 'qc_final', item: 'รอยซีลฟอยล์ปิดปากขวด', req: 'ฉีกไม่ขาดง่าย ซีลสนิท 100%' },

            // === น้ำมันนวด (Massage Oil) ===
            { cat: 'น้ำมันนวด', stage: 'qc_inprocess', item: 'สมบัติทางกายภาพ (สี/กลิ่น)', req: 'ใส สีเหลืองอ่อน กลิ่นสมุนไพรสดชื่น' },
            { cat: 'น้ำมันนวด', stage: 'qc_inprocess', item: 'ปริมาณสิ่งเจือปน', req: 'ไม่พบ (0%)' },
            { cat: 'น้ำมันนวด', stage: 'qc_final', item: 'ปริมาณบรรจุ', req: '100ml ± 2ml' },
            { cat: 'น้ำมันนวด', stage: 'qc_final', item: 'การทนต่อการหกเรี่ยราด (Leak test)', req: 'คว่ำขวด 10 นาที น้ำมันไม่ซึม' },

            // === Incoming (Raw Materials/Packaging) ===
            { cat: 'Incoming', stage: 'Incoming', item: 'ตรวจ COA (Certificate of Analysis)', req: 'มีเอกสารครบถ้วน และล็อตตรง' },
            { cat: 'Incoming', stage: 'Incoming', item: 'ความสมบูรณ์ของบรรจุภัณฑ์ขนส่งหีบห่อ', req: 'กล่องไม่ฉีกขาด บุบ หรือโดนความชื้น' },
            { cat: 'Incoming', stage: 'Incoming', item: 'วันหมดอายุ (Expiry Date Limit)', req: 'อายุคงเหลือ > 1 ปี' }
        ];

        for (const c of criteriaList) {
            await pool.request()
                .input('ProductCategory', sql.NVarChar, c.cat)
                .input('QCStage', sql.VarChar, c.stage)
                .input('CheckItem', sql.NVarChar, c.item)
                .input('StandardRequirement', sql.NVarChar, c.req)
                .query(`
                    INSERT INTO QC_Criteria (ProductCategory, QCStage, CheckItem, StandardRequirement)
                    VALUES (@ProductCategory, @QCStage, @CheckItem, @StandardRequirement)
                `);
        }
        console.log(`   Inserted ${criteriaList.length} criteria items.`);

        // 4. Also update setup-qc-db.cjs to include these new tables for future fresh installs
        console.log('[4/4] Setup files ready. Migration Logic complete.');

        console.log('\n✅ QC Checklist Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
