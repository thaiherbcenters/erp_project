/**
 * thaiBahtConverter.js — แปลงตัวเลขเป็นจำนวนเงินตัวอักษรภาษาไทย (Thai Baht Text)
 * รองรับหลักหน่วยถึงหลักล้านล้าน และเศษสตางค์อย่างถูกต้องตามหลักภาษาไทย
 */

const THAI_NUMBERS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_DIGIT_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

/**
 * แปลงตัวเลขจำนวนเต็มเฉพาะกลุ่ม 6 หลัก (0 - 999,999)
 */
function convertGroup(numberStr) {
    let result = '';
    const len = numberStr.length;

    for (let i = 0; i < len; i++) {
        const digit = parseInt(numberStr.charAt(i), 10);
        const pos = len - i - 1; // 0 = หน่วย, 1 = สิบ, 2 = ร้อย, ...

        if (digit !== 0) {
            if (pos === 0 && digit === 1 && len > 1) {
                // หลักหน่วยเป็น 1 ในเลขหลายหลัก -> "เอ็ด"
                result += 'เอ็ด';
            } else if (pos === 1 && digit === 2) {
                // หลักสิบเป็น 2 -> "ยี่สิบ"
                result += 'ยี่' + THAI_DIGIT_UNITS[pos];
            } else if (pos === 1 && digit === 1) {
                // หลักสิบเป็น 1 -> "สิบ" (ไม่ต้องมี "หนึ่ง")
                result += THAI_DIGIT_UNITS[pos];
            } else {
                result += THAI_NUMBERS[digit] + THAI_DIGIT_UNITS[pos];
            }
        }
    }
    return result;
}

/**
 * แปลงตัวเลขจำนวนเต็มขนาดไม่จำกัด (แบ่งกลุ่มละ 6 หลักสำหรับ "ล้าน")
 */
function convertInteger(numberStr) {
    numberStr = numberStr.replace(/^0+/, '');
    if (!numberStr) return 'ศูนย์';

    let result = '';
    let remaining = numberStr;

    const groups = [];
    while (remaining.length > 0) {
        if (remaining.length > 6) {
            groups.unshift(remaining.slice(-6));
            remaining = remaining.slice(0, -6);
        } else {
            groups.unshift(remaining);
            remaining = '';
        }
    }

    for (let g = 0; g < groups.length; g++) {
        const groupText = convertGroup(groups[g]);
        if (groupText) {
            result += groupText;
            const millionsCount = groups.length - 1 - g;
            for (let m = 0; m < millionsCount; m++) {
                result += 'ล้าน';
            }
        }
    }

    return result || 'ศูนย์';
}

/**
 * แปลงตัวเลขเป็นข้อความภาษาไทย
 * @param {number|string} amount จำนวนเงิน (เช่น 150000 หรือ 150000.50)
 * @param {object} options ตัวเลือกการจัดรูปแบบ { prefix: '**', suffix: '**' }
 * @returns {string} เช่น "**หนึ่งแสนห้าหมื่นบาทถ้วน**"
 */
export function numberToThaiBaht(amount, options = {}) {
    if (amount === undefined || amount === null || amount === '') {
        return '';
    }

    const cleanNum = String(amount).replace(/,/g, '').trim();
    if (isNaN(cleanNum)) {
        return '';
    }

    const num = parseFloat(cleanNum);
    if (num === 0) {
        const prefix = options.prefix || '';
        const suffix = options.suffix || '';
        return `${prefix}ศูนย์บาทถ้วน${suffix}`;
    }

    const parts = Math.abs(num).toFixed(2).split('.');
    const integerPart = parts[0];
    const satangPart = parts[1];

    let thaiText = '';

    const bahtText = convertInteger(integerPart);
    if (bahtText !== 'ศูนย์') {
        thaiText += bahtText + 'บาท';
    } else if (satangPart === '00') {
        thaiText += 'ศูนย์บาท';
    }

    const satangVal = parseInt(satangPart, 10);
    if (satangVal === 0) {
        thaiText += 'ถ้วน';
    } else {
        const satangText = convertGroup(satangPart);
        thaiText += satangText + 'สตางค์';
    }

    const prefix = options.prefix !== undefined ? options.prefix : '**';
    const suffix = options.suffix !== undefined ? options.suffix : '**';

    return `${prefix}${thaiText}${suffix}`;
}

/**
 * ฟอร์แมตตัวเลขพร้อมเครื่องหมายจุลภาคและสตาร์สำหรับพิมพ์เช็ค
 * เช่น 150000 -> "**150,000.00**"
 */
export function formatChequeAmount(amount, options = {}) {
    if (amount === undefined || amount === null || amount === '') return '';
    const cleanNum = String(amount).replace(/,/g, '').trim();
    if (isNaN(cleanNum)) return '';

    const num = parseFloat(cleanNum);
    const formatted = num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const prefix = options.prefix !== undefined ? options.prefix : '**';
    const suffix = options.suffix !== undefined ? options.suffix : '**';

    return `${prefix}${formatted}${suffix}`;
}

export default numberToThaiBaht;
