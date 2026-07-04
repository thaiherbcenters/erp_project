const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { generateSequence, getDatePrefix } = require('../utils/sequence');

// GET all herbal cert documents with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;

        let whereClause = "WHERE Status != 'พรีวิว'";
        const request = pool.request();

        // Count total unique DocumentNo
        const countResult = await request.query(`SELECT COUNT(DISTINCT DocumentNo) as total FROM HerbalCertDocuments ${whereClause}`);
        const total = countResult.recordset[0].total;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);

        const result = await request.query(`
            WITH RankedDocs AS (
                SELECT DocumentID, DocumentNo, DocumentDate, DocumentType, ApplicantName, Status, CreatedAt, Version,
                       ROW_NUMBER() OVER(PARTITION BY DocumentNo ORDER BY Version DESC) as rn
                FROM HerbalCertDocuments
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
        console.error('Error fetching herbal cert documents:', err);
        res.status(500).json({ success: false, message: 'Server error fetching herbal cert documents', error: err.message });
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
                SELECT DocumentID, DocumentNo, DocumentDate, DocumentType, ApplicantName, Status, CreatedAt, Version
                FROM HerbalCertDocuments
                WHERE DocumentNo = @DocumentNo
                ORDER BY Version DESC
            `);
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error fetching document history:', err);
        res.status(500).json({ success: false, message: 'Server error fetching document history', error: err.message });
    }
});

// GET single herbal cert document
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request()
            .input('DocumentID', sql.Int, id)
            .query(`SELECT * FROM HerbalCertDocuments WHERE DocumentID = @DocumentID`);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error fetching herbal cert document:', err);
        res.status(500).json({ success: false, message: 'Server error fetching herbal cert document', error: err.message });
    }
});

// POST new herbal cert document
router.post('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const data = req.body;
        
        // Auto-cleanup: Delete 'พรีวิว' documents older than 24 hours in the background
        pool.request().query(`
            DELETE FROM HerbalCertDocuments 
            WHERE Status = 'พรีวิว' 
            AND CreatedAt < DATEADD(hour, -24, GETDATE())
        `).catch(err => console.error('Auto-cleanup error:', err));

        let finalDocumentNo = data.documentNo;
        if (!finalDocumentNo) {
            finalDocumentNo = await generateSequence(pool, 'HerbalCertDocuments', 'DocumentNo', `HBC-${getDatePrefix()}`, 3);
        }

        const result = await pool.request()
            .input('DocumentNo', sql.NVarChar, finalDocumentNo)
            .input('WrittenAt', sql.NVarChar, data.writtenAt || null)
            .input('DocumentDate', sql.Date, data.documentDate || new Date())
            .input('DocumentType', sql.NVarChar, data.documentType || 'herbal_cert')
            .input('ContractID', sql.Int, data.contractId || null)
            
            .input('ApplicantType', sql.NVarChar, data.personType || data.grantorType || null)
            .input('ApplicantName', sql.NVarChar, data.licenseeName || data.grantorName || null)
            .input('ApplicantCitizenID', sql.NVarChar, data.citizenId || data.grantorCitizenId || null)
            .input('ApplicantCitizenIDExpiryDate', sql.Date, data.citizenIdExpiry || data.grantorCitizenIdExpiryDate || null)
            .input('ApplicantJuristicID', sql.NVarChar, data.juristicId || data.grantorJuristicId || null)
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
            .input('RegNo', sql.NVarChar, data.regNo || null)
            .input('HasRegDetail', sql.Bit, data.hasRegDetail ? 1 : 0)
            .input('RegDetailNo', sql.NVarChar, data.regDetailNo || null)
            .input('HasNoticeNo', sql.Bit, data.hasNoticeNo ? 1 : 0)
            .input('RegNoticeNo', sql.NVarChar, data.regNoticeNo || null)
            
            .input('AttachLicenseCopy', sql.Bit, data.attachLicenseCopy ? 1 : 0)
            
            .input('Status', sql.NVarChar, data.status || 'ร่าง')
            .query(`
                INSERT INTO HerbalCertDocuments (
                    DocumentNo, WrittenAt, DocumentDate, DocumentType, ContractID,
                    ApplicantType, ApplicantName, ApplicantCitizenID, ApplicantCitizenIDExpiryDate, ApplicantJuristicID, LicenseNo, JuristicIDExpiryDate,
                    OperatorPrefix, OperatorName, OperatorCitizenID, OperatorIDExpiryDate,
                    EstablishmentName, EstAddressNo, EstBuilding, EstMoo, EstSoi, EstRoad, EstSubDistrict, EstDistrict, EstProvince, EstPostcode, EstPhone, EstFax, EstEmail,
                    IsProducer, IsImporter, ProdTypeHerbalMedicine, ProdTypeTraditionalMed, ProdTypeDevMed, ProdTypeHealthProduct, ProdTypeCosmetic, ProdTypeDetail,
                    RequestType, ReqTypeRegister, ReqTypeNotifyDetail, ReqTypeNotify, ReqTypeRenew, 
                    SubmitterIsIn, SubmitFormType, SubmitFormTypeAmend, SubmitFormTypeReplace, SubmitFormTypeOtherCheck, SubmitFormOther, 
                    ProductName, ProductReceiveNo, SubmitterIsOr, ProductNameAlt, HasRegNo, RegNo, HasRegDetail, RegDetailNo, HasNoticeNo, RegNoticeNo,
                    AttachLicenseCopy,
                    Status, CreatedAt, UpdatedAt
                ) OUTPUT INSERTED.DocumentID
                VALUES (
                    @DocumentNo, @WrittenAt, @DocumentDate, @DocumentType, @ContractID,
                    @ApplicantType, @ApplicantName, @ApplicantCitizenID, @ApplicantCitizenIDExpiryDate, @ApplicantJuristicID, @LicenseNo, @JuristicIDExpiryDate,
                    @OperatorPrefix, @OperatorName, @OperatorCitizenID, @OperatorIDExpiryDate,
                    @EstablishmentName, @EstAddressNo, @EstBuilding, @EstMoo, @EstSoi, @EstRoad, @EstSubDistrict, @EstDistrict, @EstProvince, @EstPostcode, @EstPhone, @EstFax, @EstEmail,
                    @IsProducer, @IsImporter, @ProdTypeHerbalMedicine, @ProdTypeTraditionalMed, @ProdTypeDevMed, @ProdTypeHealthProduct, @ProdTypeCosmetic, @ProdTypeDetail,
                    @RequestType, @ReqTypeRegister, @ReqTypeNotifyDetail, @ReqTypeNotify, @ReqTypeRenew,
                    @SubmitterIsIn, @SubmitFormType, @SubmitFormTypeAmend, @SubmitFormTypeReplace, @SubmitFormTypeOtherCheck, @SubmitFormOther,
                    @ProductName, @ProductReceiveNo, @SubmitterIsOr, @ProductNameAlt, @HasRegNo, @RegNo, @HasRegDetail, @RegDetailNo, @HasNoticeNo, @RegNoticeNo,
                    @AttachLicenseCopy,
                    @Status, GETDATE(), GETDATE()
                )
            `);

        res.json({ success: true, message: 'Document created successfully', documentId: result.recordset[0].DocumentID });
    } catch (err) {
        console.error('Error creating herbal cert document:', err);
        res.status(500).json({ success: false, message: 'Server error creating document', error: err.message });
    }
});

// PUT update herbal cert document
router.put('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const data = req.body;

        const result = await pool.request()
            .input('DocumentID', sql.Int, id)
            .input('DocumentNo', sql.NVarChar, data.documentNo || null)
            .input('WrittenAt', sql.NVarChar, data.writtenAt || null)
            .input('DocumentDate', sql.Date, data.documentDate || null)
            .input('DocumentType', sql.NVarChar, data.documentType || 'herbal_cert')
            .input('ContractID', sql.Int, data.contractId || null)
            
            .input('ApplicantType', sql.NVarChar, data.personType || data.grantorType || null)
            .input('ApplicantName', sql.NVarChar, data.licenseeName || data.grantorName || null)
            .input('ApplicantCitizenID', sql.NVarChar, data.citizenId || data.grantorCitizenId || null)
            .input('ApplicantCitizenIDExpiryDate', sql.Date, data.citizenIdExpiry || data.grantorCitizenIdExpiryDate || null)
            .input('ApplicantJuristicID', sql.NVarChar, data.juristicId || data.grantorJuristicId || null)
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
            .input('RegNo', sql.NVarChar, data.regNo || null)
            .input('HasRegDetail', sql.Bit, data.hasRegDetail ? 1 : 0)
            .input('RegDetailNo', sql.NVarChar, data.regDetailNo || null)
            .input('HasNoticeNo', sql.Bit, data.hasNoticeNo ? 1 : 0)
            .input('RegNoticeNo', sql.NVarChar, data.regNoticeNo || null)
            
            .input('AttachLicenseCopy', sql.Bit, data.attachLicenseCopy ? 1 : 0)
            
            .input('Status', sql.NVarChar, data.status || 'ร่าง')
            .query(`
                UPDATE HerbalCertDocuments SET
                    DocumentNo = @DocumentNo,
                    WrittenAt = @WrittenAt,
                    DocumentDate = @DocumentDate,
                    DocumentType = @DocumentType,
                    ContractID = @ContractID,
                    
                    ApplicantType = @ApplicantType,
                    ApplicantName = @ApplicantName,
                    ApplicantCitizenID = @ApplicantCitizenID,
                    ApplicantCitizenIDExpiryDate = @ApplicantCitizenIDExpiryDate,
                    ApplicantJuristicID = @ApplicantJuristicID,
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
                    RegNo = @RegNo,
                    HasRegDetail = @HasRegDetail,
                    RegDetailNo = @RegDetailNo,
                    HasNoticeNo = @HasNoticeNo,
                    RegNoticeNo = @RegNoticeNo,
                    
                    AttachLicenseCopy = @AttachLicenseCopy,
                    
                    Status = @Status,
                    UpdatedAt = GETDATE()
                WHERE DocumentID = @DocumentID
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        res.json({ success: true, message: 'Document updated successfully' });
    } catch (err) {
        console.error('Error updating herbal cert document:', err);
        res.status(500).json({ success: false, message: 'Server error updating document', error: err.message });
    }
});

// DELETE herbal cert document
router.delete('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const { id } = req.params;
        const result = await pool.request()
            .input('DocumentID', sql.Int, id)
            .query(`DELETE FROM HerbalCertDocuments WHERE DocumentID = @DocumentID`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }
        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (err) {
        console.error('Error deleting herbal cert document:', err);
        res.status(500).json({ success: false, message: 'Server error deleting document', error: err.message });
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
            .query(`SELECT * FROM HerbalCertDocuments WHERE DocumentID = @DocumentID`);

        if (docResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const oldDoc = docResult.recordset[0];
        
        // ค้นหาเวอร์ชันสูงสุดปัจจุบันของเอกสารเลขที่นี้
        const maxVerResult = await pool.request()
            .input('DocumentNo', sql.NVarChar, oldDoc.DocumentNo)
            .query(`SELECT MAX(Version) as maxVer FROM HerbalCertDocuments WHERE DocumentNo = @DocumentNo`);
        const newVersion = (maxVerResult.recordset[0].maxVer || 1) + 1;

        // สร้างรายการใหม่โดยก๊อปปี้ฟิลด์ที่จำเป็น (ยกเว้น DocumentID)
        const insertResult = await pool.request()
            .input('DocumentNo', sql.NVarChar, oldDoc.DocumentNo)
            .input('WrittenAt', sql.NVarChar, oldDoc.WrittenAt)
            .input('DocumentDate', sql.Date, oldDoc.DocumentDate)
            .input('DocumentType', sql.NVarChar, oldDoc.DocumentType)
            .input('ContractID', sql.Int, oldDoc.ContractID)
            
            .input('ApplicantType', sql.NVarChar, oldDoc.ApplicantType)
            .input('ApplicantName', sql.NVarChar, oldDoc.ApplicantName)
            .input('ApplicantCitizenID', sql.NVarChar, oldDoc.ApplicantCitizenID)
            .input('ApplicantCitizenIDExpiryDate', sql.Date, oldDoc.ApplicantCitizenIDExpiryDate)
            .input('ApplicantJuristicID', sql.NVarChar, oldDoc.ApplicantJuristicID)
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
            .input('RegNo', sql.NVarChar, oldDoc.RegNo)
            .input('HasRegDetail', sql.Bit, oldDoc.HasRegDetail)
            .input('RegDetailNo', sql.NVarChar, oldDoc.RegDetailNo)
            .input('HasNoticeNo', sql.Bit, oldDoc.HasNoticeNo)
            .input('RegNoticeNo', sql.NVarChar, oldDoc.RegNoticeNo)
            
            .input('AttachLicenseCopy', sql.Bit, oldDoc.AttachLicenseCopy)
            
            .input('Version', sql.Int, newVersion)
            .input('RefDocumentID', sql.Int, oldDoc.DocumentID)
            .input('Status', sql.NVarChar, 'ร่าง') // Reset to draft
            .query(`
                INSERT INTO HerbalCertDocuments (
                    DocumentNo, WrittenAt, DocumentDate, DocumentType, ContractID,
                    ApplicantType, ApplicantName, ApplicantCitizenID, ApplicantCitizenIDExpiryDate, ApplicantJuristicID, LicenseNo, JuristicIDExpiryDate,
                    OperatorPrefix, OperatorName, OperatorCitizenID, OperatorIDExpiryDate,
                    EstablishmentName, EstAddressNo, EstBuilding, EstMoo, EstSoi, EstRoad, EstSubDistrict, EstDistrict, EstProvince, EstPostcode, EstPhone, EstFax, EstEmail,
                    IsProducer, IsImporter, ProdTypeHerbalMedicine, ProdTypeTraditionalMed, ProdTypeDevMed, ProdTypeHealthProduct, ProdTypeCosmetic, ProdTypeDetail,
                    RequestType, ReqTypeRegister, ReqTypeNotifyDetail, ReqTypeNotify, ReqTypeRenew, 
                    SubmitterIsIn, SubmitFormType, SubmitFormTypeAmend, SubmitFormTypeReplace, SubmitFormTypeOtherCheck, SubmitFormOther, 
                    ProductName, ProductReceiveNo, SubmitterIsOr, ProductNameAlt, HasRegNo, RegNo, HasRegDetail, RegDetailNo, HasNoticeNo, RegNoticeNo,
                    AttachLicenseCopy,
                    Version, RefDocumentID, Status, CreatedAt, UpdatedAt
                ) OUTPUT INSERTED.DocumentID
                VALUES (
                    @DocumentNo, @WrittenAt, @DocumentDate, @DocumentType, @ContractID,
                    @ApplicantType, @ApplicantName, @ApplicantCitizenID, @ApplicantCitizenIDExpiryDate, @ApplicantJuristicID, @LicenseNo, @JuristicIDExpiryDate,
                    @OperatorPrefix, @OperatorName, @OperatorCitizenID, @OperatorIDExpiryDate,
                    @EstablishmentName, @EstAddressNo, @EstBuilding, @EstMoo, @EstSoi, @EstRoad, @EstSubDistrict, @EstDistrict, @EstProvince, @EstPostcode, @EstPhone, @EstFax, @EstEmail,
                    @IsProducer, @IsImporter, @ProdTypeHerbalMedicine, @ProdTypeTraditionalMed, @ProdTypeDevMed, @ProdTypeHealthProduct, @ProdTypeCosmetic, @ProdTypeDetail,
                    @RequestType, @ReqTypeRegister, @ReqTypeNotifyDetail, @ReqTypeNotify, @ReqTypeRenew,
                    @SubmitterIsIn, @SubmitFormType, @SubmitFormTypeAmend, @SubmitFormTypeReplace, @SubmitFormTypeOtherCheck, @SubmitFormOther,
                    @ProductName, @ProductReceiveNo, @SubmitterIsOr, @ProductNameAlt, @HasRegNo, @RegNo, @HasRegDetail, @RegDetailNo, @HasNoticeNo, @RegNoticeNo,
                    @AttachLicenseCopy,
                    @Version, @RefDocumentID, @Status, GETDATE(), GETDATE()
                )
            `);

        res.json({ success: true, message: 'New version created successfully', documentId: insertResult.recordset[0].DocumentID, version: newVersion });
    } catch (err) {
        console.error('Error creating new version:', err);
        res.status(500).json({ success: false, message: 'Server error creating new version', error: err.message });
    }
});

module.exports = router;
