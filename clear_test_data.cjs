const fs = require('fs');
const path = require('path');

const dir = 'c:/Users/thaih/OneDrive/เอกสาร/GitHub/erp_project/src/components';
const formFiles = [
    'ContractMfgForm.jsx',
    'CorpRepForm.jsx',
    'HerbalCertForm.jsx',
    'PdpaConsentForm.jsx',
    'PowerOfAttorneyForm.jsx',
    'SafetyCertForm.jsx',
    'TorBor1Form.jsx'
];

const mockStringsToClear = [
    'TEST-001/2567', 'บริษัท ไทยเฮิร์บ จำกัด', 'บริษัท ไทยเฮิร์บเซ็นเตอร์ จำกัด',
    'บริษัท ทดสอบสมุนไพร จำกัด', 'บจก. ลูกค้าทดสอบ', 'ไทยเฮิร์บ จำกัด', 'บริษัท ทดสอบ จำกัด',
    '0105555555555', 'นายสมชาย รักษาดี', 'นายธวัช จรุงพิรวงศ์', '1100000000000',
    '3259900200422', '1234567890123', '9876543210987', 'วิสาหกิจชุมชนไทยเฮิร์บเซ็นเตอร์',
    'HB 12-1-67-1', 'นางสาวทดสอบ พยานที่หนึ่ง', 'นางสาวขวัญอารักษ์ อนุภัทรเหมรัตน์',
    '10-1-6500012345', '10-1-6500054321', 'ยาดมสมุนไพร', 'ยาหม่องสมุนไพร', 'เฮิร์บไทย',
    'ยาดมสมุนไพรตราเฮิร์บ', 'ยาดมสมุนไพร ตราเฮิร์บ', 'ยาหม่องสมุนไพรตราเฮิร์บ', 'ยาสมุนไพรไทยตราเทส',
    'ยาดมสมุนไพรตราทดสอบ', 'Thai Herb Test Brand', '12345/2567', 'ร.1234/2567',
    'นายเจ้าหน้าที่ ทดสอบ', 'นายทดสอบ บุคคลธรรมดา', 'นายสมชาย บุคคลธรรมดา', 'นายตัวแทน นิติบุคคล',
    '123', '1', '2', '6/10', '99', '111', '222', '456', 'สุขุมวิท 1', 'สุขุมวิท 2',
    'ลาดพร้าว 99', 'ซอยทดสอบ', 'ซอยบุคคล', 'ซอยออฟฟิศ', 'สุขุมวิท', 'ลาดพร้าว', 'ถนนทดสอบ',
    'ถนนบุคคล', 'ถนนออฟฟิศ', 'คลองเตย', 'พระโขนง', 'จอมพล', 'จตุจักร', 'ไทรม้า', 'เมืองนนทบุรี',
    'กรุงเทพมหานคร', 'นนทบุรี', '10110', '10900', '11000', '10000', '02-111-2222', '02-123-4567',
    '02-123-4568', '081-111-1111', '081-999-9999', '089-999-9999', '021112222', '021113333',
    '0811111111', '082-222-2222', '02-222-2222', '02-111-1111', 'test@thaiherb.com',
    'grantee@thaiherb.com', 'test@test.com', 'company@test.com', 'โรงงานไทยเฮิร์บ', 'โรงงาน',
    'ตึกเฮิร์บ', 'ตึกนาย', 'ตึกไทยเฮิร์บ', 'ตึกเทส', 'ตึกบริษัท', '35', '40', '45', 'A12345678',
    '2030-12-31', 'R87654321', '2020-05-10', 'นาย', 'นาง', 'นางสาว', 'นิติบุคคล', 'G 123/67', '1234567890',
    'นายสมชาย รักษาดี', 'นางสาวทดสอบ พยาน', 'นายขวัญอารักษ์ พยาน', 'ไทย'
];

formFiles.forEach(file => {
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    // Using a regex to find all object properties in the useState that look like mock data
    mockStringsToClear.forEach(mockStr => {
        // escape regex special characters in mockStr
        const safeMockStr = mockStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`'${safeMockStr}'`, 'g');
        content = content.replace(regex, "''");
        const regex2 = new RegExp(`"${safeMockStr}"`, 'g');
        content = content.replace(regex2, "''");
    });
    
    // Clear initialData safeJSONParse default objects if any (ContractMfgForm has them)
    content = content.replace(/safeJSONParse\(initialData\.EmployerAddress,\s*\{.*?\}\)/g, "safeJSONParse(initialData.EmployerAddress, { no: '', moo: '', soi: '', road: '', subDistrict: '', district: '', province: '', zip: '' })");
    content = content.replace(/:\s*\{\s*no:\s*'.*?',\s*moo:\s*'.*?',\s*soi:\s*'.*?',\s*road:\s*'.*?',\s*subDistrict:\s*'.*?',\s*district:\s*'.*?',\s*province:\s*'.*?',\s*zip:\s*'.*?'\s*\}/g, ": { no: '', moo: '', soi: '', road: '', subDistrict: '', district: '', province: '', zip: '' }");

    // Clear booleans in useState
    // Instead of parsing perfectly, we know some keys like reqType, authProduce etc. We can just set them to false if they are true inside useState block.
    // Actually, setting all `true` to `false` in the file might break logic. Let's do it only inside useState({ ... }) block.
    // A quick hack:
    let useStateStart = content.indexOf('useState({');
    if (useStateStart !== -1) {
        let useStateEnd = content.indexOf('});', useStateStart);
        if (useStateEnd !== -1) {
            let useStateBlock = content.substring(useStateStart, useStateEnd);
            useStateBlock = useStateBlock.replace(/:\s*true/g, ': false');
            // Clean up products array if it has test data
            useStateBlock = useStateBlock.replace(/{ id: Date.now\(\), regNo: '', brandName: '', productName: '' },\s*{ id: Date.now\(\) \+ 1, regNo: '', brandName: '', productName: '' }/g, "{ id: Date.now(), regNo: '', brandName: '', productName: '' }");
            useStateBlock = useStateBlock.replace(/{ id: Date.now\(\), name: '' }/g, "{ id: Date.now(), name: '' }");
            
            content = content.substring(0, useStateStart) + useStateBlock + content.substring(useStateEnd);
        }
    }

    fs.writeFileSync(path.join(dir, file), content, 'utf8');
    console.log(`Cleared ${file}`);
});
