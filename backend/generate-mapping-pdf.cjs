const puppeteer = require('puppeteer');

(async () => {
    const html = `
    <html>
    <head>
    <meta charset='utf-8'>
    <style>
        body { font-family: 'Sarabun', 'Tahoma', sans-serif; padding: 20px; }
        h1 { color: #333; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; color: #333; }
        h2 { margin-top: 30px; color: #444; font-size: 18px; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
    </style>
    </head>
    <body>
        <h1>ตารางจับคู่ฟิลด์ข้อมูล (Field Mapping) - หนังสือมอบอำนาจ</h1>
        
        <h2>1. ข้อมูลเอกสาร (Document Info)</h2>
        <table>
            <tr><th>หัวข้อในหน้าจอ (Form Label)</th><th>ชื่อช่องตัวแปร (Field Name / DB Column)</th><th>ประเภทข้อมูล (Type)</th></tr>
            <tr><td>อ้างอิงสัญญา</td><td>ContractID</td><td>ตัวเลข (Int)</td></tr>
            <tr><td>เขียนที่</td><td>WrittenAt</td><td>ข้อความ (String)</td></tr>
            <tr><td>วันที่เอกสาร</td><td>DocumentDate</td><td>วันที่ (Date)</td></tr>
        </table>

        <h2>2. ข้อมูลผู้รับอนุญาต (ผู้มอบอำนาจ - Grantor)</h2>
        <table>
            <tr><th>หัวข้อในหน้าจอ (Form Label)</th><th>ชื่อช่องตัวแปร (Field Name / DB Column)</th><th>ประเภทข้อมูล (Type)</th></tr>
            <tr><td>ใบอนุญาตเลขที่</td><td>LicenseNo</td><td>ข้อความ (String)</td></tr>
            <tr><td>ชื่อผู้รับอนุญาต (บุคคล/นิติบุคคล)</td><td>GrantorName</td><td>ข้อความ (String)</td></tr>
            <tr><td>ประเภทบุคคล (บุคคลธรรมดา/นิติบุคคล)</td><td>GrantorType</td><td>ข้อความ ('natural' / 'juristic')</td></tr>
            <tr><td>เลขประจำตัวประชาชน (ผู้รับอนุญาต)</td><td>GrantorCitizenID</td><td>ข้อความ 13 หลัก (String)</td></tr>
            <tr><td>บัตรประชาชนหมดอายุ (บุคคลธรรมดา)</td><td>GrantorCitizenIDExpiryDate</td><td>วันที่ (Date)</td></tr>
            <tr><td>ทะเบียนนิติบุคคลเลขที่</td><td>GrantorJuristicID</td><td>ข้อความ 13 หลัก (String)</td></tr>
            <tr><td>คำนำหน้าชื่อผู้ดำเนินกิจการ</td><td>OperatorPrefix</td><td>ข้อความ (String)</td></tr>
            <tr><td>ชื่อผู้ดำเนินกิจการ</td><td>OperatorName</td><td>ข้อความ (String)</td></tr>
            <tr><td>เลขประจำตัวประชาชน (ผู้ดำเนินกิจการ)</td><td>OperatorCitizenID</td><td>ข้อความ 13 หลัก (String)</td></tr>
            <tr><td>บัตรหมดอายุวันที่</td><td>OperatorIDExpiryDate</td><td>วันที่ (Date)</td></tr>
            <tr><td>ชื่อสถานที่</td><td>EstablishmentName</td><td>ข้อความ (String)</td></tr>
            <tr><td>อยู่เลขที่ (ที่อยู่)</td><td>EstAddressNo</td><td>ข้อความ (String)</td></tr>
            <tr><td>หมู่ที่</td><td>EstMoo</td><td>ข้อความ (String)</td></tr>
            <tr><td>ตรอก/ซอย</td><td>EstSoi</td><td>ข้อความ (String)</td></tr>
            <tr><td>ถนน</td><td>EstRoad</td><td>ข้อความ (String)</td></tr>
            <tr><td>ตำบล/แขวง</td><td>EstSubDistrict</td><td>ข้อความ (String)</td></tr>
            <tr><td>อำเภอ/เขต</td><td>EstDistrict</td><td>ข้อความ (String)</td></tr>
            <tr><td>จังหวัด</td><td>EstProvince</td><td>ข้อความ (String)</td></tr>
            <tr><td>รหัสไปรษณีย์</td><td>EstPostcode</td><td>ข้อความ (String)</td></tr>
            <tr><td>โทรศัพท์</td><td>EstPhone</td><td>ข้อความ (String)</td></tr>
            <tr><td>โทรสาร (Fax)</td><td>EstFax</td><td>ข้อความ (String)</td></tr>
            <tr><td>อีเมล (E-mail)</td><td>EstEmail</td><td>ข้อความ (String)</td></tr>
            <tr><td>เป็นผู้รับอนุญาต (ผลิต / นำเข้า)</td><td>IsProducer / IsImporter</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>ประเภทผลิตภัณฑ์ (สมุนไพร/ยา/เวชสำอาง ฯลฯ)</td><td>ProdTypeHerbalFood, ProdTypeTraditionalMed, ...</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>อื่นๆ (ระบุรายละเอียด)</td><td>ProdTypeDetail</td><td>ข้อความ (String)</td></tr>
        </table>

        <h2>3. ขอบเขตและประเภทคำขอ (Request Type & Product Details)</h2>
        <table>
            <tr><th>หัวข้อในหน้าจอ (Form Label)</th><th>ชื่อช่องตัวแปร (Field Name / DB Column)</th><th>ประเภทข้อมูล (Type)</th></tr>
            <tr><td>ยื่นคำขอขึ้นทะเบียน (ใน/หรือ)</td><td>SubmitterIsIn / SubmitterIsOr</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>คำขอขึ้นทะเบียนฯ (ทบ.๑)</td><td>ReqTypeRegister</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>คำขอแจ้งรายละเอียดฯ (จร.๑)</td><td>ReqTypeNotifyDetail</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>คำขอจดแจ้ง (จจ. ๑)</td><td>ReqTypeNotify</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>คำขอต่ออายุ (ตอ.)</td><td>ReqTypeRenew</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>คำขอแก้ไขเปลี่ยนแปลงฯ (ทบ.3 / จร.3 / จจ.3)</td><td>SubmitFormTypeAmend</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>คำขอใบแทน (บท)</td><td>SubmitFormTypeReplace</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>อื่นๆ (ติ๊กถูก)</td><td>SubmitFormTypeOtherCheck</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>แบบฟอร์มอื่นๆ (ระบุข้อความ)</td><td>SubmitFormOther</td><td>ข้อความ (String)</td></tr>
            <tr><td>ชื่อผลิตภัณฑ์ (ภาษาไทย/อังกฤษ)</td><td>ProductName</td><td>ข้อความ (String)</td></tr>
            <tr><td>ชื่อผลิตภัณฑ์ (อีกช่อง)</td><td>ProductNameAlt</td><td>ข้อความ (String)</td></tr>
            <tr><td>เลขรับที่ (ถ้ามี)</td><td>ProductReceiveNo</td><td>ข้อความ (String)</td></tr>
            <tr><td>ทะเบียนเลขที่ (มี/ไม่มี)</td><td>HasRegNo</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>เลขทะเบียน (RegNo)</td><td>RegNo</td><td>ข้อความ (String)</td></tr>
            <tr><td>ใบรับจดแจ้งเลขที่ (มี/ไม่มี)</td><td>HasRegDetail</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>เลขรับจดแจ้ง (RegDetailNo)</td><td>RegDetailNo</td><td>ข้อความ (String)</td></tr>
            <tr><td>ใบรับแจ้งรายละเอียดเลขที่ (มี/ไม่มี)</td><td>HasNoticeNo</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>เลขรับแจ้งรายละเอียด (RegNoticeNo)</td><td>RegNoticeNo</td><td>ข้อความ (String)</td></tr>
        </table>

        <h2>4. ผู้รับมอบอำนาจ (Grantee)</h2>
        <table>
            <tr><th>หัวข้อในหน้าจอ (Form Label)</th><th>ชื่อช่องตัวแปร (Field Name / DB Column)</th><th>ประเภทข้อมูล (Type)</th></tr>
            <tr><td>คำนำหน้าชื่อ</td><td>GranteePrefix</td><td>ข้อความ (String)</td></tr>
            <tr><td>ชื่อผู้รับมอบอำนาจ</td><td>GranteeName</td><td>ข้อความ (String)</td></tr>
            <tr><td>อายุ (ปี)</td><td>GranteeAge</td><td>ตัวเลข (Int)</td></tr>
            <tr><td>เลขประจำตัวประชาชน</td><td>GranteeCitizenID</td><td>ข้อความ 13 หลัก (String)</td></tr>
            <tr><td>บัตรหมดอายุวันที่</td><td>GranteeIDExpiryDate</td><td>วันที่ (Date)</td></tr>
            <tr><td>อยู่เลขที่ (ที่อยู่ผู้รับมอบ)</td><td>GranteeAddressNo</td><td>ข้อความ (String)</td></tr>
            <tr><td>หมู่ที่</td><td>GranteeMoo</td><td>ข้อความ (String)</td></tr>
            <tr><td>ตรอก/ซอย</td><td>GranteeSoi</td><td>ข้อความ (String)</td></tr>
            <tr><td>ถนน</td><td>GranteeRoad</td><td>ข้อความ (String)</td></tr>
            <tr><td>ตำบล/แขวง</td><td>GranteeSubDistrict</td><td>ข้อความ (String)</td></tr>
            <tr><td>อำเภอ/เขต</td><td>GranteeDistrict</td><td>ข้อความ (String)</td></tr>
            <tr><td>จังหวัด</td><td>GranteeProvince</td><td>ข้อความ (String)</td></tr>
            <tr><td>โทรศัพท์</td><td>GranteePhone</td><td>ข้อความ (String)</td></tr>
            <tr><td>อีเมล (E-mail)</td><td>GranteeEmail</td><td>ข้อความ (String)</td></tr>
        </table>

        <h2>5. ประเภทผลิตภัณฑ์สมุนไพร</h2>
        <table>
            <tr><th>หัวข้อในหน้าจอ (Form Label)</th><th>ชื่อช่องตัวแปร (Field Name / DB Column)</th><th>ประเภทข้อมูล (Type)</th></tr>
            <tr><td>ยาจากสมุนไพร : ประเภท</td><td>ProdTypeHerbalMedicine</td><td>Checkbox (Boolean)</td></tr>
            <tr><td> - ยาแผนไทย/ยาตามองค์ความรู้การแพทย์ทางเลือก</td><td>ProdTypeTraditionalMed</td><td>Checkbox (Boolean)</td></tr>
            <tr><td> - ยาพัฒนาจากสมุนไพร</td><td>ProdTypeDevMed</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>ผลิตภัณฑ์สมุนไพรเพื่อสุขภาพ</td><td>ProdTypeHealthProduct</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>เวชสำอางสมุนไพร</td><td>ProdTypeCosmetic</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>ประเภท (ระบุเพิ่มเติม)</td><td>ProdTypeDetail</td><td>ข้อความ (String)</td></tr>
        </table>

        <h2>6. ขอบเขตการมอบอำนาจและลายเซ็น (Scope & Signatures)</h2>
        <table>
            <tr><th>หัวข้อในหน้าจอ (Form Label)</th><th>ชื่อช่องตัวแปร (Field Name / DB Column)</th><th>ประเภทข้อมูล (Type)</th></tr>
            <tr><td>1. ยื่นคำขอต่างๆ</td><td>ScopeSubmit</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>2. การแก้ไข การชี้แจง ฯลฯ</td><td>ScopeAmend</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>อื่นๆ (ระบุ) (ใต้ข้อ 2)</td><td>ScopeOther</td><td>ข้อความ (String)</td></tr>
            <tr><td>3. ยอมรับผิดชอบและมีผลผูกพันทุกประการ</td><td>ScopeAll</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>ตั้งแต่วันที่ (แบบเต็ม yyyy-mm-dd)</td><td>ScopeStartDate</td><td>วันที่ (Date)</td></tr>
            <tr><td>ตั้งแต่วันที่ (เฉพาะวันที่ เช่น 12)</td><td>ScopeStartDay</td><td>ข้อความ (String)</td></tr>
            <tr><td>เดือน (เฉพาะเดือน เช่น พฤษภาคม)</td><td>ScopeStartMonth</td><td>ข้อความ (String)</td></tr>
            <tr><td>พ.ศ. (เฉพาะปี พ.ศ. เช่น 2567)</td><td>ScopeStartYear</td><td>ข้อความ (String)</td></tr>
            <tr><td>แนบสำเนาใบอนุญาต</td><td>AttachLicenseCopy</td><td>Checkbox (Boolean)</td></tr>
            <tr><td>ลายเซ็นผู้มอบอำนาจ (ชื่อเต็ม)</td><td>GrantorSignName</td><td>ข้อความ (String)</td></tr>
            <tr><td>ลายเซ็นผู้รับมอบอำนาจ (ชื่อเต็ม)</td><td>GranteeSignName</td><td>ข้อความ (String)</td></tr>
            <tr><td>ลายเซ็นพยานคนที่ 1 (ชื่อเต็ม)</td><td>Witness1Name</td><td>ข้อความ (String)</td></tr>
            <tr><td>ลายเซ็นพยานคนที่ 2 (ชื่อเต็ม)</td><td>Witness2Name</td><td>ข้อความ (String)</td></tr>
        </table>
    </body>
    </html>
    `;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: 'C:\\\\Users\\\\thaih\\\\OneDrive\\\\เอกสาร\\\\GitHub\\\\erp_project\\\\FieldMapping_PowerOfAttorney.pdf', format: 'A4', printBackground: true });
    await browser.close();
    console.log('PDF Created Successfully at Desktop');
})();
