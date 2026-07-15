const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// Helper to bind all fields to a request
const bindFields = (req, data, isUpdate = false, oldDoc = {}) => {
    // Basic
    if (isUpdate) {
        req.input('DocumentDate', sql.Date, data.DocumentDate || oldDoc.DocumentDate);
        req.input('ContractID', sql.Int, data.ContractID || oldDoc.ContractID);
    } else {
        req.input('DocumentDate', sql.Date, data.DocumentDate || new Date());
        req.input('ContractID', sql.Int, data.ContractID || null);
    }
    
    // Receipt Fields (For Official Use)
    req.input('ReceiptNo', sql.NVarChar, data.ReceiptNo || null);
    req.input('ReceiptDate', sql.Date, data.ReceiptDate || null);
    req.input('ReceiverName', sql.NVarChar, data.ReceiverName || null);
    req.input('ReqMedicineFromHerb', sql.Bit, data.ReqMedicineFromHerb ? 1 : 0);
    req.input('ReqMedType', sql.NVarChar, data.ReqMedType || null);
    
    // Auto-calculate the 3 separate boolean fields based on the selected ReqMedType string
    const isThai = data.ReqMedType === 'ยาแผนไทย';
    const isAlt = data.ReqMedType === 'ยาตามองค์ความรู้การแพทย์แผนทางเลือก';
    const isDev = data.ReqMedType === 'ยาพัฒนาจากสมุนไพร';
    
    req.input('ReqMedTypeThai', sql.Bit, isThai ? 1 : 0);
    req.input('ReqMedTypeAlternative', sql.Bit, isAlt ? 1 : 0);
    req.input('ReqMedTypeDeveloped', sql.Bit, isDev ? 1 : 0);
    
    req.input('ReqMedTypeOther', sql.NVarChar, data.ReqMedTypeOther || null);
    req.input('ReqHealthProduct', sql.Bit, data.ReqHealthProduct ? 1 : 0);
    req.input('TypeProduce', sql.Bit, data.TypeProduce ? 1 : 0);
    req.input('TypeImport', sql.Bit, data.TypeImport ? 1 : 0);
    req.input('TypeExportOnly', sql.Bit, data.TypeExportOnly ? 1 : 0);
    req.input('ProductNameThai', sql.NVarChar, data.ProductNameThai || null);
    req.input('ProductNameEng', sql.NVarChar, data.ProductNameEng || null);
    
    // Applicant
    req.input('ApplicantType', sql.NVarChar, data.ApplicantType || null);
    
    // Auto-calculate the separate boolean fields for ApplicantType
    const isAppNatural = data.ApplicantType === 'บุคคลธรรมดา';
    const isAppJuristic = data.ApplicantType === 'นิติบุคคล';
    const isAppForeign = data.ApplicantType === 'ต่างด้าว' || data.ApplicantType === 'บุคคลธรรมดาต่างด้าว';
    const isAppForeignJuristic = data.ApplicantType === 'นิติบุคคลต่างด้าว';
    
    req.input('IsAppNatural', sql.Bit, isAppNatural ? 1 : 0);
    req.input('IsAppJuristic', sql.Bit, isAppJuristic ? 1 : 0);
    req.input('IsAppForeign', sql.Bit, isAppForeign ? 1 : 0);
    req.input('IsAppForeignJuristic', sql.Bit, isAppForeignJuristic ? 1 : 0);

    // Natural
    const naturalFields = ['AppNaturalName', 'AppNaturalNationality', 'AppNaturalCitizenID', 'AppNaturalAddressNo', 'AppNaturalBuilding', 'AppNaturalMoo', 'AppNaturalSoi', 'AppNaturalRoad', 'AppNaturalSubDistrict', 'AppNaturalDistrict', 'AppNaturalProvince', 'AppNaturalPostcode', 'AppNaturalFax', 'AppNaturalPhone', 'AppNaturalEmail'];
    naturalFields.forEach(f => req.input(f, sql.NVarChar, data[f] || null));
    req.input('AppNaturalAge', sql.Int, data.AppNaturalAge || null);
    
    // Juristic
    const juristicFields = ['AppJuristicName', 'AppJuristicID', 'AppJuristicAddressNo', 'AppJuristicBuilding', 'AppJuristicMoo', 'AppJuristicSoi', 'AppJuristicRoad', 'AppJuristicSubDistrict', 'AppJuristicDistrict', 'AppJuristicProvince', 'AppJuristicPostcode', 'AppJuristicFax', 'AppJuristicPhone', 'AppJuristicEmail', 'AppJuristicRepName', 'AppJuristicRepNationality', 'AppJuristicRepCitizenID'];
    juristicFields.forEach(f => req.input(f, sql.NVarChar, data[f] || null));
    req.input('AppJuristicAge', sql.Int, data.AppJuristicAge || null); // Actually it was AppJuristicRepAge
    req.input('AppJuristicRepAge', sql.Int, data.AppJuristicRepAge || null);
    
    // Foreign
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

    // Section 3: Production/Import
    const strFieldsSection3 = [
        'ProductionType', 'ProdLicenseeName', 'ProdLicenseNo', 'ProdOperatorName', 'ProdPlaceName', 'ProdAddressNo', 'ProdSoi', 'ProdRoad', 'ProdMoo', 'ProdSubDistrict', 'ProdDistrict', 'ProdProvince', 'ProdPostcode', 'ProdPhone',
        'RepackRegNo',
        'ImportLicenseeName', 'ImportLicenseNo', 'ImportOperatorName', 'ImportPlaceName', 'ImportAddressNo', 'ImportSoi', 'ImportRoad', 'ImportMoo', 'ImportSubDistrict', 'ImportDistrict', 'ImportProvince', 'ImportPostcode', 'ImportPhone', 'ImportForeignMfgName', 'ImportForeignMfgAddress'
    ];
    strFieldsSection3.forEach(f => req.input(f, sql.NVarChar, data[f] || null));

    // Section 4: Related Manufacturers
    const parseJSONField = (field) => {
        if (field && typeof field === 'string') {
            try { return JSON.stringify(JSON.parse(field)); } catch (e) { return '[]'; }
        }
        return field ? JSON.stringify(field) : '[]';
    };

    req.input('RelatedManufacturers', sql.NVarChar, parseJSONField(data.RelatedManufacturers || oldDoc.RelatedManufacturers));
    req.input('RecipeActiveIngredients', sql.NVarChar, parseJSONField(data.RecipeActiveIngredients || oldDoc.RecipeActiveIngredients));
    req.input('RecipeExtracts', sql.NVarChar, parseJSONField(data.RecipeExtracts || oldDoc.RecipeExtracts));
    req.input('RecipeExcipients', sql.NVarChar, parseJSONField(data.RecipeExcipients || oldDoc.RecipeExcipients));
    req.input('AttachedDocuments', sql.NVarChar, parseJSONField(data.AttachedDocuments || oldDoc.AttachedDocuments));
    
    // Section 4 Scalar
    req.input('RecipeOtherName', sql.NVarChar, data.RecipeOtherName || oldDoc.RecipeOtherName || null);
    req.input('RecipeFormat', sql.NVarChar, data.RecipeFormat || oldDoc.RecipeFormat || null);
    req.input('RecipeQuantity', sql.NVarChar, data.RecipeQuantity || oldDoc.RecipeQuantity || null);

    // Section 5: Product Details
    const strFieldsSection5 = [
        'ProductAppearance', 'ProductPackSize', 'ProductMfgProcess', 'ProductIndication', 
        'ProductDosage', 'ProductPreparation', 'ProductCondition', 'ProductStorage', 
        'ProductContraindication', 'ProductWarning', 'ProductPrecaution', 'ProductAdverseReaction',
        'SalesChannel', 'ProductSummary'
    ];
    strFieldsSection5.forEach(f => req.input(f, sql.NVarChar, data[f] || oldDoc[f] || null));
};

const getInsertFieldsStr = () => `
    DocumentNo, DocumentDate, DocumentType, ContractID,
    ReceiptNo, ReceiptDate, ReceiverName,
    ReqMedicineFromHerb, ReqMedType, ReqMedTypeThai, ReqMedTypeAlternative, ReqMedTypeDeveloped, ReqMedTypeOther, ReqHealthProduct,
    TypeProduce, TypeImport, TypeExportOnly,
    ProductNameThai, ProductNameEng, ApplicantType, IsAppNatural, IsAppJuristic, IsAppForeign, IsAppForeignJuristic,
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

const getInsertValuesStr = (hasVersion = false) => `
    @DocumentNo, @DocumentDate, @DocumentType, @ContractID,
    @ReceiptNo, @ReceiptDate, @ReceiverName,
    ${hasVersion ? '@Version, @RefDocumentID,' : ''}
    @ReqMedicineFromHerb, @ReqMedType, @ReqMedTypeThai, @ReqMedTypeAlternative, @ReqMedTypeDeveloped, @ReqMedTypeOther, @ReqHealthProduct,
    @TypeProduce, @TypeImport, @TypeExportOnly,
    @ProductNameThai, @ProductNameEng, @ApplicantType, @IsAppNatural, @IsAppJuristic, @IsAppForeign, @IsAppForeignJuristic,
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

const getUpdateFieldsStr = () => `
    DocumentDate = @DocumentDate, ContractID = @ContractID,
    ReceiptNo = @ReceiptNo, ReceiptDate = @ReceiptDate, ReceiverName = @ReceiverName,
    ReqMedicineFromHerb = @ReqMedicineFromHerb, ReqMedType = @ReqMedType, ReqMedTypeThai = @ReqMedTypeThai, ReqMedTypeAlternative = @ReqMedTypeAlternative, ReqMedTypeDeveloped = @ReqMedTypeDeveloped, ReqMedTypeOther = @ReqMedTypeOther, ReqHealthProduct = @ReqHealthProduct,
    TypeProduce = @TypeProduce, TypeImport = @TypeImport, TypeExportOnly = @TypeExportOnly,
    ProductNameThai = @ProductNameThai, ProductNameEng = @ProductNameEng, ApplicantType = @ApplicantType, IsAppNatural = @IsAppNatural, IsAppJuristic = @IsAppJuristic, IsAppForeign = @IsAppForeign, IsAppForeignJuristic = @IsAppForeignJuristic,
    AppNaturalName = @AppNaturalName, AppNaturalAge = @AppNaturalAge, AppNaturalNationality = @AppNaturalNationality, AppNaturalCitizenID = @AppNaturalCitizenID, AppNaturalAddressNo = @AppNaturalAddressNo, AppNaturalBuilding = @AppNaturalBuilding, AppNaturalMoo = @AppNaturalMoo, AppNaturalSoi = @AppNaturalSoi, AppNaturalRoad = @AppNaturalRoad, AppNaturalSubDistrict = @AppNaturalSubDistrict, AppNaturalDistrict = @AppNaturalDistrict, AppNaturalProvince = @AppNaturalProvince, AppNaturalPostcode = @AppNaturalPostcode, AppNaturalFax = @AppNaturalFax, AppNaturalPhone = @AppNaturalPhone, AppNaturalEmail = @AppNaturalEmail,
    AppJuristicName = @AppJuristicName, AppJuristicID = @AppJuristicID, AppJuristicAddressNo = @AppJuristicAddressNo, AppJuristicBuilding = @AppJuristicBuilding, AppJuristicMoo = @AppJuristicMoo, AppJuristicSoi = @AppJuristicSoi, AppJuristicRoad = @AppJuristicRoad, AppJuristicSubDistrict = @AppJuristicSubDistrict, AppJuristicDistrict = @AppJuristicDistrict, AppJuristicProvince = @AppJuristicProvince, AppJuristicPostcode = @AppJuristicPostcode, AppJuristicFax = @AppJuristicFax, AppJuristicPhone = @AppJuristicPhone, AppJuristicEmail = @AppJuristicEmail, AppJuristicRepName = @AppJuristicRepName, AppJuristicRepAge = @AppJuristicRepAge, AppJuristicRepNationality = @AppJuristicRepNationality, AppJuristicRepCitizenID = @AppJuristicRepCitizenID,
    AppForeignPassportNo = @AppForeignPassportNo, AppForeignPassportExpiry = @AppForeignPassportExpiry, AppForeignResCertNo = @AppForeignResCertNo, AppForeignResCertDate = @AppForeignResCertDate, AppForeignWorkPermitNo = @AppForeignWorkPermitNo, AppForeignWorkPermitExpiry = @AppForeignWorkPermitExpiry, AppForeignBizLicenseNo = @AppForeignBizLicenseNo, AppForeignBizLicenseDate = @AppForeignBizLicenseDate, AppForeignBizCertNo = @AppForeignBizCertNo, AppForeignBizCertDate = @AppForeignBizCertDate,
    ProductionType = @ProductionType, ProdLicenseeName = @ProdLicenseeName, ProdLicenseNo = @ProdLicenseNo, ProdOperatorName = @ProdOperatorName, ProdPlaceName = @ProdPlaceName, ProdAddressNo = @ProdAddressNo, ProdSoi = @ProdSoi, ProdRoad = @ProdRoad, ProdMoo = @ProdMoo, ProdSubDistrict = @ProdSubDistrict, ProdDistrict = @ProdDistrict, ProdProvince = @ProdProvince, ProdPostcode = @ProdPostcode, ProdPhone = @ProdPhone,
    RepackRegNo = @RepackRegNo,
    ImportLicenseeName = @ImportLicenseeName, ImportLicenseNo = @ImportLicenseNo, ImportOperatorName = @ImportOperatorName, ImportPlaceName = @ImportPlaceName, ImportAddressNo = @ImportAddressNo, ImportSoi = @ImportSoi, ImportRoad = @ImportRoad, ImportMoo = @ImportMoo, ImportSubDistrict = @ImportSubDistrict, ImportDistrict = @ImportDistrict, ImportProvince = @ImportProvince, ImportPostcode = @ImportPostcode, ImportPhone = @ImportPhone, ImportForeignMfgName = @ImportForeignMfgName, ImportForeignMfgAddress = @ImportForeignMfgAddress,
    RelatedManufacturers = @RelatedManufacturers,
    RecipeOtherName = @RecipeOtherName, RecipeFormat = @RecipeFormat, RecipeQuantity = @RecipeQuantity, RecipeActiveIngredients = @RecipeActiveIngredients, RecipeExtracts = @RecipeExtracts, RecipeExcipients = @RecipeExcipients,
    ProductAppearance = @ProductAppearance, ProductPackSize = @ProductPackSize, ProductMfgProcess = @ProductMfgProcess, ProductIndication = @ProductIndication, ProductDosage = @ProductDosage, ProductPreparation = @ProductPreparation, ProductCondition = @ProductCondition, ProductStorage = @ProductStorage, ProductContraindication = @ProductContraindication, ProductWarning = @ProductWarning, ProductPrecaution = @ProductPrecaution, ProductAdverseReaction = @ProductAdverseReaction, SalesChannel = @SalesChannel, ProductSummary = @ProductSummary,
    AttachedDocuments = @AttachedDocuments, Status = @Status, UpdatedAt = GETDATE()
`.replace(/\s+/g, ' ').trim();

// GET all TorBor1Documents
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM (
                SELECT *, ROW_NUMBER() OVER(PARTITION BY DocumentNo ORDER BY Version DESC) as rn
                FROM TorBor1Documents
                WHERE Status != 'พรีวิว'
            ) docs
            WHERE rn = 1
            ORDER BY CreatedAt DESC
        `);
        
        // Parse RelatedManufacturers back to JSON for frontend
        const docs = result.recordset.map(d => {
            if (d.RelatedManufacturers && typeof d.RelatedManufacturers === 'string') {
                try { d.RelatedManufacturers = JSON.parse(d.RelatedManufacturers); } catch (e) {}
            }
            return d;
        });

        res.json({ success: true, data: docs });
    } catch (err) {
        console.error('Error fetching TorBor1 documents:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET document by ID
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request()
            .input('DocumentID', sql.Int, id)
            .query('SELECT * FROM TorBor1Documents WHERE DocumentID = @DocumentID');
        
        if (result.recordset.length > 0) {
            const doc = result.recordset[0];
            
            const parseJSON = (field) => {
                if (field && typeof field === 'string') {
                    try { return JSON.parse(field); } catch (e) { return []; }
                }
                return field || [];
            };

            doc.RelatedManufacturers = parseJSON(doc.RelatedManufacturers);
            doc.RecipeActiveIngredients = parseJSON(doc.RecipeActiveIngredients);
            doc.RecipeExtracts = parseJSON(doc.RecipeExtracts);
            doc.RecipeExcipients = parseJSON(doc.RecipeExcipients);
            doc.AttachedDocuments = parseJSON(doc.AttachedDocuments);

            res.json({ success: true, data: doc });
        } else {
            res.status(404).json({ success: false, message: 'Document not found' });
        }
    } catch (err) {
        console.error('Error fetching TorBor1 document:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// POST new TorBor1Document
router.post('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const data = req.body;
        
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const prefix = `TB1-${year}${month}${day}-`;
        
        const countResult = await pool.request()
            .input('Prefix', sql.NVarChar, `${prefix}%`)
            .query('SELECT COUNT(*) as count FROM TorBor1Documents WHERE DocumentNo LIKE @Prefix');
        
        const count = countResult.recordset[0].count + 1;
        const documentNo = `${prefix}${String(count).padStart(3, '0')}`;

        const sqlReq = pool.request();
        sqlReq.input('DocumentNo', sql.NVarChar, documentNo);
        sqlReq.input('DocumentType', sql.NVarChar, data.documentType || 'torbor1');
        sqlReq.input('Status', sql.NVarChar, data.status || 'ร่าง');
        
        bindFields(sqlReq, data);

        const queryStr = `
            INSERT INTO TorBor1Documents ( ${getInsertFieldsStr()} )
            OUTPUT INSERTED.DocumentID
            VALUES ( ${getInsertValuesStr(false)} )
        `;

        const insertResult = await sqlReq.query(queryStr);
        res.json({ success: true, message: 'Document created', documentId: insertResult.recordset[0].DocumentID, documentNo });
    } catch (err) {
        console.error('Error creating TorBor1 document:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// PUT update TorBor1Document
router.put('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const data = req.body;
        
        const docResult = await pool.request()
            .input('DocumentID', sql.Int, id)
            .query('SELECT * FROM TorBor1Documents WHERE DocumentID = @DocumentID');
            
        if (docResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        const oldDoc = docResult.recordset[0];
        
        let queryStr = '';
        const sqlReq = pool.request();
        
        sqlReq.input('Status', sql.NVarChar, data.status || oldDoc.Status);
        
        if (data.status === 'ลูกค้าขอแก้ไข' && oldDoc.Status !== 'ลูกค้าขอแก้ไข') {
            // Auto versioning
            sqlReq.input('Version', sql.Int, oldDoc.Version + 1);
            sqlReq.input('RefDocumentID', sql.Int, oldDoc.RefDocumentID || id);
            sqlReq.input('DocumentNo', sql.NVarChar, oldDoc.DocumentNo);
            sqlReq.input('DocumentType', sql.NVarChar, oldDoc.DocumentType);
            
            bindFields(sqlReq, data, true, oldDoc);

            queryStr = `
                INSERT INTO TorBor1Documents ( ${getInsertFieldsStr().replace('DocumentNo,', 'DocumentNo, Version, RefDocumentID,')} )
                OUTPUT INSERTED.DocumentID
                VALUES ( ${getInsertValuesStr(true)} )
            `;
        } else {
            sqlReq.input('DocumentID', sql.Int, id);
            bindFields(sqlReq, data, true, oldDoc);
            queryStr = `UPDATE TorBor1Documents SET ${getUpdateFieldsStr()} WHERE DocumentID = @DocumentID`;
        }

        const result = await sqlReq.query(queryStr);
        const returnedId = result.recordset ? result.recordset[0].DocumentID : id;
        
        res.json({ success: true, message: 'Document updated', documentId: returnedId });
    } catch (err) {
        console.error('Error updating TorBor1 document:', err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// DELETE document
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        await pool.request()
            .input('DocumentID', sql.Int, id)
            .query('DELETE FROM TorBor1Documents WHERE DocumentID = @DocumentID OR RefDocumentID = @DocumentID');
        res.json({ success: true, message: 'Document deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// POST version manually
router.post('/:id/version', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        
        const docResult = await pool.request()
            .input('DocumentID', sql.Int, id)
            .query('SELECT * FROM TorBor1Documents WHERE DocumentID = @DocumentID');
            
        if (docResult.recordset.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
        
        const oldDoc = docResult.recordset[0];
        
        const maxVerResult = await pool.request()
            .input('DocumentNo', sql.NVarChar, oldDoc.DocumentNo)
            .query('SELECT MAX(Version) as maxVer FROM TorBor1Documents WHERE DocumentNo = @DocumentNo');
        const newVersion = (maxVerResult.recordset[0].maxVer || 1) + 1;
        
        const sqlReq = pool.request();
        sqlReq.input('Version', sql.Int, newVersion);
        sqlReq.input('RefDocumentID', sql.Int, oldDoc.DocumentID);
        sqlReq.input('DocumentNo', sql.NVarChar, oldDoc.DocumentNo);
        sqlReq.input('DocumentType', sql.NVarChar, oldDoc.DocumentType);
        sqlReq.input('Status', sql.NVarChar, 'ร่าง');
        
        // Use old document as the source of truth for new version fields
        bindFields(sqlReq, oldDoc);
        
        const queryStr = `
            INSERT INTO TorBor1Documents ( ${getInsertFieldsStr().replace('DocumentNo,', 'DocumentNo, Version, RefDocumentID,')} )
            OUTPUT INSERTED.DocumentID
            VALUES ( ${getInsertValuesStr(true)} )
        `;

        const insertResult = await sqlReq.query(queryStr);
        res.json({ success: true, message: 'Version created', documentId: insertResult.recordset[0].DocumentID, version: newVersion });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// GET specific version
router.get('/:documentNo/versions', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { documentNo } = req.params;
        const result = await pool.request()
            .input('DocumentNo', sql.NVarChar, documentNo)
            .query('SELECT DocumentID, DocumentNo, DocumentDate, Status, Version, CreatedAt FROM TorBor1Documents WHERE DocumentNo = @DocumentNo ORDER BY Version DESC');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

module.exports = router;
