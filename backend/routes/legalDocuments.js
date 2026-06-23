const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');
const { generateSequence, getDatePrefix } = require('../utils/sequence');

// GET all legal documents with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 20);
        const type = req.query.type || '';
        const offset = (page - 1) * limit;

        let whereClause = '';
        const request = pool.request();
        
        if (type) {
            whereClause = 'WHERE DocumentType = @type';
            request.input('type', sql.NVarChar, type);
        }

        // Count total
        const countResult = await request.query(`SELECT COUNT(*) as total FROM LegalDocuments ${whereClause}`);
        const total = countResult.recordset[0].total;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, limit);

        const result = await request.query(`
            SELECT DocumentID, DocumentNo, DocumentDate, DocumentType, GrantorName, GranteeName, Status, CreatedAt
            FROM LegalDocuments
            ${whereClause}
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
            .input('RegNo', sql.NVarChar, data.regNo || null)
            .input('HasRegDetail', sql.Bit, data.hasRegDetail ? 1 : 0)
            .input('RegDetailNo', sql.NVarChar, data.regDetailNo || null)
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
                    ProductName, ProductReceiveNo, SubmitterIsOr, ProductNameAlt, HasRegNo, RegNo, HasRegDetail, RegDetailNo, HasNoticeNo, RegNoticeNo,
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
                    @ProductName, @ProductReceiveNo, @SubmitterIsOr, @ProductNameAlt, @HasRegNo, @RegNo, @HasRegDetail, @RegDetailNo, @HasNoticeNo, @RegNoticeNo,
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

        const result = await pool.request()
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
            .input('RegNo', sql.NVarChar, data.regNo || null)
            .input('HasRegDetail', sql.Bit, data.hasRegDetail ? 1 : 0)
            .input('RegDetailNo', sql.NVarChar, data.regDetailNo || null)
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
                    RegNo = @RegNo,
                    HasRegDetail = @HasRegDetail,
                    RegDetailNo = @RegDetailNo,
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
            `);

        if (result.rowsAffected[0] === 0) {
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
            .query(`DELETE FROM LegalDocuments WHERE DocumentID = @DocumentID`);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ success: false, message: 'Server error deleting document' });
    }
});

module.exports = router;
