const { poolPromise } = require('./config/db');
const sql = require('mssql');

const data = { documentType: 'poa' };

poolPromise.then(pool => {
    pool.request()
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
        `)
        .then(res => {
            console.log("Success:", res.recordset);
            process.exit(0);
        })
        .catch(err => {
            console.error("SQL Error:", err.message);
            process.exit(1);
        });
});
