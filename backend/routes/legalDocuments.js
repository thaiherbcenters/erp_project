const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { generateSequence, getDatePrefix } = require('../utils/sequence');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/legal_documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Fix Thai filename encoding issue from multer
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'legal-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// GET all legal documents with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 20);
        const type = req.query.type || '';
        const offset = (page - 1) * limit;

        let whereClause = "WHERE Status != 'พรีวิว'";
        const request = pool.request();
        
        if (type) {
            whereClause += ' AND DocumentType = @type';
            request.input('type', sql.NVarChar, type);
        }

        // Count total unique DocumentNo
        const countResult = await request.query(`SELECT COUNT(DISTINCT DocumentNo) as total FROM LegalDocuments ${whereClause}`);
        const total = countResult.recordset[0].total;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);

        const result = await request.query(`
            WITH RankedDocs AS (
                SELECT DocumentID, DocumentNo, DocumentDate, DocumentType, GrantorName, GranteeName, Status, CreatedAt, Version,
                       ROW_NUMBER() OVER(PARTITION BY DocumentNo ORDER BY Version DESC) as rn
                FROM LegalDocuments
                ${whereClause}
            )
            SELECT * FROM RankedDocs WHERE rn = 1
            ORDER BY CreatedAt DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `);
        
        res.json({ 
            success: true, 
            data: result.recordset,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching legal documents:', err);
        res.status(500).json({ success: false, message: 'Server error fetching legal documents', error: err.message });
    }
});

// GET history of a specific document number
router.get('/history/:documentNo', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { documentNo } = req.params;
        const result = await pool.request()
            .input('DocumentNo', sql.NVarChar, documentNo)
            .query(`
                SELECT DocumentID, DocumentNo, DocumentDate, DocumentType, GrantorName, GranteeName, Status, CreatedAt, Version
                FROM LegalDocuments
                WHERE DocumentNo = @DocumentNo
                ORDER BY Version DESC
            `);
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching document history:', err);
        res.status(500).json({ success: false, message: 'Server error fetching document history', error: err.message });
    }
});

// GET single legal document
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request()
            .input('DocumentID', sql.Int, id)
            .query(`SELECT * FROM LegalDocuments WHERE DocumentID = @DocumentID`);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error fetching legal document:', err);
        res.status(500).json({ success: false, message: 'Server error fetching legal document', error: err.message });
    }
});

// POST new legal document
router.post('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const data = req.body;
        
        // Auto-cleanup: Delete 'พรีวิว' documents older than 24 hours in the background
        pool.request().query(`
            DELETE FROM LegalDocuments 
            WHERE Status = 'พรีวิว' 
            AND CreatedAt < DATEADD(hour, -24, GETDATE())
        `).catch(err => console.error('Auto-cleanup error:', err));

        let finalDocumentNo = data.documentNo;
        if (!finalDocumentNo) {
            let prefix = 'DOC-';
            if (data.documentType === 'poa') prefix = 'POA-';
            else if (data.documentType === 'corp_rep') prefix = 'CRP-';
            finalDocumentNo = await generateSequence(pool, 'LegalDocuments', 'DocumentNo', `${prefix}${getDatePrefix()}`, 3);
        }

        const result = await pool.request()
            .input('DocumentNo', sql.NVarChar, finalDocumentNo)
            .input('WrittenAt', sql.NVarChar, data.writtenAt || null)
            .input('DocumentDate', sql.Date, data.documentDate || new Date())
            .input('DocumentType', sql.NVarChar, data.documentType || 'poa')
            .input('ContractID', sql.Int, data.contractId || null)
            
            .input('GrantorType', sql.NVarChar, data.personType || data.grantorType || null)
            .input('GrantorName', sql.NVarChar, data.licenseeName || data.grantorName || null)
            .input('GrantorCitizenID', sql.NVarChar, data.citizenId || data.grantorCitizenId || null)
            .input('GrantorCitizenIDExpiryDate', sql.Date, data.citizenIdExpiry || data.grantorCitizenIdExpiryDate || null)
            .input('GrantorJuristicID', sql.NVarChar, data.juristicId || data.grantorJuristicId || null)
            .input('LicenseNo', sql.NVarChar, data.licenseNo || null)
            .input('JuristicIDExpiryDate', sql.Date, data.juristicIdExpiry || null)
            
            .input('OperatorPrefix', sql.NVarChar, data.operatorPrefix || null)
            .input('OperatorName', sql.NVarChar, data.operatorName || null)
            .input('OperatorCitizenID', sql.NVarChar, data.operatorCitizenId || null)
            .input('OperatorIDExpiryDate', sql.Date, data.operatorIdExpiry || data.operatorIdExpiryDate || null)
            
            .input('EstablishmentName', sql.NVarChar, data.establishmentName || null)
            .input('EstAddressNo', sql.NVarChar, data.estAddressNo || null)
            .input('EstBuilding', sql.NVarChar, data.estBuilding || null)
            .input('EstMoo', sql.NVarChar, data.estMoo || null)
            .input('EstSoi', sql.NVarChar, data.estSoi || null)
            .input('EstRoad', sql.NVarChar, data.estRoad || null)
            .input('EstSubDistrict', sql.NVarChar, data.estSubDistrict || null)
            .input('EstDistrict', sql.NVarChar, data.estDistrict || null)
            .input('EstProvince', sql.NVarChar, data.estProvince || null)
            .input('EstPostcode', sql.NVarChar, data.estPostcode || null)
            .input('EstPhone', sql.NVarChar, data.estPhone || null)
            .input('EstFax', sql.NVarChar, data.estFax || null)
            .input('EstEmail', sql.NVarChar, data.estEmail || null)
            
            .input('IsProducer', sql.Bit, data.isProducer ? 1 : 0)
            .input('IsImporter', sql.Bit, data.isImporter ? 1 : 0)
            .input('ProdTypeHerbalMedicine', sql.Bit, data.prodTypeHerbalMedicine ? 1 : 0)
            .input('ProdTypeTraditionalMed', sql.Bit, data.prodTypeTraditionalMed ? 1 : 0)
            .input('ProdTypeDevMed', sql.Bit, data.prodTypeDevMed ? 1 : 0)
            .input('ProdTypeHealthProduct', sql.Bit, data.prodTypeHealthProduct ? 1 : 0)
            .input('ProdTypeCosmetic', sql.Bit, data.prodTypeCosmetic ? 1 : 0)
            .input('ProdTypeDetail', sql.NVarChar, data.prodTypeDetail || null)
            
            .input('RequestType', sql.NVarChar, data.reqType || data.requestType || null)
            .input('ReqTypeRegister', sql.Bit, (data.reqType || data.requestType) === 'register' ? 1 : 0)
            .input('ReqTypeNotifyDetail', sql.Bit, (data.reqType || data.requestType) === 'notifyDetail' ? 1 : 0)
            .input('ReqTypeNotify', sql.Bit, (data.reqType || data.requestType) === 'notify' ? 1 : 0)
            .input('ReqTypeRenew', sql.Bit, (data.reqType || data.requestType) === 'renew' ? 1 : 0)
            
            .input('SubmitterIsIn', sql.Bit, data.submitterIsIn ? 1 : 0)
            .input('SubmitFormType', sql.NVarChar, data.submitFormType || null)
            .input('SubmitFormTypeAmend', sql.Bit, data.submitFormType === 'amend' ? 1 : 0)
            .input('SubmitFormTypeReplace', sql.Bit, data.submitFormType === 'replace' ? 1 : 0)
            .input('SubmitFormTypeOtherCheck', sql.Bit, data.submitFormType === 'other' ? 1 : 0)
            .input('SubmitFormOther', sql.NVarChar, data.submitFormOther || null)
            .input('ProductName', sql.NVarChar, data.productName || null)
            .input('ProductReceiveNo', sql.NVarChar, data.productReceiveNo || null)
            .input('SubmitterIsOr', sql.Bit, data.submitterIsOr ? 1 : 0)
            .input('ProductNameAlt', sql.NVarChar, data.productNameAlt || null)
            .input('HasRegNo', sql.Bit, data.hasRegNo ? 1 : 0)
            .input('HasRegDetail', sql.Bit, data.hasRegDetail ? 1 : 0)
            .input('HasNoticeNo', sql.Bit, data.hasNoticeNo ? 1 : 0)
            .input('RegNoticeNo', sql.NVarChar, data.regNoticeNo || null)
            
            .input('GranteePrefix', sql.NVarChar, data.granteePrefix || null)
            .input('GranteeName', sql.NVarChar, data.granteeName || null)
            .input('GranteeAge', sql.Int, data.granteeAge || null)
            .input('GranteeCitizenID', sql.NVarChar, data.granteeCitizenId || null)
            .input('GranteeIDExpiryDate', sql.Date, data.granteeIdExpiry || data.granteeIdExpiryDate || null)
            .input('GranteeAddressNo', sql.NVarChar, data.granteeAddressNo || null)
            .input('GranteeMoo', sql.NVarChar, data.granteeMoo || null)
            .input('GranteeSoi', sql.NVarChar, data.granteeSoi || null)
            .input('GranteeRoad', sql.NVarChar, data.granteeRoad || null)
            .input('GranteeSubDistrict', sql.NVarChar, data.granteeSubDistrict || null)
            .input('GranteeDistrict', sql.NVarChar, data.granteeDistrict || null)
            .input('GranteeProvince', sql.NVarChar, data.granteeProvince || null)
            .input('GranteePhone', sql.NVarChar, data.granteePhone || null)
            .input('GranteeEmail', sql.NVarChar, data.granteeEmail || null)
            
            .input('ScopeSubmit', sql.Bit, data.scopeSubmit ? 1 : 0)
            .input('ScopeAmend', sql.Bit, data.scopeAmend ? 1 : 0)
            .input('ScopeAll', sql.Bit, data.scopeAll ? 1 : 0)
            .input('ScopeStartDate', sql.Date, data.scopeStartDate || null)
            .input('ScopeOther', sql.NVarChar, data.scopeOther || null)
            .input('ScopeStartDay', sql.NVarChar, data.scopeStartDay || null)
            .input('ScopeStartMonth', sql.NVarChar, data.scopeStartMonth || null)
            .input('ScopeStartYear', sql.NVarChar, data.scopeStartYear || null)
            
            .input('AttachLicenseCopy', sql.Bit, data.attachLicenseCopy ? 1 : 0)
            
            .input('GrantorSignName', sql.NVarChar, data.grantorSignName || null)
            .input('GranteeSignName', sql.NVarChar, data.granteeSignName || null)
            .input('Witness1Name', sql.NVarChar, data.witness1Name || null)
            .input('Witness2Name', sql.NVarChar, data.witness2Name || null)
            
            .input('Status', sql.NVarChar, data.status || 'ร่าง')
            .query(`
                INSERT INTO LegalDocuments (
                    DocumentNo, WrittenAt, DocumentDate, DocumentType, ContractID,
                    GrantorType, GrantorName, GrantorCitizenID, GrantorCitizenIDExpiryDate, GrantorJuristicID, LicenseNo, JuristicIDExpiryDate,
                    OperatorPrefix, OperatorName, OperatorCitizenID, OperatorIDExpiryDate,
                    EstablishmentName, EstAddressNo, EstBuilding, EstMoo, EstSoi, EstRoad, EstSubDistrict, EstDistrict, EstProvince, EstPostcode, EstPhone, EstFax, EstEmail,
                    IsProducer, IsImporter, ProdTypeHerbalMedicine, ProdTypeTraditionalMed, ProdTypeDevMed, ProdTypeHealthProduct, ProdTypeCosmetic, ProdTypeDetail,
                    RequestType, ReqTypeRegister, ReqTypeNotifyDetail, ReqTypeNotify, ReqTypeRenew, 
                    SubmitterIsIn, SubmitFormType, SubmitFormTypeAmend, SubmitFormTypeReplace, SubmitFormTypeOtherCheck, SubmitFormOther, 
                    ProductName, ProductReceiveNo, SubmitterIsOr, ProductNameAlt, HasRegNo, HasRegDetail, HasNoticeNo, RegNoticeNo,
                    GranteePrefix, GranteeName, GranteeAge, GranteeCitizenID, GranteeIDExpiryDate, GranteeAddressNo, GranteeMoo, GranteeSoi, GranteeRoad, GranteeSubDistrict, GranteeDistrict, GranteeProvince, GranteePhone, GranteeEmail,
                    ScopeSubmit, ScopeAmend, ScopeAll, ScopeStartDate, ScopeOther, ScopeStartDay, ScopeStartMonth, ScopeStartYear,
                    AttachLicenseCopy, GrantorSignName, GranteeSignName, Witness1Name, Witness2Name,
                    Status, CreatedAt, UpdatedAt
                ) OUTPUT INSERTED.DocumentID
                VALUES (
                    @DocumentNo, @WrittenAt, @DocumentDate, @DocumentType, @ContractID,
                    @GrantorType, @GrantorName, @GrantorCitizenID, @GrantorCitizenIDExpiryDate, @GrantorJuristicID, @LicenseNo, @JuristicIDExpiryDate,
                    @OperatorPrefix, @OperatorName, @OperatorCitizenID, @OperatorIDExpiryDate,
                    @EstablishmentName, @EstAddressNo, @EstBuilding, @EstMoo, @EstSoi, @EstRoad, @EstSubDistrict, @EstDistrict, @EstProvince, @EstPostcode, @EstPhone, @EstFax, @EstEmail,
                    @IsProducer, @IsImporter, @ProdTypeHerbalMedicine, @ProdTypeTraditionalMed, @ProdTypeDevMed, @ProdTypeHealthProduct, @ProdTypeCosmetic, @ProdTypeDetail,
                    @RequestType, @ReqTypeRegister, @ReqTypeNotifyDetail, @ReqTypeNotify, @ReqTypeRenew,
                    @SubmitterIsIn, @SubmitFormType, @SubmitFormTypeAmend, @SubmitFormTypeReplace, @SubmitFormTypeOtherCheck, @SubmitFormOther,
                    @ProductName, @ProductReceiveNo, @SubmitterIsOr, @ProductNameAlt, @HasRegNo, @HasRegDetail, @HasNoticeNo, @RegNoticeNo,
                    @GranteePrefix, @GranteeName, @GranteeAge, @GranteeCitizenID, @GranteeIDExpiryDate, @GranteeAddressNo, @GranteeMoo, @GranteeSoi, @GranteeRoad, @GranteeSubDistrict, @GranteeDistrict, @GranteeProvince, @GranteePhone, @GranteeEmail,
                    @ScopeSubmit, @ScopeAmend, @ScopeAll, @ScopeStartDate, @ScopeOther, @ScopeStartDay, @ScopeStartMonth, @ScopeStartYear,
                    @AttachLicenseCopy, @GrantorSignName, @GranteeSignName, @Witness1Name, @Witness2Name,
                    @Status, GETDATE(), GETDATE()
                )
            `);

        res.json({ success: true, message: 'Document created successfully', documentId: result.recordset[0].DocumentID });
    } catch (err) {
        console.error('Error creating legal document:', err);
        res.status(500).json({ success: false, message: 'Server error creating document', error: err.message });
    }
});

// PUT update legal document
router.put('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const data = req.body;

        const sqlReq = pool.request()
            .input('DocumentID', sql.Int, id)
            .input('DocumentNo', sql.NVarChar, data.documentNo || null)
            .input('WrittenAt', sql.NVarChar, data.writtenAt || null)
            .input('DocumentDate', sql.Date, data.documentDate || null)
            .input('DocumentType', sql.NVarChar, data.documentType || 'poa')
            .input('ContractID', sql.Int, data.contractId || null)
            
            .input('GrantorType', sql.NVarChar, data.personType || data.grantorType || null)
            .input('GrantorName', sql.NVarChar, data.licenseeName || data.grantorName || null)
            .input('GrantorCitizenID', sql.NVarChar, data.citizenId || data.grantorCitizenId || null)
            .input('GrantorCitizenIDExpiryDate', sql.Date, data.citizenIdExpiry || data.grantorCitizenIdExpiryDate || null)
            .input('GrantorJuristicID', sql.NVarChar, data.juristicId || data.grantorJuristicId || null)
            .input('LicenseNo', sql.NVarChar, data.licenseNo || null)
            .input('JuristicIDExpiryDate', sql.Date, data.juristicIdExpiry || null)
            
            .input('OperatorPrefix', sql.NVarChar, data.operatorPrefix || null)
            .input('OperatorName', sql.NVarChar, data.operatorName || null)
            .input('OperatorCitizenID', sql.NVarChar, data.operatorCitizenId || null)
            .input('OperatorIDExpiryDate', sql.Date, data.operatorIdExpiry || data.operatorIdExpiryDate || null)
            
            .input('EstablishmentName', sql.NVarChar, data.establishmentName || null)
            .input('EstAddressNo', sql.NVarChar, data.estAddressNo || null)
            .input('EstBuilding', sql.NVarChar, data.estBuilding || null)
            .input('EstMoo', sql.NVarChar, data.estMoo || null)
            .input('EstSoi', sql.NVarChar, data.estSoi || null)
            .input('EstRoad', sql.NVarChar, data.estRoad || null)
            .input('EstSubDistrict', sql.NVarChar, data.estSubDistrict || null)
            .input('EstDistrict', sql.NVarChar, data.estDistrict || null)
            .input('EstProvince', sql.NVarChar, data.estProvince || null)
            .input('EstPostcode', sql.NVarChar, data.estPostcode || null)
            .input('EstPhone', sql.NVarChar, data.estPhone || null)
            .input('EstFax', sql.NVarChar, data.estFax || null)
            .input('EstEmail', sql.NVarChar, data.estEmail || null)
            
            .input('IsProducer', sql.Bit, data.isProducer ? 1 : 0)
            .input('IsImporter', sql.Bit, data.isImporter ? 1 : 0)
            .input('ProdTypeHerbalMedicine', sql.Bit, data.prodTypeHerbalMedicine ? 1 : 0)
            .input('ProdTypeTraditionalMed', sql.Bit, data.prodTypeTraditionalMed ? 1 : 0)
            .input('ProdTypeDevMed', sql.Bit, data.prodTypeDevMed ? 1 : 0)
            .input('ProdTypeHealthProduct', sql.Bit, data.prodTypeHealthProduct ? 1 : 0)
            .input('ProdTypeCosmetic', sql.Bit, data.prodTypeCosmetic ? 1 : 0)
            .input('ProdTypeDetail', sql.NVarChar, data.prodTypeDetail || null)
            
            .input('RequestType', sql.NVarChar, data.reqType || data.requestType || null)
            .input('ReqTypeRegister', sql.Bit, (data.reqType || data.requestType) === 'register' ? 1 : 0)
            .input('ReqTypeNotifyDetail', sql.Bit, (data.reqType || data.requestType) === 'notifyDetail' ? 1 : 0)
            .input('ReqTypeNotify', sql.Bit, (data.reqType || data.requestType) === 'notify' ? 1 : 0)
            .input('ReqTypeRenew', sql.Bit, (data.reqType || data.requestType) === 'renew' ? 1 : 0)
            
            .input('SubmitterIsIn', sql.Bit, data.submitterIsIn ? 1 : 0)
            .input('SubmitFormType', sql.NVarChar, data.submitFormType || null)
            .input('SubmitFormTypeAmend', sql.Bit, data.submitFormType === 'amend' ? 1 : 0)
            .input('SubmitFormTypeReplace', sql.Bit, data.submitFormType === 'replace' ? 1 : 0)
            .input('SubmitFormTypeOtherCheck', sql.Bit, data.submitFormType === 'other' ? 1 : 0)
            .input('SubmitFormOther', sql.NVarChar, data.submitFormOther || null)
            .input('ProductName', sql.NVarChar, data.productName || null)
            .input('ProductReceiveNo', sql.NVarChar, data.productReceiveNo || null)
            .input('SubmitterIsOr', sql.Bit, data.submitterIsOr ? 1 : 0)
            .input('ProductNameAlt', sql.NVarChar, data.productNameAlt || null)
            .input('HasRegNo', sql.Bit, data.hasRegNo ? 1 : 0)
            .input('HasRegDetail', sql.Bit, data.hasRegDetail ? 1 : 0)
            .input('HasNoticeNo', sql.Bit, data.hasNoticeNo ? 1 : 0)
            .input('RegNoticeNo', sql.NVarChar, data.regNoticeNo || null)
            
            .input('GranteePrefix', sql.NVarChar, data.granteePrefix || null)
            .input('GranteeName', sql.NVarChar, data.granteeName || null)
            .input('GranteeAge', sql.Int, data.granteeAge || null)
            .input('GranteeCitizenID', sql.NVarChar, data.granteeCitizenId || null)
            .input('GranteeIDExpiryDate', sql.Date, data.granteeIdExpiry || data.granteeIdExpiryDate || null)
            .input('GranteeAddressNo', sql.NVarChar, data.granteeAddressNo || null)
            .input('GranteeMoo', sql.NVarChar, data.granteeMoo || null)
            .input('GranteeSoi', sql.NVarChar, data.granteeSoi || null)
            .input('GranteeRoad', sql.NVarChar, data.granteeRoad || null)
            .input('GranteeSubDistrict', sql.NVarChar, data.granteeSubDistrict || null)
            .input('GranteeDistrict', sql.NVarChar, data.granteeDistrict || null)
            .input('GranteeProvince', sql.NVarChar, data.granteeProvince || null)
            .input('GranteePhone', sql.NVarChar, data.granteePhone || null)
            .input('GranteeEmail', sql.NVarChar, data.granteeEmail || null)
            
            .input('ScopeSubmit', sql.Bit, data.scopeSubmit ? 1 : 0)
            .input('ScopeAmend', sql.Bit, data.scopeAmend ? 1 : 0)
            .input('ScopeAll', sql.Bit, data.scopeAll ? 1 : 0)
            .input('ScopeStartDate', sql.Date, data.scopeStartDate || null)
            .input('ScopeOther', sql.NVarChar, data.scopeOther || null)
            .input('ScopeStartDay', sql.NVarChar, data.scopeStartDay || null)
            .input('ScopeStartMonth', sql.NVarChar, data.scopeStartMonth || null)
            .input('ScopeStartYear', sql.NVarChar, data.scopeStartYear || null)
            
            .input('AttachLicenseCopy', sql.Bit, data.attachLicenseCopy ? 1 : 0)
            
            .input('GrantorSignName', sql.NVarChar, data.grantorSignName || null)
            .input('GranteeSignName', sql.NVarChar, data.granteeSignName || null)
            .input('Witness1Name', sql.NVarChar, data.witness1Name || null)
            .input('Witness2Name', sql.NVarChar, data.witness2Name || null)
            
            .input('Status', sql.NVarChar, data.status || 'ร่าง');

        const checkDoc = await pool.request().input('CheckDocumentID', sql.Int, id).query(`SELECT Status, Version, DocumentNo, RefDocumentID FROM LegalDocuments WHERE DocumentID = @CheckDocumentID`);
        if (checkDoc.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        const oldDoc = checkDoc.recordset[0];

        let queryStr = '';
        if (data.status === 'ลูกค้าขอแก้ไข' && oldDoc.Status !== 'ลูกค้าขอแก้ไข') {
            sqlReq.input('Version', sql.Int, oldDoc.Version + 1);
            sqlReq.input('RefDocumentID', sql.Int, oldDoc.RefDocumentID || id);
            queryStr = `
                INSERT INTO LegalDocuments (
                    DocumentNo, WrittenAt, DocumentDate, DocumentType, ContractID,
                    GrantorType, GrantorName, GrantorCitizenID, GrantorCitizenIDExpiryDate, GrantorJuristicID, LicenseNo, JuristicIDExpiryDate,
                    OperatorPrefix, OperatorName, OperatorCitizenID, OperatorIDExpiryDate,
                    EstablishmentName, EstAddressNo, EstBuilding, EstMoo, EstSoi, EstRoad, EstSubDistrict, EstDistrict, EstProvince, EstPostcode, EstPhone, EstFax, EstEmail,
                    IsProducer, IsImporter, ProdTypeHerbalMedicine, ProdTypeTraditionalMed, ProdTypeDevMed, ProdTypeHealthProduct, ProdTypeCosmetic, ProdTypeDetail,
                    RequestType, ReqTypeRegister, ReqTypeNotifyDetail, ReqTypeNotify, ReqTypeRenew, 
                    SubmitterIsIn, SubmitFormType, SubmitFormTypeAmend, SubmitFormTypeReplace, SubmitFormTypeOtherCheck, SubmitFormOther, 
                    ProductName, ProductReceiveNo, SubmitterIsOr, ProductNameAlt, HasRegNo, HasRegDetail, HasNoticeNo,
                    GranteePrefix, GranteeName, GranteeAge, GranteeCitizenID, GranteeIDExpiryDate, GranteeAddressNo, GranteeMoo, GranteeSoi, GranteeRoad, GranteeSubDistrict, GranteeDistrict, GranteeProvince, GranteePhone, GranteeEmail,
                    ScopeSubmit, ScopeAmend, ScopeAll, ScopeStartDate, ScopeOther, ScopeStartDay, ScopeStartMonth, ScopeStartYear,
                    AttachLicenseCopy, GrantorSignName, GranteeSignName, Witness1Name, Witness2Name,
                    Status, Version, RefDocumentID, CreatedAt, UpdatedAt
                ) OUTPUT INSERTED.DocumentID
                VALUES (
                    @DocumentNo, @WrittenAt, @DocumentDate, @DocumentType, @ContractID,
                    @GrantorType, @GrantorName, @GrantorCitizenID, @GrantorCitizenIDExpiryDate, @GrantorJuristicID, @LicenseNo, @JuristicIDExpiryDate,
                    @OperatorPrefix, @OperatorName, @OperatorCitizenID, @OperatorIDExpiryDate,
                    @EstablishmentName, @EstAddressNo, @EstBuilding, @EstMoo, @EstSoi, @EstRoad, @EstSubDistrict, @EstDistrict, @EstProvince, @EstPostcode, @EstPhone, @EstFax, @EstEmail,
                    @IsProducer, @IsImporter, @ProdTypeHerbalMedicine, @ProdTypeTraditionalMed, @ProdTypeDevMed, @ProdTypeHealthProduct, @ProdTypeCosmetic, @ProdTypeDetail,
                    @RequestType, @ReqTypeRegister, @ReqTypeNotifyDetail, @ReqTypeNotify, @ReqTypeRenew,
                    @SubmitterIsIn, @SubmitFormType, @SubmitFormTypeAmend, @SubmitFormTypeReplace, @SubmitFormTypeOtherCheck, @SubmitFormOther,
                    @ProductName, @ProductReceiveNo, @SubmitterIsOr, @ProductNameAlt, @HasRegNo, @HasRegDetail, @HasNoticeNo,
                    @GranteePrefix, @GranteeName, @GranteeAge, @GranteeCitizenID, @GranteeIDExpiryDate, @GranteeAddressNo, @GranteeMoo, @GranteeSoi, @GranteeRoad, @GranteeSubDistrict, @GranteeDistrict, @GranteeProvince, @GranteePhone, @GranteeEmail,
                    @ScopeSubmit, @ScopeAmend, @ScopeAll, @ScopeStartDate, @ScopeOther, @ScopeStartDay, @ScopeStartMonth, @ScopeStartYear,
                    @AttachLicenseCopy, @GrantorSignName, @GranteeSignName, @Witness1Name, @Witness2Name,
                    @Status, @Version, @RefDocumentID, GETDATE(), GETDATE()
                )
            `;
        } else {
            queryStr = `
                UPDATE LegalDocuments SET
                    DocumentNo = @DocumentNo,
                    WrittenAt = @WrittenAt,
                    DocumentDate = @DocumentDate,
                    DocumentType = @DocumentType,
                    ContractID = @ContractID,
                    GrantorType = @GrantorType,
                    GrantorName = @GrantorName,
                    GrantorCitizenID = @GrantorCitizenID,
                    GrantorCitizenIDExpiryDate = @GrantorCitizenIDExpiryDate,
                    GrantorJuristicID = @GrantorJuristicID,
                    LicenseNo = @LicenseNo,
                    JuristicIDExpiryDate = @JuristicIDExpiryDate,
                    OperatorPrefix = @OperatorPrefix,
                    OperatorName = @OperatorName,
                    OperatorCitizenID = @OperatorCitizenID,
                    OperatorIDExpiryDate = @OperatorIDExpiryDate,
                    EstablishmentName = @EstablishmentName,
                    EstAddressNo = @EstAddressNo,
                    EstBuilding = @EstBuilding,
                    EstMoo = @EstMoo,
                    EstSoi = @EstSoi,
                    EstRoad = @EstRoad,
                    EstSubDistrict = @EstSubDistrict,
                    EstDistrict = @EstDistrict,
                    EstProvince = @EstProvince,
                    EstPostcode = @EstPostcode,
                    EstPhone = @EstPhone,
                    EstFax = @EstFax,
                    EstEmail = @EstEmail,
                    IsProducer = @IsProducer,
                    IsImporter = @IsImporter,
                    ProdTypeHerbalMedicine = @ProdTypeHerbalMedicine,
                    ProdTypeTraditionalMed = @ProdTypeTraditionalMed,
                    ProdTypeDevMed = @ProdTypeDevMed,
                    ProdTypeHealthProduct = @ProdTypeHealthProduct,
                    ProdTypeCosmetic = @ProdTypeCosmetic,
                    ProdTypeDetail = @ProdTypeDetail,
                    RequestType = @RequestType,
                    ReqTypeRegister = @ReqTypeRegister,
                    ReqTypeNotifyDetail = @ReqTypeNotifyDetail,
                    ReqTypeNotify = @ReqTypeNotify,
                    ReqTypeRenew = @ReqTypeRenew,
                    SubmitterIsIn = @SubmitterIsIn,
                    SubmitFormType = @SubmitFormType,
                    SubmitFormTypeAmend = @SubmitFormTypeAmend,
                    SubmitFormTypeReplace = @SubmitFormTypeReplace,
                    SubmitFormTypeOtherCheck = @SubmitFormTypeOtherCheck,
                    SubmitFormOther = @SubmitFormOther,
                    ProductName = @ProductName,
                    ProductReceiveNo = @ProductReceiveNo,
                    SubmitterIsOr = @SubmitterIsOr,
                    ProductNameAlt = @ProductNameAlt,
                    HasRegNo = @HasRegNo,
                    HasRegDetail = @HasRegDetail,
                    HasNoticeNo = @HasNoticeNo,
                    RegNoticeNo = @RegNoticeNo,
                    GranteePrefix = @GranteePrefix,
                    GranteeName = @GranteeName,
                    GranteeAge = @GranteeAge,
                    GranteeCitizenID = @GranteeCitizenID,
                    GranteeIDExpiryDate = @GranteeIDExpiryDate,
                    GranteeAddressNo = @GranteeAddressNo,
                    GranteeMoo = @GranteeMoo,
                    GranteeSoi = @GranteeSoi,
                    GranteeRoad = @GranteeRoad,
                    GranteeSubDistrict = @GranteeSubDistrict,
                    GranteeDistrict = @GranteeDistrict,
                    GranteeProvince = @GranteeProvince,
                    GranteePhone = @GranteePhone,
                    GranteeEmail = @GranteeEmail,
                    ScopeSubmit = @ScopeSubmit,
                    ScopeAmend = @ScopeAmend,
                    ScopeAll = @ScopeAll,
                    ScopeStartDate = @ScopeStartDate,
                    ScopeOther = @ScopeOther,
                    ScopeStartDay = @ScopeStartDay,
                    ScopeStartMonth = @ScopeStartMonth,
                    ScopeStartYear = @ScopeStartYear,
                    AttachLicenseCopy = @AttachLicenseCopy,
                    GrantorSignName = @GrantorSignName,
                    GranteeSignName = @GranteeSignName,
                    Witness1Name = @Witness1Name,
                    Witness2Name = @Witness2Name,
                    Status = @Status,
                    UpdatedAt = GETDATE()
                WHERE DocumentID = @DocumentID
            `;
        }

        const updateResult = await sqlReq.query(queryStr);

        if (updateResult.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        res.json({ success: true, message: 'Document updated successfully', documentId: id });
    } catch (err) {
        console.error('Error updating legal document:', err);
        res.status(500).json({ success: false, message: 'Server error updating document', error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        await pool.request()
            .input('DocumentID', sql.Int, id)
            .query(`DELETE FROM LegalDocuments WHERE DocumentNo = (SELECT DocumentNo FROM LegalDocuments WHERE DocumentID = @DocumentID)`);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ success: false, message: 'Server error deleting document' });
    }
});

// POST Create New Version
router.post('/:id/version', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;

        // ดึงข้อมูลเวอร์ชันเดิม
        const docResult = await pool.request()
            .input('DocumentID', sql.Int, id)
            .query(`SELECT * FROM LegalDocuments WHERE DocumentID = @DocumentID`);

        if (docResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const oldDoc = docResult.recordset[0];
        
        // ค้นหาเวอร์ชันสูงสุดปัจจุบันของเอกสารเลขที่นี้
        const maxVerResult = await pool.request()
            .input('DocumentNo', sql.NVarChar, oldDoc.DocumentNo)
            .query(`SELECT MAX(Version) as maxVer FROM LegalDocuments WHERE DocumentNo = @DocumentNo`);
        const newVersion = (maxVerResult.recordset[0].maxVer || 1) + 1;

        // สร้างรายการใหม่โดยก๊อปปี้ฟิลด์ที่จำเป็น (ยกเว้น DocumentID)
        const insertResult = await pool.request()
            .input('DocumentNo', sql.NVarChar, oldDoc.DocumentNo)
            .input('WrittenAt', sql.NVarChar, oldDoc.WrittenAt)
            .input('DocumentDate', sql.Date, oldDoc.DocumentDate)
            .input('DocumentType', sql.NVarChar, oldDoc.DocumentType)
            .input('ContractID', sql.Int, oldDoc.ContractID)
            
            .input('GrantorType', sql.NVarChar, oldDoc.GrantorType)
            .input('GrantorName', sql.NVarChar, oldDoc.GrantorName)
            .input('GrantorCitizenID', sql.NVarChar, oldDoc.GrantorCitizenID)
            .input('GrantorCitizenIDExpiryDate', sql.Date, oldDoc.GrantorCitizenIDExpiryDate)
            .input('GrantorJuristicID', sql.NVarChar, oldDoc.GrantorJuristicID)
            .input('LicenseNo', sql.NVarChar, oldDoc.LicenseNo)
            .input('JuristicIDExpiryDate', sql.Date, oldDoc.JuristicIDExpiryDate)
            
            .input('OperatorPrefix', sql.NVarChar, oldDoc.OperatorPrefix)
            .input('OperatorName', sql.NVarChar, oldDoc.OperatorName)
            .input('OperatorCitizenID', sql.NVarChar, oldDoc.OperatorCitizenID)
            .input('OperatorIDExpiryDate', sql.Date, oldDoc.OperatorIDExpiryDate)
            
            .input('EstablishmentName', sql.NVarChar, oldDoc.EstablishmentName)
            .input('EstAddressNo', sql.NVarChar, oldDoc.EstAddressNo)
            .input('EstBuilding', sql.NVarChar, oldDoc.EstBuilding)
            .input('EstMoo', sql.NVarChar, oldDoc.EstMoo)
            .input('EstSoi', sql.NVarChar, oldDoc.EstSoi)
            .input('EstRoad', sql.NVarChar, oldDoc.EstRoad)
            .input('EstSubDistrict', sql.NVarChar, oldDoc.EstSubDistrict)
            .input('EstDistrict', sql.NVarChar, oldDoc.EstDistrict)
            .input('EstProvince', sql.NVarChar, oldDoc.EstProvince)
            .input('EstPostcode', sql.NVarChar, oldDoc.EstPostcode)
            .input('EstPhone', sql.NVarChar, oldDoc.EstPhone)
            .input('EstFax', sql.NVarChar, oldDoc.EstFax)
            .input('EstEmail', sql.NVarChar, oldDoc.EstEmail)
            
            .input('IsProducer', sql.Bit, oldDoc.IsProducer)
            .input('IsImporter', sql.Bit, oldDoc.IsImporter)
            .input('ProdTypeHerbalMedicine', sql.Bit, oldDoc.ProdTypeHerbalMedicine)
            .input('ProdTypeTraditionalMed', sql.Bit, oldDoc.ProdTypeTraditionalMed)
            .input('ProdTypeDevMed', sql.Bit, oldDoc.ProdTypeDevMed)
            .input('ProdTypeHealthProduct', sql.Bit, oldDoc.ProdTypeHealthProduct)
            .input('ProdTypeCosmetic', sql.Bit, oldDoc.ProdTypeCosmetic)
            .input('ProdTypeDetail', sql.NVarChar, oldDoc.ProdTypeDetail)
            
            .input('RequestType', sql.NVarChar, oldDoc.RequestType)
            .input('ReqTypeRegister', sql.Bit, oldDoc.ReqTypeRegister)
            .input('ReqTypeNotifyDetail', sql.Bit, oldDoc.ReqTypeNotifyDetail)
            .input('ReqTypeNotify', sql.Bit, oldDoc.ReqTypeNotify)
            .input('ReqTypeRenew', sql.Bit, oldDoc.ReqTypeRenew)
            
            .input('SubmitterIsIn', sql.Bit, oldDoc.SubmitterIsIn)
            .input('SubmitFormType', sql.NVarChar, oldDoc.SubmitFormType)
            .input('SubmitFormTypeAmend', sql.Bit, oldDoc.SubmitFormTypeAmend)
            .input('SubmitFormTypeReplace', sql.Bit, oldDoc.SubmitFormTypeReplace)
            .input('SubmitFormTypeOtherCheck', sql.Bit, oldDoc.SubmitFormTypeOtherCheck)
            .input('SubmitFormOther', sql.NVarChar, oldDoc.SubmitFormOther)
            .input('ProductName', sql.NVarChar, oldDoc.ProductName)
            .input('ProductReceiveNo', sql.NVarChar, oldDoc.ProductReceiveNo)
            .input('SubmitterIsOr', sql.Bit, oldDoc.SubmitterIsOr)
            .input('ProductNameAlt', sql.NVarChar, oldDoc.ProductNameAlt)
            .input('HasRegNo', sql.Bit, oldDoc.HasRegNo)
            .input('HasRegDetail', sql.Bit, oldDoc.HasRegDetail)
            .input('HasNoticeNo', sql.Bit, oldDoc.HasNoticeNo)
            .input('RegNoticeNo', sql.NVarChar, oldDoc.RegNoticeNo)
            
            .input('GranteePrefix', sql.NVarChar, oldDoc.GranteePrefix)
            .input('GranteeName', sql.NVarChar, oldDoc.GranteeName)
            .input('GranteeAge', sql.Int, oldDoc.GranteeAge)
            .input('GranteeCitizenID', sql.NVarChar, oldDoc.GranteeCitizenID)
            .input('GranteeIDExpiryDate', sql.Date, oldDoc.GranteeIDExpiryDate)
            .input('GranteeAddressNo', sql.NVarChar, oldDoc.GranteeAddressNo)
            .input('GranteeMoo', sql.NVarChar, oldDoc.GranteeMoo)
            .input('GranteeSoi', sql.NVarChar, oldDoc.GranteeSoi)
            .input('GranteeRoad', sql.NVarChar, oldDoc.GranteeRoad)
            .input('GranteeSubDistrict', sql.NVarChar, oldDoc.GranteeSubDistrict)
            .input('GranteeDistrict', sql.NVarChar, oldDoc.GranteeDistrict)
            .input('GranteeProvince', sql.NVarChar, oldDoc.GranteeProvince)
            .input('GranteePhone', sql.NVarChar, oldDoc.GranteePhone)
            .input('GranteeEmail', sql.NVarChar, oldDoc.GranteeEmail)
            
            .input('ScopeSubmit', sql.Bit, oldDoc.ScopeSubmit)
            .input('ScopeAmend', sql.Bit, oldDoc.ScopeAmend)
            .input('ScopeAll', sql.Bit, oldDoc.ScopeAll)
            .input('ScopeStartDate', sql.Date, oldDoc.ScopeStartDate)
            .input('ScopeOther', sql.NVarChar, oldDoc.ScopeOther)
            .input('ScopeStartDay', sql.NVarChar, oldDoc.ScopeStartDay)
            .input('ScopeStartMonth', sql.NVarChar, oldDoc.ScopeStartMonth)
            .input('ScopeStartYear', sql.NVarChar, oldDoc.ScopeStartYear)
            
            .input('AttachLicenseCopy', sql.Bit, oldDoc.AttachLicenseCopy)
            .input('GrantorSignName', sql.NVarChar, oldDoc.GrantorSignName)
            .input('GranteeSignName', sql.NVarChar, oldDoc.GranteeSignName)
            .input('Witness1Name', sql.NVarChar, oldDoc.Witness1Name)
            .input('Witness2Name', sql.NVarChar, oldDoc.Witness2Name)
            
            .input('Version', sql.Int, newVersion)
            .input('RefDocumentID', sql.Int, oldDoc.DocumentID)
            .input('Status', sql.NVarChar, 'ร่าง') // Reset to draft
            .query(`
                INSERT INTO LegalDocuments (
                    DocumentNo, WrittenAt, DocumentDate, DocumentType, ContractID,
                    GrantorType, GrantorName, GrantorCitizenID, GrantorCitizenIDExpiryDate, GrantorJuristicID, LicenseNo, JuristicIDExpiryDate,
                    OperatorPrefix, OperatorName, OperatorCitizenID, OperatorIDExpiryDate,
                    EstablishmentName, EstAddressNo, EstBuilding, EstMoo, EstSoi, EstRoad, EstSubDistrict, EstDistrict, EstProvince, EstPostcode, EstPhone, EstFax, EstEmail,
                    IsProducer, IsImporter, ProdTypeHerbalMedicine, ProdTypeTraditionalMed, ProdTypeDevMed, ProdTypeHealthProduct, ProdTypeCosmetic, ProdTypeDetail,
                    RequestType, ReqTypeRegister, ReqTypeNotifyDetail, ReqTypeNotify, ReqTypeRenew, 
                    SubmitterIsIn, SubmitFormType, SubmitFormTypeAmend, SubmitFormTypeReplace, SubmitFormTypeOtherCheck, SubmitFormOther, 
                    ProductName, ProductReceiveNo, SubmitterIsOr, ProductNameAlt, HasRegNo, HasRegDetail, HasNoticeNo,
                    GranteePrefix, GranteeName, GranteeAge, GranteeCitizenID, GranteeIDExpiryDate, GranteeAddressNo, GranteeMoo, GranteeSoi, GranteeRoad, GranteeSubDistrict, GranteeDistrict, GranteeProvince, GranteePhone, GranteeEmail,
                    ScopeSubmit, ScopeAmend, ScopeAll, ScopeStartDate, ScopeOther, ScopeStartDay, ScopeStartMonth, ScopeStartYear,
                    AttachLicenseCopy, GrantorSignName, GranteeSignName, Witness1Name, Witness2Name,
                    Version, RefDocumentID, Status, CreatedAt, UpdatedAt
                ) OUTPUT INSERTED.DocumentID
                VALUES (
                    @DocumentNo, @WrittenAt, @DocumentDate, @DocumentType, @ContractID,
                    @GrantorType, @GrantorName, @GrantorCitizenID, @GrantorCitizenIDExpiryDate, @GrantorJuristicID, @LicenseNo, @JuristicIDExpiryDate,
                    @OperatorPrefix, @OperatorName, @OperatorCitizenID, @OperatorIDExpiryDate,
                    @EstablishmentName, @EstAddressNo, @EstBuilding, @EstMoo, @EstSoi, @EstRoad, @EstSubDistrict, @EstDistrict, @EstProvince, @EstPostcode, @EstPhone, @EstFax, @EstEmail,
                    @IsProducer, @IsImporter, @ProdTypeHerbalMedicine, @ProdTypeTraditionalMed, @ProdTypeDevMed, @ProdTypeHealthProduct, @ProdTypeCosmetic, @ProdTypeDetail,
                    @RequestType, @ReqTypeRegister, @ReqTypeNotifyDetail, @ReqTypeNotify, @ReqTypeRenew,
                    @SubmitterIsIn, @SubmitFormType, @SubmitFormTypeAmend, @SubmitFormTypeReplace, @SubmitFormTypeOtherCheck, @SubmitFormOther,
                    @ProductName, @ProductReceiveNo, @SubmitterIsOr, @ProductNameAlt, @HasRegNo, @HasRegDetail, @HasNoticeNo,
                    @GranteePrefix, @GranteeName, @GranteeAge, @GranteeCitizenID, @GranteeIDExpiryDate, @GranteeAddressNo, @GranteeMoo, @GranteeSoi, @GranteeRoad, @GranteeSubDistrict, @GranteeDistrict, @GranteeProvince, @GranteePhone, @GranteeEmail,
                    @ScopeSubmit, @ScopeAmend, @ScopeAll, @ScopeStartDate, @ScopeOther, @ScopeStartDay, @ScopeStartMonth, @ScopeStartYear,
                    @AttachLicenseCopy, @GrantorSignName, @GranteeSignName, @Witness1Name, @Witness2Name,
                    @Version, @RefDocumentID, @Status, GETDATE(), GETDATE()
                )
            `);

        res.json({ success: true, message: 'New version created successfully', documentId: insertResult.recordset[0].DocumentID, version: newVersion });
    } catch (err) {
        console.error('Error creating new version:', err);
        res.status(500).json({ success: false, message: 'Server error creating new version', error: err.message });
    }
});

// POST upload signed document attachment
router.post('/upload/:documentNo', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const pool = await poolPromise;
        const { documentNo } = req.params;
        const { receivedDate, receiverName, remarks } = req.body;

        // 1. Insert into LegalDocumentAttachments
        await pool.request()
            .input('DocumentNo', sql.NVarChar, documentNo)
            .input('FileName', sql.NVarChar, req.file.originalname)
            .input('FilePath', sql.NVarChar, '/uploads/legal_documents/' + req.file.filename)
            .input('ReceivedDate', sql.Date, receivedDate || null)
            .input('ReceiverName', sql.NVarChar, receiverName || null)
            .input('Remarks', sql.NVarChar, remarks || null)
            .query(`
                INSERT INTO LegalDocumentAttachments (DocumentNo, FileName, FilePath, ReceivedDate, ReceiverName, Remarks)
                VALUES (@DocumentNo, @FileName, @FilePath, @ReceivedDate, @ReceiverName, @Remarks)
            `);

        // 2. Update status to 'ลูกค้าลงนามแล้ว' (Signed) in LegalDocuments
        // We update all versions of this document to keep it consistent
        await pool.request()
            .input('DocumentNo', sql.NVarChar, documentNo)
            .input('Status', sql.NVarChar, 'ลูกค้าลงนามแล้ว')
            .query(`
                UPDATE LegalDocuments 
                SET Status = @Status, UpdatedAt = GETDATE()
                WHERE DocumentNo = @DocumentNo
            `);

        res.json({ success: true, message: 'File uploaded and status updated successfully' });
    } catch (err) {
        console.error('Error uploading legal document attachment:', err);
        res.status(500).json({ success: false, message: 'Server error uploading file', error: err.message });
    }
});

// GET attachments for a document
router.get('/attachments/:documentNo', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { documentNo } = req.params;
        const result = await pool.request()
            .input('DocumentNo', sql.NVarChar, documentNo)
            .query(`
                SELECT AttachmentID, FileName, FilePath, ReceivedDate, ReceiverName, Remarks, UploadedAt
                FROM LegalDocumentAttachments
                WHERE DocumentNo = @DocumentNo
                ORDER BY UploadedAt DESC
            `);
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching document attachments:', err);
        res.status(500).json({ success: false, message: 'Server error fetching attachments', error: err.message });
    }
});

// DELETE attachment
router.delete('/attachments/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        
        // Optionally, we could delete the physical file here using fs.unlink
        // but for now we just remove the database record.
        const result = await pool.request()
            .input('AttachmentID', sql.Int, id)
            .query(`
                DELETE FROM LegalDocumentAttachments
                WHERE AttachmentID = @AttachmentID
            `);
            
        if (result.rowsAffected[0] > 0) {
            res.json({ success: true, message: 'Attachment deleted successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Attachment not found' });
        }
    } catch (err) {
        console.error('Error deleting attachment:', err);
        res.status(500).json({ success: false, message: 'Server error deleting attachment', error: err.message });
    }
});

module.exports = router;
