export const convertToBase = (qty, unit) => {
    if (!qty || isNaN(qty)) return 0;
    const val = parseFloat(qty);
    const u = String(unit || '').toLowerCase().trim();
    if (['กิโลกรัม', 'kg', 'kgs', 'กก.', 'ลิตร', 'l', 'liter', 'liters'].includes(u)) return val * 1000;
    if (['มิลลิกรัม', 'mg', 'มก.'].includes(u)) return val * 0.001;
    return val;
};

export const formatDynamicBatchSize = (ingredients) => {
    if (!ingredients || !ingredients.length) return "0 กรัม";
    const totalBase = ingredients.filter(i => i.type !== 'packaging').reduce((sum, ing) => sum + convertToBase(ing.qty, ing.unit), 0);
    
    if (totalBase >= 1000) {
        return (totalBase / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' กิโลกรัม';
    }
    return totalBase.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' กรัม';
};

export const getDynamicBatchSizeValue = (ingredients) => {
    if (!ingredients || !ingredients.length) return 0;
    return ingredients.filter(i => i.type !== 'packaging').reduce((sum, ing) => sum + convertToBase(ing.qty, ing.unit), 0);
};

const cleanVal = (v) => {
    if (!v || typeof v !== 'string') return '';
    const trimmed = v.trim();
    if (trimmed === '-' || trimmed === '.-' || trimmed === '.') return '';
    return trimmed;
};

export const parseAddressStringToSplit = (fullAddress) => {
    if (!fullAddress || typeof fullAddress !== 'string') {
        return { addr_no: '', addr_soi: '', addr_road: '', addr_subdistrict: '', addr_district: '', addr_province: '', addr_zip: '' };
    }
    let no = '', soi = '', road = '', sub = '', dist = '', prov = '', zip = '';
    
    const zipMatch = fullAddress.match(/\b\d{5}\b/);
    if (zipMatch) zip = zipMatch[0];
    let rem = fullAddress.replace(zip, '').trim();
    
    const provMatch = rem.match(/(จ\.|จังหวัด)\s*([^\s]+)/);
    if (provMatch) { prov = provMatch[2]; rem = rem.replace(provMatch[0], ''); }
    else {
        const bkkMatch = rem.match(/กรุงเทพมหานคร|กรุงเทพฯ|กทม\./);
        if (bkkMatch) { prov = 'กรุงเทพมหานคร'; rem = rem.replace(bkkMatch[0], ''); }
    }
    
    const distMatch = rem.match(/(อ\.|อำเภอ|เขต)\s*([^\s]+)/);
    if (distMatch) { dist = distMatch[2]; rem = rem.replace(distMatch[0], ''); }
    
    const subMatch = rem.match(/(ต\.|ตำบล|แขวง)\s*([^\s]+)/);
    if (subMatch) { sub = subMatch[2]; rem = rem.replace(subMatch[0], ''); }
    
    const roadMatch = rem.match(/(ถ\.|ถนน)\s*([^\s]+)/);
    if (roadMatch) { road = roadMatch[2]; rem = rem.replace(roadMatch[0], ''); }
    
    const soiMatch = rem.match(/(ซ\.|ซอย)\s*([^\s]+)/);
    if (soiMatch) { soi = soiMatch[2]; rem = rem.replace(soiMatch[0], ''); }
    
    no = rem.replace(/,/g, '').trim();
    if (no.endsWith('-')) no = no.slice(0, -1).trim();
    
    return { addr_no: no, addr_soi: soi, addr_road: road, addr_subdistrict: sub, addr_district: dist, addr_province: prov, addr_zip: zip };
};


export const THAI_PROVINCE_EN = {
    'กรุงเทพมหานคร': 'Bangkok',
    'กรุงเทพฯ': 'Bangkok',
    'กรุงเทพ': 'Bangkok',
    'กทม': 'Bangkok',
    'กทม.': 'Bangkok',
    'กระบี่': 'Krabi',
    'กาญจนบุรี': 'Kanchanaburi',
    'กาฬสินธุ์': 'Kalasin',
    'กำแพงเพชร': 'Kamphaeng Phet',
    'ขอนแก่น': 'Khon Kaen',
    'จันทบุรี': 'Chanthaburi',
    'ฉะเชิงเทรา': 'Chachoengsao',
    'ชลบุรี': 'Chon Buri',
    'ชัยนาท': 'Chai Nat',
    'ชัยภูมิ': 'Chaiyaphum',
    'ชุมพร': 'Chumphon',
    'เชียงราย': 'Chiang Rai',
    'เชียงใหม่': 'Chiang Mai',
    'ตรัง': 'Trang',
    'ตราด': 'Trat',
    'ตาก': 'Tak',
    'นครนายก': 'Nakhon Nayok',
    'นครปฐม': 'Nakhon Pathom',
    'นครพนม': 'Nakhon Phanom',
    'นครราชสีมา': 'Nakhon Ratchasima',
    'นครศรีธรรมราช': 'Nakhon Si Thammarat',
    'นครสวรรค์': 'Nakhon Sawan',
    'นนทบุรี': 'Nonthaburi',
    'นราธิวาส': 'Narathiwat',
    'น่าน': 'Nan',
    'บึงกาฬ': 'Bueng Kan',
    'บุรีรัมย์': 'Buri Ram',
    'ปทุมธานี': 'Pathum Thani',
    'ประจวบคีรีขันธ์': 'Prachuap Khiri Khan',
    'ปราจีนบุรี': 'Prachin Buri',
    'ปัตตานี': 'Pattani',
    'พระนครศรีอยุธยา': 'Phra Nakhon Si Ayutthaya',
    'อยุธยา': 'Phra Nakhon Si Ayutthaya',
    'พังงา': 'Phangnga',
    'พัทลุง': 'Phatthalung',
    'พิจิตร': 'Phichit',
    'พิษณุโลก': 'Phitsanulok',
    'เพชรบุรี': 'Phetchaburi',
    'เพชรบูรณ์': 'Phetchabun',
    'แพร่': 'Phrae',
    'พะเยา': 'Phayao',
    'ภูเก็ต': 'Phuket',
    'มหาสารคาม': 'Maha Sarakham',
    'มุกดาหาร': 'Mukdahan',
    'แม่ฮ่องสอน': 'Mae Hong Son',
    'ยะลา': 'Yala',
    'ยโสธร': 'Yasothon',
    'ร้อยเอ็ด': 'Roi Et',
    'ระนอง': 'Ranong',
    'ระยอง': 'Rayong',
    'ราชบุรี': 'Ratchaburi',
    'ลพบุรี': 'Lop Buri',
    'ลำปาง': 'Lampang',
    'ลำพูน': 'Lamphun',
    'เลย': 'Loei',
    'ศรีสะเกษ': 'Si Sa Ket',
    'สกลนคร': 'Sakon Nakhon',
    'สงขลา': 'Songkhla',
    'สตูล': 'Satun',
    'สมุทรปราการ': 'Samut Prakan',
    'สมุทรสงคราม': 'Samut Songkhram',
    'สมุทรสาคร': 'Samut Sakhon',
    'สระแก้ว': 'Sa Kaeo',
    'สระบุรี': 'Saraburi',
    'สิงห์บุรี': 'Sing Buri',
    'สุโขทัย': 'Sukhothai',
    'สุพรรณบุรี': 'Suphan Buri',
    'สุราษฎร์ธานี': 'Surat Thani',
    'สุรินทร์': 'Surin',
    'หนองคาย': 'Nong Khai',
    'หนองบัวลำภู': 'Nong Bua Lam Phu',
    'อ่างทอง': 'Ang Thong',
    'อำนาจเจริญ': 'Amnat Charoen',
    'อุดรธานี': 'Udon Thani',
    'อุตรดิตถ์': 'Uttaradit',
    'อุทัยธานี': 'Uthai Thani',
    'อุบลราชธานี': 'Ubon Ratchathani'
};

export const THAI_DISTRICTS_EN = {
    'ดุสิต': 'Dusit',
    'พระนคร': 'Phra Nakhon',
    'ป้อมปราบศัตรูพ่าย': 'Pom Prap Sattru Phai',
    'สัมพันธวงศ์': 'Samphanthawong',
    'พญาไท': 'Phaya Thai',
    'ธนบุรี': 'Thon Buri',
    'บางกอกใหญ่': 'Bangkok Yai',
    'ห้วยขวาง': 'Huai Khwang',
    'คลองสาน': 'Khlong San',
    'ตลิ่งชัน': 'Taling Chan',
    'บางกอกน้อย': 'Bangkok Noi',
    'บางขุนเทียน': 'Bang Khun Thian',
    'ภาษีเจริญ': 'Phasi Charoen',
    'หนองแขม': 'Nong Khaem',
    'ราษฎร์บูรณะ': 'Rat Burana',
    'บางพลัด': 'Bang Phlat',
    'ดินแดง': 'Din Daeng',
    'บึงกุ่ม': 'Bueng Kum',
    'สาทร': 'Sathon',
    'บางซื่อ': 'Bang Sue',
    'จตุจักร': 'Chatuchak',
    'บางคอแหลม': 'Bang Kho Laem',
    'ประเวศ': 'Prawet',
    'คลองเตย': 'Khlong Toei',
    'สวนหลวง': 'Suan Luang',
    'จอมทอง': 'Chom Thong',
    'ดอนเมือง': 'Don Mueang',
    'ราชเทวี': 'Ratchathewi',
    'ลาดพร้าว': 'Lat Phrao',
    'วัฒนา': 'Watthana',
    'บางแค': 'Bang Khae',
    'หลักสี่': 'Lak Si',
    'สายไหม': 'Sai Mai',
    'คันนายาว': 'Khan Na Yao',
    'สะพานสูง': 'Saphan Sung',
    'วังทองหลาง': 'Wang Thonglang',
    'คลองสามวา': 'Khlong Sam Wa',
    'บางนา': 'Bang Na',
    'ทวีวัฒนา': 'Thawi Watthana',
    'ทุ่งครุ': 'Thung Khru',
    'บางบอน': 'Bang Bon',
    'เมืองนนทบุรี': 'Mueang Nonthaburi',
    'ปากเกร็ด': 'Pak Kret',
    'บางบัวทอง': 'Bang Bua Thong',
    'บางกรวย': 'Bang Kruai',
    'ไทรม้า': 'Sai Ma',
    'สี่แยกมหานาค': 'Si Yaek Maha Nak'
};

export const getAddressParts = (data, isEn = false) => {
    if (!data) return [];

    let no = cleanVal(data.addr_no);
    let soi = cleanVal(data.addr_soi);
    let road = cleanVal(data.addr_road);
    let sub = cleanVal(data.addr_subdistrict);
    let dist = cleanVal(data.addr_district);
    let prov = cleanVal(data.addr_province);
    let zip = cleanVal(data.addr_zip);

    let hasStructured = [no, soi, road, sub, dist, prov, zip].some(v => v !== '');

    if (!hasStructured) {
        const raw = typeof data === 'string' ? data.trim() : (data.address || '').trim();
        if (!raw || raw === '-') return [];
        const parsed = parseAddressStringToSplit(raw);
        no = cleanVal(parsed.addr_no);
        soi = cleanVal(parsed.addr_soi);
        road = cleanVal(parsed.addr_road);
        sub = cleanVal(parsed.addr_subdistrict);
        dist = cleanVal(parsed.addr_district);
        prov = cleanVal(parsed.addr_province);
        zip = cleanVal(parsed.addr_zip);
        hasStructured = [no, soi, road, sub, dist, prov, zip].some(v => v !== '');
        
        if (!hasStructured) {
            return raw.split(/[ \t]+/).filter(p => p && p !== '-');
        }
    }

    const isBkk = prov.includes('กรุงเทพ') || prov.includes('กทม') || prov.toLowerCase().includes('bangkok');
    const parts = [];

    if (no) {
        let cleanNo = no.replace(/(ซ\.-|ถ\.-|ต\.-|อ\.-|จ\.-)/g, '').trim();
        if (cleanNo && cleanNo !== '-') {
            const noTokens = cleanNo.split(/[ \t]+/).filter(p => p && p !== '-');
            parts.push(...noTokens);
        }
    }
    if (soi) {
        let cleanSoi = soi.replace(/^(ซ\.|ซอย)\s*/i, '').trim();
        if (cleanSoi && cleanSoi !== '-') {
            if (isEn) {
                parts.push(cleanSoi.toLowerCase().startsWith('soi') ? cleanSoi : ('Soi ' + cleanSoi));
            } else {
                parts.push('ซอย' + cleanSoi);
            }
        }
    }
    if (road) {
        let cleanRoad = road.replace(/^(ถ\.|ถนน)\s*/i, '').trim();
        if (cleanRoad && cleanRoad !== '-') {
            if (isEn) {
                const lower = cleanRoad.toLowerCase();
                parts.push(lower.includes('rd') || lower.includes('road') ? cleanRoad : (cleanRoad + ' Rd.'));
            } else {
                parts.push('ถนน' + cleanRoad);
            }
        }
    }
    if (sub) {
        let cleanSub = sub.replace(/^(ต\.|ตำบล|แขวง)\s*/i, '').trim();
        if (cleanSub && cleanSub !== '-') {
            if (isEn) {
                const enSub = THAI_DISTRICTS_EN[cleanSub] || cleanSub;
                const lower = enSub.toLowerCase();
                parts.push(lower.includes('subdistrict') || lower.includes('khwaeng') || lower.includes('tambon') ? enSub : (enSub + (isBkk ? ' Khwaeng' : ' Subdistrict')));
            } else {
                parts.push(isBkk ? ('แขวง' + cleanSub) : ('ต.' + cleanSub));
            }
        }
    }
    if (dist) {
        let cleanDist = dist.replace(/^(อ\.|อำเภอ|เขต)\s*/i, '').trim();
        if (cleanDist && cleanDist !== '-') {
            if (isEn) {
                const enDist = THAI_DISTRICTS_EN[cleanDist] || cleanDist;
                const lower = enDist.toLowerCase();
                parts.push(lower.includes('district') || lower.includes('khet') || lower.includes('amphoe') ? enDist : (enDist + (isBkk ? ' Khet' : ' District')));
            } else {
                parts.push(isBkk ? ('เขต' + cleanDist) : ('อ.' + cleanDist));
            }
        }
    }
    if (prov) {
        let cleanProv = prov.replace(/^(จ\.|จังหวัด)\s*/i, '').trim();
        if (cleanProv && cleanProv !== '-') {
            if (isEn) {
                const enProv = THAI_PROVINCE_EN[cleanProv] || cleanProv;
                parts.push(enProv);
            } else {
                parts.push(isBkk ? cleanProv : ('จ.' + cleanProv));
            }
        }
    }
    if (zip && zip !== '-') parts.push(zip);
    if (isEn && (prov || zip)) parts.push('Thailand');

    return parts;
};

export const formatFullAddress = (data) => {
    if (!data) return '-';
    if (typeof data === 'string') return data.trim() || '-';
    const parts = getAddressParts(data);
    return parts.length > 0 ? parts.join(' ') : (data.address || '').trim() || '-';
};

// ==========================================
// English Quotation / Document Formatters
// ==========================================

export function numberToEnglishWords(amount, currency = 'Baht', subUnit = 'Satang') {
    if (amount === null || amount === undefined || isNaN(amount)) return '';
    const num = Math.round(Math.abs(amount) * 100) / 100;
    if (num === 0) return `(Zero ${currency} Only)`;

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertGroup(n) {
        let str = '';
        if (n >= 100) {
            str += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            str += tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '') + ' ';
        } else if (n > 0) {
            str += ones[n] + ' ';
        }
        return str.trim();
    }

    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);

    let words = '';
    const billions = Math.floor(integerPart / 1000000000);
    const millions = Math.floor((integerPart % 1000000000) / 1000000);
    const thousands = Math.floor((integerPart % 1000000) / 1000);
    const remainder = integerPart % 1000;

    if (billions > 0) words += convertGroup(billions) + ' Billion ';
    if (millions > 0) words += convertGroup(millions) + ' Million ';
    if (thousands > 0) words += convertGroup(thousands) + ' Thousand ';
    if (remainder > 0) words += convertGroup(remainder) + ' ';

    words = words.trim();
    if (!words) words = 'Zero';
    words += ' ' + currency;

    if (decimalPart > 0) {
        words += ' and ' + convertGroup(decimalPart) + ' ' + subUnit;
    }

    return '(' + words + ' Only)';
}

export function translateUnitToEN(unit, qty) {
    if (!unit) return 'Pcs';
    const trimmed = String(unit).trim();
    const count = parseFloat(qty);
    const isPlural = isNaN(count) || count !== 1;

    const unitMap = {
        'ชิ้น': 'Pcs',
        'กล่อง': isPlural ? 'Boxes' : 'Box',
        'ขวด': isPlural ? 'Bottles' : 'Bottle',
        'กระปุก': isPlural ? 'Jars' : 'Jar',
        'ถุง': isPlural ? 'Bags' : 'Bag',
        'ซอง': isPlural ? 'Sachets' : 'Sachet',
        'หลอด': isPlural ? 'Tubes' : 'Tube',
        'แผง': isPlural ? 'Packs' : 'Pack',
        'กิโลกรัม': 'Kg',
        'กก.': 'Kg',
        'กรัม': 'g',
        'ก.': 'g',
        'มิลลิลิตร': 'ml',
        'มล.': 'ml',
        'ลิตร': isPlural ? 'Liters' : 'Liter',
        'ชุด': isPlural ? 'Sets' : 'Set',
        'โหล': isPlural ? 'Dozens' : 'Dozen',
        'ขวด(โหล)': isPlural ? 'Dozens' : 'Dozen',
        'ลัง': isPlural ? 'Cartons' : 'Carton',
        'ม้วน': isPlural ? 'Rolls' : 'Roll',
        'แพ็ค': isPlural ? 'Packs' : 'Pack',
        'แพค': isPlural ? 'Packs' : 'Pack',
        'กระสอบ': isPlural ? 'Sacks' : 'Sack',
        'แผ่น': isPlural ? 'Sheets' : 'Sheet',
        'คัน': isPlural ? 'Units' : 'Unit',
        'เครื่อง': isPlural ? 'Units' : 'Unit',
        'ใบ': isPlural ? 'Pieces' : 'Piece',
        'เล่ม': isPlural ? 'Books' : 'Book',
        'รายการ': isPlural ? 'Items' : 'Item'
    };

    return unitMap[trimmed] || trimmed;
}

export const PRODUCT_EN_MAP = {
    // Herbal Inhalers & Balms
    'ยาดมสมุนไพร': 'Herbal Inhaler',
    'ยาดมสมุนไพร จัมโบ้': 'Herbal Inhaler (Jumbo)',
    'ยาหม่อง': 'Herbal Balm',
    'ยาน้ำมัน ขนาด 10 มล.': 'Herbal Medicated Oil 10 ml',
    'ยาน้ำมัน ขนาด 5 มล.': 'Herbal Medicated Oil 5 ml',
    'ยาน้ำมันสมุนไพร สูตรเย็น': 'Herbal Oil (Cooling Formula)',
    'ยาน้ำมันสมุนไพร สูตรร้อน': 'Herbal Oil (Warming Formula)',
    'ยาสเปรย์ผสมกระดูกไก่ดำ': 'Herbal Spray with Justicia Gendarussa',
    'ลูกประคบ': 'Herbal Compress Ball',

    // Capsules
    'แคปซูลขมิ้นชัน': 'Turmeric Capsules (Curcuma Longa)',
    'แคปซูลฟ้าทะลายโจร': 'Andrographis Paniculata Capsules',
    'แคปซูลขิง': 'Ginger Capsules',
    'แคปซูลมะขามแขก': 'Senna Alexandrina Capsules',
    'แคปซูลรางจืด': 'Thunbergia Laurifolia Capsules',
    'แคปซูลมะระขี้นก': 'Bitter Melon Capsules (Momordica Charantia)',
    'แคปซูลตรีผลา': 'Triphala Capsules',
    'แคปซูลเพชรสังฆาต': 'Cissus Quadrangularis Capsules',
    'แคปซูลประสะเจตพังคี': 'Prasa Jet Phang Khi Capsules',
    'แคปซูลสหัศธารา': 'Sahatsatara Capsules',
    'แคปซูลประสะมะแว้ง': 'Prasa Mawaeng Capsules',
    'แคปซูลปราบชมพูทวีป': 'Prap Chomphu Thawip Capsules',

    // Teas & Drinks
    'ชาอัสสัม กล่อง': 'Assam Tea (Box)',
    'ชาอัสสัม ซอง': 'Assam Tea (Sachet)',
    'ชากัญชาโสมขาว': 'Cannabis White Ginseng Tea',
    'ชากัญชา': 'Cannabis Tea',
    'น้ำผึ้ง': 'Honey',

    // Aromatics
    'เทียนหอม Aromatic กลิ่น Rose': 'Aromatic Scented Candle (Rose)',
    'เทียนหอม Aromatic กลิ่น Morning': 'Aromatic Scented Candle (Morning)',
    'เทียนหอม Aromatic กลิ่น Thai': 'Aromatic Scented Candle (Thai)',
    'น้ำมันหอมระเหย กลิ่น Rose': 'Essential Oil (Rose)',
    'น้ำมันหอมระเหย กลิ่น Morning': 'Essential Oil (Morning)',
    'น้ำมันหอมระเหย กลิ่น Thai': 'Essential Oil (Thai)'
};

export function translateProductToEN(name) {
    if (!name || typeof name !== 'string') return '';
    const trimmed = name.trim();
    if (PRODUCT_EN_MAP[trimmed]) return PRODUCT_EN_MAP[trimmed];

    for (const [thKey, enVal] of Object.entries(PRODUCT_EN_MAP)) {
        if (trimmed === thKey) return enVal;
    }

    return trimmed;
}
