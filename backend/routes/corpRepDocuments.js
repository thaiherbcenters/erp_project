const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../config/db');

// GET all Corp Rep Documents
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT * FROM CorpRepDocuments 
            ORDER BY CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching corp rep documents:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET by ID
router.get('/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`SELECT * FROM CorpRepDocuments WHERE documentId = @id`);
            
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching corp rep document:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST (Create)
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        const pool = await poolPromise;
        
        const request = pool.request();
        
        request
            .input('contractId', sql.Int, data.contractId || null)
            .input('customerId', sql.Int, data.customerId || null)
            .input('WrittenAt', sql.NVarChar, data.writtenAt || null)
            .input('DocumentDate', sql.Date, data.documentDate || null)
            .input('JuristicName', sql.NVarChar, data.juristicName || null)
            .input('JuristicRegNo', sql.NVarChar, data.juristicRegNo || null)
            .input('JuristicRegDate', sql.Date, data.juristicRegDate || null)
            .input('OfficeAddrNo', sql.NVarChar, data.officeAddrNo || null)
            .input('OfficeBuilding', sql.NVarChar, data.officeBuilding || null)
            .input('OfficeMoo', sql.NVarChar, data.officeMoo || null)
            .input('OfficeSoi', sql.NVarChar, data.officeSoi || null)
            .input('OfficeRoad', sql.NVarChar, data.officeRoad || null)
            .input('OfficeSubDistrict', sql.NVarChar, data.officeSubDistrict || null)
            .input('OfficeDistrict', sql.NVarChar, data.officeDistrict || null)
            .input('OfficeProvince', sql.NVarChar, data.officeProvince || null)
            .input('OfficeZip', sql.NVarChar, data.officeZip || null)
            .input('OfficePhone', sql.NVarChar, data.officePhone || null)
            .input('OfficeFax', sql.NVarChar, data.officeFax || null)
            .input('OfficeEmail', sql.NVarChar, data.officeEmail || null)
            .input('SignatoryCount', sql.Int, data.signatoryCount || 1)
            .input('Signatory1Prefix', sql.NVarChar, data.signatory1Prefix || null)
            .input('Signatory1Name', sql.NVarChar, data.signatory1Name || null)
            .input('Signatory1IdCard', sql.NVarChar, data.signatory1IdCard || null)
            .input('Signatory1CardExpiry', sql.Date, data.signatory1CardExpiry || null)
            .input('Signatory2Prefix', sql.NVarChar, data.signatory2Prefix || null)
            .input('Signatory2Name', sql.NVarChar, data.signatory2Name || null)
            .input('Signatory2IdCard', sql.NVarChar, data.signatory2IdCard || null)
            .input('Signatory2CardExpiry', sql.Date, data.signatory2CardExpiry || null)
            .input('Signatory3Prefix', sql.NVarChar, data.signatory3Prefix || null)
            .input('Signatory3Name', sql.NVarChar, data.signatory3Name || null)
            .input('Signatory3IdCard', sql.NVarChar, data.signatory3IdCard || null)
            .input('Signatory3CardExpiry', sql.Date, data.signatory3CardExpiry || null)
            .input('ReqTypeTorBor1', sql.Bit, data.reqTypeTorBor1 ? 1 : 0)
            .input('ReqTypeJorRor1', sql.Bit, data.reqTypeJorRor1 ? 1 : 0)
            .input('ReqTypeJorJor1', sql.Bit, data.reqTypeJorJor1 ? 1 : 0)
            .input('ReqTypeTorOr', sql.Bit, data.reqTypeTorOr ? 1 : 0)
            .input('ProductName', sql.NVarChar, data.productName || null)
            .input('ReceiptNo', sql.NVarChar, data.receiptNo || null)
            .input('RepPrefix', sql.NVarChar, data.repPrefix || null)
            .input('RepName', sql.NVarChar, data.repName || null)
            .input('RepIdCard', sql.NVarChar, data.repIdCard || null)
            .input('RepCardExpiry', sql.Date, data.repCardExpiry || null)
            .input('RepAddrNo', sql.NVarChar, data.repAddrNo || null)
            .input('RepBuilding', sql.NVarChar, data.repBuilding || null)
            .input('RepMoo', sql.NVarChar, data.repMoo || null)
            .input('RepSoi', sql.NVarChar, data.repSoi || null)
            .input('RepRoad', sql.NVarChar, data.repRoad || null)
            .input('RepSubDistrict', sql.NVarChar, data.repSubDistrict || null)
            .input('RepDistrict', sql.NVarChar, data.repDistrict || null)
            .input('RepProvince', sql.NVarChar, data.repProvince || null)
            .input('RepZip', sql.NVarChar, data.repZip || null)
            .input('RepPhone', sql.NVarChar, data.repPhone || null)
            .input('RepEmail', sql.NVarChar, data.repEmail || null)
            .input('EffectiveDate', sql.Date, data.effectiveDate || null)
            .input('Status', sql.NVarChar, data.status || 'ร่าง');

        const insertQuery = `
            INSERT INTO CorpRepDocuments (
                contractId, customerId, WrittenAt, DocumentDate,
                JuristicName, JuristicRegNo, JuristicRegDate,
                OfficeAddrNo, OfficeBuilding, OfficeMoo, OfficeSoi, OfficeRoad,
                OfficeSubDistrict, OfficeDistrict, OfficeProvince, OfficeZip,
                OfficePhone, OfficeFax, OfficeEmail,
                SignatoryCount, Signatory1Prefix, Signatory1Name, Signatory1IdCard, Signatory1CardExpiry,
                Signatory2Prefix, Signatory2Name, Signatory2IdCard, Signatory2CardExpiry,
                Signatory3Prefix, Signatory3Name, Signatory3IdCard, Signatory3CardExpiry,
                ReqTypeTorBor1, ReqTypeJorRor1, ReqTypeJorJor1, ReqTypeTorOr,
                ProductName, ReceiptNo,
                RepPrefix, RepName, RepIdCard, RepCardExpiry,
                RepAddrNo, RepBuilding, RepMoo, RepSoi, RepRoad,
                RepSubDistrict, RepDistrict, RepProvince, RepZip,
                RepPhone, RepEmail, EffectiveDate, Status
            )
            OUTPUT inserted.documentId, inserted.*
            VALUES (
                @contractId, @customerId, @WrittenAt, @DocumentDate,
                @JuristicName, @JuristicRegNo, @JuristicRegDate,
                @OfficeAddrNo, @OfficeBuilding, @OfficeMoo, @OfficeSoi, @OfficeRoad,
                @OfficeSubDistrict, @OfficeDistrict, @OfficeProvince, @OfficeZip,
                @OfficePhone, @OfficeFax, @OfficeEmail,
                @SignatoryCount, @Signatory1Prefix, @Signatory1Name, @Signatory1IdCard, @Signatory1CardExpiry,
                @Signatory2Prefix, @Signatory2Name, @Signatory2IdCard, @Signatory2CardExpiry,
                @Signatory3Prefix, @Signatory3Name, @Signatory3IdCard, @Signatory3CardExpiry,
                @ReqTypeTorBor1, @ReqTypeJorRor1, @ReqTypeJorJor1, @ReqTypeTorOr,
                @ProductName, @ReceiptNo,
                @RepPrefix, @RepName, @RepIdCard, @RepCardExpiry,
                @RepAddrNo, @RepBuilding, @RepMoo, @RepSoi, @RepRoad,
                @RepSubDistrict, @RepDistrict, @RepProvince, @RepZip,
                @RepPhone, @RepEmail, @EffectiveDate, @Status
            )
        `;
        
        const result = await request.query(insertQuery);
        res.status(201).json({ success: true, documentId: result.recordset[0].documentId, data: result.recordset[0] });
    } catch (err) {
        console.error('Error creating corp rep document:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT (Update)
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const pool = await poolPromise;
        
        const request = pool.request();
        
        request
            .input('id', sql.Int, id)
            .input('contractId', sql.Int, data.contractId || null)
            .input('customerId', sql.Int, data.customerId || null)
            .input('WrittenAt', sql.NVarChar, data.writtenAt || null)
            .input('DocumentDate', sql.Date, data.documentDate || null)
            .input('JuristicName', sql.NVarChar, data.juristicName || null)
            .input('JuristicRegNo', sql.NVarChar, data.juristicRegNo || null)
            .input('JuristicRegDate', sql.Date, data.juristicRegDate || null)
            .input('OfficeAddrNo', sql.NVarChar, data.officeAddrNo || null)
            .input('OfficeBuilding', sql.NVarChar, data.officeBuilding || null)
            .input('OfficeMoo', sql.NVarChar, data.officeMoo || null)
            .input('OfficeSoi', sql.NVarChar, data.officeSoi || null)
            .input('OfficeRoad', sql.NVarChar, data.officeRoad || null)
            .input('OfficeSubDistrict', sql.NVarChar, data.officeSubDistrict || null)
            .input('OfficeDistrict', sql.NVarChar, data.officeDistrict || null)
            .input('OfficeProvince', sql.NVarChar, data.officeProvince || null)
            .input('OfficeZip', sql.NVarChar, data.officeZip || null)
            .input('OfficePhone', sql.NVarChar, data.officePhone || null)
            .input('OfficeFax', sql.NVarChar, data.officeFax || null)
            .input('OfficeEmail', sql.NVarChar, data.officeEmail || null)
            .input('SignatoryCount', sql.Int, data.signatoryCount || 1)
            .input('Signatory1Prefix', sql.NVarChar, data.signatory1Prefix || null)
            .input('Signatory1Name', sql.NVarChar, data.signatory1Name || null)
            .input('Signatory1IdCard', sql.NVarChar, data.signatory1IdCard || null)
            .input('Signatory1CardExpiry', sql.Date, data.signatory1CardExpiry || null)
            .input('Signatory2Prefix', sql.NVarChar, data.signatory2Prefix || null)
            .input('Signatory2Name', sql.NVarChar, data.signatory2Name || null)
            .input('Signatory2IdCard', sql.NVarChar, data.signatory2IdCard || null)
            .input('Signatory2CardExpiry', sql.Date, data.signatory2CardExpiry || null)
            .input('Signatory3Prefix', sql.NVarChar, data.signatory3Prefix || null)
            .input('Signatory3Name', sql.NVarChar, data.signatory3Name || null)
            .input('Signatory3IdCard', sql.NVarChar, data.signatory3IdCard || null)
            .input('Signatory3CardExpiry', sql.Date, data.signatory3CardExpiry || null)
            .input('ReqTypeTorBor1', sql.Bit, data.reqTypeTorBor1 ? 1 : 0)
            .input('ReqTypeJorRor1', sql.Bit, data.reqTypeJorRor1 ? 1 : 0)
            .input('ReqTypeJorJor1', sql.Bit, data.reqTypeJorJor1 ? 1 : 0)
            .input('ReqTypeTorOr', sql.Bit, data.reqTypeTorOr ? 1 : 0)
            .input('ProductName', sql.NVarChar, data.productName || null)
            .input('ReceiptNo', sql.NVarChar, data.receiptNo || null)
            .input('RepPrefix', sql.NVarChar, data.repPrefix || null)
            .input('RepName', sql.NVarChar, data.repName || null)
            .input('RepIdCard', sql.NVarChar, data.repIdCard || null)
            .input('RepCardExpiry', sql.Date, data.repCardExpiry || null)
            .input('RepAddrNo', sql.NVarChar, data.repAddrNo || null)
            .input('RepBuilding', sql.NVarChar, data.repBuilding || null)
            .input('RepMoo', sql.NVarChar, data.repMoo || null)
            .input('RepSoi', sql.NVarChar, data.repSoi || null)
            .input('RepRoad', sql.NVarChar, data.repRoad || null)
            .input('RepSubDistrict', sql.NVarChar, data.repSubDistrict || null)
            .input('RepDistrict', sql.NVarChar, data.repDistrict || null)
            .input('RepProvince', sql.NVarChar, data.repProvince || null)
            .input('RepZip', sql.NVarChar, data.repZip || null)
            .input('RepPhone', sql.NVarChar, data.repPhone || null)
            .input('RepEmail', sql.NVarChar, data.repEmail || null)
            .input('EffectiveDate', sql.Date, data.effectiveDate || null)
            .input('Status', sql.NVarChar, data.status || 'ร่าง');

        const updateQuery = `
            UPDATE CorpRepDocuments
            SET 
                contractId = @contractId, customerId = @customerId,
                WrittenAt = @WrittenAt, DocumentDate = @DocumentDate,
                JuristicName = @JuristicName, JuristicRegNo = @JuristicRegNo, JuristicRegDate = @JuristicRegDate,
                OfficeAddrNo = @OfficeAddrNo, OfficeBuilding = @OfficeBuilding, OfficeMoo = @OfficeMoo,
                OfficeSoi = @OfficeSoi, OfficeRoad = @OfficeRoad,
                OfficeSubDistrict = @OfficeSubDistrict, OfficeDistrict = @OfficeDistrict,
                OfficeProvince = @OfficeProvince, OfficeZip = @OfficeZip,
                OfficePhone = @OfficePhone, OfficeFax = @OfficeFax, OfficeEmail = @OfficeEmail,
                SignatoryCount = @SignatoryCount,
                Signatory1Prefix = @Signatory1Prefix, Signatory1Name = @Signatory1Name, Signatory1IdCard = @Signatory1IdCard, Signatory1CardExpiry = @Signatory1CardExpiry,
                Signatory2Prefix = @Signatory2Prefix, Signatory2Name = @Signatory2Name, Signatory2IdCard = @Signatory2IdCard, Signatory2CardExpiry = @Signatory2CardExpiry,
                Signatory3Prefix = @Signatory3Prefix, Signatory3Name = @Signatory3Name, Signatory3IdCard = @Signatory3IdCard, Signatory3CardExpiry = @Signatory3CardExpiry,
                ReqTypeTorBor1 = @ReqTypeTorBor1, ReqTypeJorRor1 = @ReqTypeJorRor1,
                ReqTypeJorJor1 = @ReqTypeJorJor1, ReqTypeTorOr = @ReqTypeTorOr,
                ProductName = @ProductName, ReceiptNo = @ReceiptNo,
                RepPrefix = @RepPrefix, RepName = @RepName, RepIdCard = @RepIdCard, RepCardExpiry = @RepCardExpiry,
                RepAddrNo = @RepAddrNo, RepBuilding = @RepBuilding, RepMoo = @RepMoo,
                RepSoi = @RepSoi, RepRoad = @RepRoad,
                RepSubDistrict = @RepSubDistrict, RepDistrict = @RepDistrict,
                RepProvince = @RepProvince, RepZip = @RepZip,
                RepPhone = @RepPhone, RepEmail = @RepEmail,
                EffectiveDate = @EffectiveDate,
                Status = @Status,
                UpdatedAt = GETDATE()
            OUTPUT inserted.*
            WHERE documentId = @id
        `;
        
        const result = await request.query(updateQuery);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
        }
        
        res.status(200).json({ success: true, documentId: id, data: result.recordset[0] });
    } catch (err) {
        console.error('Error updating corp rep document:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
