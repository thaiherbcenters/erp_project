const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: { trustServerCertificate: true, encrypt: true },
};

const dummyData = {
    DocumentDate: '2026-07-10',
    ContractID: null,
    ReqMedicineFromHerb: true,
    ReqMedType: 'ยาแผนไทย',
    ReqHealthProduct: false,
    TypeProduce: true,
    TypeImport: false,
    TypeExportOnly: false,
    ProductNameThai: 'ยาสมุนไพรทดสอบ 555',
    ProductNameEng: 'Test Herbal Medicine',
    ApplicantType: 'นิติบุคคล',
    AppNaturalName: 'นาย ทดสอบ', AppNaturalAge: 35, AppNaturalNationality: 'ไทย', AppNaturalCitizenID: '1234567890123',
    AppNaturalAddressNo: '123/45', AppNaturalBuilding: 'ตึกA', AppNaturalMoo: '1', AppNaturalSoi: 'สุขุมวิท 1', AppNaturalRoad: 'สุขุมวิท', AppNaturalSubDistrict: 'คลองเตย', AppNaturalDistrict: 'คลองเตย', AppNaturalProvince: 'กรุงเทพมหานคร', AppNaturalPostcode: '10110', AppNaturalFax: '021234567', AppNaturalPhone: '0812345678', AppNaturalEmail: 'test@test.com',
    AppJuristicName: 'บริษัท ทดสอบ จำกัด', AppJuristicID: '0105555555555', AppJuristicAddressNo: '99', AppJuristicBuilding: 'ตึกB', AppJuristicMoo: '2', AppJuristicSoi: 'สุขุมวิท 2', AppJuristicRoad: 'สุขุมวิท', AppJuristicSubDistrict: 'คลองเตยเหนือ', AppJuristicDistrict: 'วัฒนา', AppJuristicProvince: 'กรุงเทพมหานคร', AppJuristicPostcode: '10110', AppJuristicFax: '029876543', AppJuristicPhone: '0898765432', AppJuristicEmail: 'corp@test.com', AppJuristicRepName: 'นาย ตัวแทน', AppJuristicRepAge: 40, AppJuristicRepNationality: 'ไทย', AppJuristicRepCitizenID: '9876543210987',
    AppForeignPassportNo: 'AB123456', AppForeignPassportExpiry: '2030-01-01', AppForeignResCertNo: 'RC987', AppForeignResCertDate: '2020-01-01', AppForeignWorkPermitNo: 'WP111', AppForeignWorkPermitExpiry: '2025-01-01', AppForeignBizLicenseNo: 'BL222', AppForeignBizLicenseDate: '2019-01-01', AppForeignBizCertNo: 'BC333', AppForeignBizCertDate: '2018-01-01',
    ProductionType: 'ผลิตในประเทศ',
    ProdLicenseeName: 'นาย โรงงาน', ProdLicenseNo: 'ผล.1/2560', ProdOperatorName: 'นาย ผู้ดำเนินกิจการ', ProdPlaceName: 'โรงงานสมุนไพรดี', ProdAddressNo: '44', ProdSoi: '-', ProdRoad: 'บางนา-ตราด', ProdMoo: '3', ProdSubDistrict: 'บางนา', ProdDistrict: 'บางนา', ProdProvince: 'กรุงเทพมหานคร', ProdPostcode: '10260', ProdPhone: '023334444',
    RepackRegNo: '-',
    ImportLicenseeName: '-', ImportLicenseNo: '-', ImportOperatorName: '-', ImportPlaceName: '-', ImportAddressNo: '-', ImportSoi: '-', ImportRoad: '-', ImportMoo: '-', ImportSubDistrict: '-', ImportDistrict: '-', ImportProvince: '-', ImportPostcode: '-', ImportPhone: '-', ImportForeignMfgName: '-', ImportForeignMfgAddress: '-',
    RelatedManufacturers: [{ name: 'โรงงาน A', licenseNo: 'ลบ.1', responsibility: 'บรรจุ' }],
    RecipeOtherName: 'Test Medicine', RecipeFormat: 'แคปซูล', RecipeQuantity: '1000 แคปซูล',
    RecipeActiveIngredients: [{ thaiName: 'ฟ้าทะลายโจร', engName: 'Andrographis', latinName: 'Andrographis paniculata', partUsed: 'ใบ', quantity: '500 mg' }],
    RecipeExtracts: [{ extractName: 'สารสกัดฟ้าทะลายโจร', latinName: 'Andrographis paniculata', partUsed: 'ใบ', solvent: 'น้ำ', ratio: '5:1', quantity: '100 mg' }],
    RecipeExcipients: [{ name: 'แป้ง', casNumber: '123-45', function: 'สารเติมเต็ม', quantity: '100 mg' }],
    ProductAppearance: 'แคปซูลสีเขียว', ProductPackSize: '50 แคปซูล/ขวด', ProductMfgProcess: 'บดและบรรจุ', ProductIndication: 'แก้ไข้', ProductDosage: 'ครั้งละ 2 แคปซูล วันละ 3 ครั้ง', ProductPreparation: '-', ProductCondition: 'หลังอาหาร', ProductStorage: 'เก็บในที่แห้ง', ProductContraindication: 'ห้ามใช้ในสตรีมีครรภ์', ProductWarning: 'หากมีอาการแพ้ควรหยุดใช้', ProductPrecaution: 'ระวังในผู้ป่วยตับ', ProductAdverseReaction: 'อาจทำให้ท้องเสีย', SalesChannel: 'ผลิตภัณฑ์สมุนไพรขายทั่วไป', ProductSummary: 'ปลอดภัยและมีประสิทธิภาพ',
    AttachedDocuments: { doc1: true, doc2: false, doc3: true, doc6_1: true }
};

const getInsertFieldsStr = () => `
    DocumentNo, DocumentDate, DocumentType, ContractID,
    ReqMedicineFromHerb, ReqMedType, ReqHealthProduct,
    TypeProduce, TypeImport, TypeExportOnly,
    ProductNameThai, ProductNameEng, ApplicantType,
    AppNaturalName, AppNaturalAge, AppNaturalNationality, AppNaturalCitizenID, AppNaturalAddressNo, AppNaturalBuilding, AppNaturalMoo, AppNaturalSoi, AppNaturalRoad, AppNaturalSubDistrict, AppNaturalDistrict, AppNaturalProvince, AppNaturalPostcode, AppNaturalFax, AppNaturalPhone, AppNaturalEmail,
    AppJuristicName, AppJuristicID, AppJuristicAddressNo, AppJuristicBuilding, AppJuristicMoo, AppJuristicSoi, AppJuristicRoad, AppJuristicSubDistrict, AppJuristicDistrict, AppJuristicProvince, AppJuristicPostcode, AppJuristicFax, AppJuristicPhone, AppJuristicEmail, AppJuristicRepName, AppJuristicRepAge, AppJuristicRepNationality, AppJuristicRepCitizenID,
    AppForeignPassportNo, AppForeignPassportExpiry, AppForeignResCertNo, AppForeignResCertDate, AppForeignWorkPermitNo, AppForeignWorkPermitExpiry, AppForeignBizLicenseNo, AppForeignBizLicenseDate, AppForeignBizCertNo, AppForeignBizCertDate,
    ProductionType, ProdLicenseeName, ProdLicenseNo, ProdOperatorName, ProdPlaceName, ProdAddressNo, ProdSoi, ProdRoad, ProdMoo, ProdSubDistrict, ProdDistrict, ProdProvince, ProdPostcode, ProdPhone,
    RepackRegNo,
    ImportLicenseeName, ImportLicenseNo, ImportOperatorName, ImportPlaceName, ImportAddressNo, ImportSoi, ImportRoad, ImportMoo, ImportSubDistrict, ImportDistrict, ImportProvince, ImportPostcode, ImportPhone, ImportForeignMfgName, ImportForeignMfgAddress,
    RelatedManufacturers,
    RecipeOtherName, RecipeFormat, RecipeQuantity, RecipeActiveIngredients, RecipeExtracts, RecipeExcipients, 
    ProductAppearance, ProductPackSize, ProductMfgProcess, ProductIndication, ProductDosage, ProductPreparation, ProductCondition, ProductStorage, ProductContraindication, ProductWarning, ProductPrecaution, ProductAdverseReaction, SalesChannel, ProductSummary,
    AttachedDocuments, Status, CreatedAt, UpdatedAt
`.replace(/\s+/g, ' ').trim();

const getInsertValuesStr = () => `
    @DocumentNo, @DocumentDate, @DocumentType, @ContractID,
    @ReqMedicineFromHerb, @ReqMedType, @ReqHealthProduct,
    @TypeProduce, @TypeImport, @TypeExportOnly,
    @ProductNameThai, @ProductNameEng, @ApplicantType,
    @AppNaturalName, @AppNaturalAge, @AppNaturalNationality, @AppNaturalCitizenID, @AppNaturalAddressNo, @AppNaturalBuilding, @AppNaturalMoo, @AppNaturalSoi, @AppNaturalRoad, @AppNaturalSubDistrict, @AppNaturalDistrict, @AppNaturalProvince, @AppNaturalPostcode, @AppNaturalFax, @AppNaturalPhone, @AppNaturalEmail,
    @AppJuristicName, @AppJuristicID, @AppJuristicAddressNo, @AppJuristicBuilding, @AppJuristicMoo, @AppJuristicSoi, @AppJuristicRoad, @AppJuristicSubDistrict, @AppJuristicDistrict, @AppJuristicProvince, @AppJuristicPostcode, @AppJuristicFax, @AppJuristicPhone, @AppJuristicEmail, @AppJuristicRepName, @AppJuristicRepAge, @AppJuristicRepNationality, @AppJuristicRepCitizenID,
    @AppForeignPassportNo, @AppForeignPassportExpiry, @AppForeignResCertNo, @AppForeignResCertDate, @AppForeignWorkPermitNo, @AppForeignWorkPermitExpiry, @AppForeignBizLicenseNo, @AppForeignBizLicenseDate, @AppForeignBizCertNo, @AppForeignBizCertDate,
    @ProductionType, @ProdLicenseeName, @ProdLicenseNo, @ProdOperatorName, @ProdPlaceName, @ProdAddressNo, @ProdSoi, @ProdRoad, @ProdMoo, @ProdSubDistrict, @ProdDistrict, @ProdProvince, @ProdPostcode, @ProdPhone,
    @RepackRegNo,
    @ImportLicenseeName, @ImportLicenseNo, @ImportOperatorName, @ImportPlaceName, @ImportAddressNo, @ImportSoi, @ImportRoad, @ImportMoo, @ImportSubDistrict, @ImportDistrict, @ImportProvince, @ImportPostcode, @ImportPhone, @ImportForeignMfgName, @ImportForeignMfgAddress,
    @RelatedManufacturers,
    @RecipeOtherName, @RecipeFormat, @RecipeQuantity, @RecipeActiveIngredients, @RecipeExtracts, @RecipeExcipients,
    @ProductAppearance, @ProductPackSize, @ProductMfgProcess, @ProductIndication, @ProductDosage, @ProductPreparation, @ProductCondition, @ProductStorage, @ProductContraindication, @ProductWarning, @ProductPrecaution, @ProductAdverseReaction, @SalesChannel, @ProductSummary,
    @AttachedDocuments, @Status, GETDATE(), GETDATE()
`.replace(/\s+/g, ' ').trim();

const bindFields = (req, data) => {
    req.input('DocumentDate', sql.Date, data.DocumentDate || new Date());
    req.input('ContractID', sql.Int, data.ContractID || null);
    req.input('ReqMedicineFromHerb', sql.Bit, data.ReqMedicineFromHerb ? 1 : 0);
    req.input('ReqMedType', sql.NVarChar, data.ReqMedType || null);
    req.input('ReqHealthProduct', sql.Bit, data.ReqHealthProduct ? 1 : 0);
    req.input('TypeProduce', sql.Bit, data.TypeProduce ? 1 : 0);
    req.input('TypeImport', sql.Bit, data.TypeImport ? 1 : 0);
    req.input('TypeExportOnly', sql.Bit, data.TypeExportOnly ? 1 : 0);
    req.input('ProductNameThai', sql.NVarChar, data.ProductNameThai || null);
    req.input('ProductNameEng', sql.NVarChar, data.ProductNameEng || null);
    req.input('ApplicantType', sql.NVarChar, data.ApplicantType || null);
    const naturalFields = ['AppNaturalName', 'AppNaturalNationality', 'AppNaturalCitizenID', 'AppNaturalAddressNo', 'AppNaturalBuilding', 'AppNaturalMoo', 'AppNaturalSoi', 'AppNaturalRoad', 'AppNaturalSubDistrict', 'AppNaturalDistrict', 'AppNaturalProvince', 'AppNaturalPostcode', 'AppNaturalFax', 'AppNaturalPhone', 'AppNaturalEmail'];
    naturalFields.forEach(f => req.input(f, sql.NVarChar, data[f] || null));
    req.input('AppNaturalAge', sql.Int, data.AppNaturalAge || null);
    const juristicFields = ['AppJuristicName', 'AppJuristicID', 'AppJuristicAddressNo', 'AppJuristicBuilding', 'AppJuristicMoo', 'AppJuristicSoi', 'AppJuristicRoad', 'AppJuristicSubDistrict', 'AppJuristicDistrict', 'AppJuristicProvince', 'AppJuristicPostcode', 'AppJuristicFax', 'AppJuristicPhone', 'AppJuristicEmail', 'AppJuristicRepName', 'AppJuristicRepNationality', 'AppJuristicRepCitizenID'];
    juristicFields.forEach(f => req.input(f, sql.NVarChar, data[f] || null));
    req.input('AppJuristicAge', sql.Int, data.AppJuristicAge || null);
    req.input('AppJuristicRepAge', sql.Int, data.AppJuristicRepAge || null);
    req.input('AppForeignPassportNo', sql.NVarChar, data.AppForeignPassportNo || null);
    req.input('AppForeignPassportExpiry', sql.Date, data.AppForeignPassportExpiry || null);
    req.input('AppForeignResCertNo', sql.NVarChar, data.AppForeignResCertNo || null);
    req.input('AppForeignResCertDate', sql.Date, data.AppForeignResCertDate || null);
    req.input('AppForeignWorkPermitNo', sql.NVarChar, data.AppForeignWorkPermitNo || null);
    req.input('AppForeignWorkPermitExpiry', sql.Date, data.AppForeignWorkPermitExpiry || null);
    req.input('AppForeignBizLicenseNo', sql.NVarChar, data.AppForeignBizLicenseNo || null);
    req.input('AppForeignBizLicenseDate', sql.Date, data.AppForeignBizLicenseDate || null);
    req.input('AppForeignBizCertNo', sql.NVarChar, data.AppForeignBizCertNo || null);
    req.input('AppForeignBizCertDate', sql.Date, data.AppForeignBizCertDate || null);
    const strFieldsSection3 = ['ProductionType', 'ProdLicenseeName', 'ProdLicenseNo', 'ProdOperatorName', 'ProdPlaceName', 'ProdAddressNo', 'ProdSoi', 'ProdRoad', 'ProdMoo', 'ProdSubDistrict', 'ProdDistrict', 'ProdProvince', 'ProdPostcode', 'ProdPhone', 'RepackRegNo', 'ImportLicenseeName', 'ImportLicenseNo', 'ImportOperatorName', 'ImportPlaceName', 'ImportAddressNo', 'ImportSoi', 'ImportRoad', 'ImportMoo', 'ImportSubDistrict', 'ImportDistrict', 'ImportProvince', 'ImportPostcode', 'ImportPhone', 'ImportForeignMfgName', 'ImportForeignMfgAddress'];
    strFieldsSection3.forEach(f => req.input(f, sql.NVarChar, data[f] || null));
    const parseJSONField = (field) => field ? JSON.stringify(field) : '[]';
    req.input('RelatedManufacturers', sql.NVarChar, parseJSONField(data.RelatedManufacturers));
    req.input('RecipeActiveIngredients', sql.NVarChar, parseJSONField(data.RecipeActiveIngredients));
    req.input('RecipeExtracts', sql.NVarChar, parseJSONField(data.RecipeExtracts));
    req.input('RecipeExcipients', sql.NVarChar, parseJSONField(data.RecipeExcipients));
    req.input('AttachedDocuments', sql.NVarChar, parseJSONField(data.AttachedDocuments));
    req.input('RecipeOtherName', sql.NVarChar, data.RecipeOtherName || null);
    req.input('RecipeFormat', sql.NVarChar, data.RecipeFormat || null);
    req.input('RecipeQuantity', sql.NVarChar, data.RecipeQuantity || null);
    const strFieldsSection5 = ['ProductAppearance', 'ProductPackSize', 'ProductMfgProcess', 'ProductIndication', 'ProductDosage', 'ProductPreparation', 'ProductCondition', 'ProductStorage', 'ProductContraindication', 'ProductWarning', 'ProductPrecaution', 'ProductAdverseReaction', 'SalesChannel', 'ProductSummary'];
    strFieldsSection5.forEach(f => req.input(f, sql.NVarChar, data[f] || null));
};

async function runTest() {
    let pool;
    try {
        pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server');
        
        const req = pool.request();
        bindFields(req, dummyData);
        req.input('DocumentNo', sql.NVarChar, 'TEST-' + Date.now());
        req.input('DocumentType', sql.NVarChar, 'ทบ.๑');
        req.input('Status', sql.NVarChar, 'รอตรวจสอบ');
        
        const q = `INSERT INTO TorBor1Documents (${getInsertFieldsStr()}) VALUES (${getInsertValuesStr()})`;
        await req.query(q);
        
        console.log('✅ All fields were successfully inserted into the database!');
        
    } catch(err) {
        console.error('❌ SQL Error:', err.message);
    } finally {
        if(pool) await pool.close();
    }
}

runTest();
