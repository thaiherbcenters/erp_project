/**
 * =============================================================================
 * thaiAddress.js — ระบบค้นหาและจัดการที่อยู่ภาษาไทยแบบอัจฉริยะ (Smart Thai Address)
 * =============================================================================
 *
 * แก้ปัญหา:
 * 1. ผู้ใช้พิมพ์ "เ" 2 ตัว (เเ) แทน "แ"
 * 2. ผู้ใช้พิมพ์คำนำหน้า เช่น "ต.", "ตำบล", "ตำบอล", "อ.", "อำเภอ", "จ.", "จังหวัด"
 * 3. ผู้ใช้พิมพ์ชื่ออำเภอในช่องตำบล หรือพิมพ์สลับช่อง
 * 4. ผู้ใช้พิมพ์หลายคำ เช่น "สว่างแดนดิน สกลนคร"
 * 5. การจัดอันดับผลลัพธ์ (คำที่ขึ้นต้นด้วยคำค้นหา ต้องมาก่อนคำที่มีคำค้นอยู่ตรงกลาง)
 *
 * =============================================================================
 */

import {
    searchAddressByDistrict,
    searchAddressByAmphoe,
    searchAddressByProvince,
    searchAddressByZipcode
} from 'thai-address-database';

/**
 * ปรับข้อความค้นหาภาษาไทยให้เป็นมาตรฐาน
 */
export function normalizeThaiAddressQuery(text) {
    if (!text) return '';
    return text
        .toString()
        .trim()
        // แปลงสระเอ 2 ตัว (เเ \u0e40\u0e40) เป็นสระแอ (แ \u0e41)
        .replace(/\u0e40\u0e40/g, '\u0e41')
        // ตัดคำนำหน้าประเภทตำบล (ต., ตำบล, แขวง, ตำบอล)
        .replace(/^(ตำบล|ต\.|แขวง|ตำบอล)\s*/i, '')
        // ตัดคำนำหน้าประเภทอำเภอ (อ., อำเภอ, เขต)
        .replace(/^(อำเภอ|อ\.|เขต)\s*/i, '')
        // ตัดคำนำหน้าประเภทจังหวัด (จ., จังหวัด)
        .replace(/^(จังหวัด|จ\.)\s*/i, '')
        // ตัดคำนำหน้ารหัสไปรษณีย์
        .replace(/^(รหัสไปรษณีย์|ปณ\.|ไปรษณีย์|zipcode)\s*/i, '')
        .trim();
}

/**
 * ค้นหาข้อมูลที่อยู่แบบฉลาด
 *
 * @param {'subDistrict' | 'district' | 'province' | 'zipCode'} field - ฟิลด์ที่กำลังค้นหา
 * @param {string} rawQuery - ข้อความที่ผู้ใช้พิมพ์
 * @param {number} maxResults - จำนวนผลลัพธ์สูงสุด (default 40)
 * @returns {Array<{ district: string, amphoe: string, province: string, zipcode: string }>}
 */
export function searchThaiAddress(field, rawQuery, maxResults = 40) {
    const normalized = normalizeThaiAddressQuery(rawQuery);
    if (!normalized || normalized.length < 2) {
        return [];
    }

    const words = normalized.split(/\s+/).filter(Boolean);
    const primaryWord = words[0];

    let candidates = [];

    // 1. ค้นหาในฟิลด์หลักก่อน
    if (field === 'zipCode') {
        candidates = searchAddressByZipcode(primaryWord, 100);
    } else if (field === 'subDistrict') {
        candidates = searchAddressByDistrict(primaryWord, 100);
        // หากได้ผลลัพธ์น้อยกว่า 5 ให้ค้นหาในอำเภอเพิ่มเติม (กรณีผู้ใช้พิมพ์ชื่ออำเภอในช่องตำบล เช่น สว่างแดนดิน)
        if (candidates.length < 5) {
            const amphoeMatches = searchAddressByAmphoe(primaryWord, 60);
            candidates = candidates.concat(amphoeMatches);
        }
    } else if (field === 'district') {
        candidates = searchAddressByAmphoe(primaryWord, 100);
        // หากได้ผลลัพธ์น้อยกว่า 5 ให้ค้นหาในตำบลเพิ่มเติม
        if (candidates.length < 5) {
            const districtMatches = searchAddressByDistrict(primaryWord, 60);
            candidates = candidates.concat(districtMatches);
        }
    } else if (field === 'province') {
        candidates = searchAddressByProvince(primaryWord, 100);
    } else {
        candidates = searchAddressByDistrict(primaryWord, 100);
    }

    // 2. หากผู้ใช้พิมพ์หลายคำ เช่น "สว่างแดนดิน สกลนคร" ให้กรองคำที่เหลือ
    if (words.length > 1) {
        const remainingWords = words.slice(1);
        candidates = candidates.filter(item => {
            const fullLine = `${item.district} ${item.amphoe} ${item.province} ${item.zipcode}`;
            return remainingWords.every(w => fullLine.includes(w));
        });
    }

    // 3. ลบรายการที่ซ้ำกัน (Deduplicate)
    const seen = new Set();
    const unique = [];
    for (const item of candidates) {
        const key = `${item.district}-${item.amphoe}-${item.province}-${item.zipcode}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
        }
    }

    // 4. จัดเรียงคะแนนความเกี่ยวข้อง (Relevance Scoring):
    //    - ตรงกันเป๊ะ (Exact match) = 100 คะแนน
    //    - ขึ้นต้นด้วยคำค้น (Starts with) = 60 คะแนน
    //    - มีคำค้นอยู่ข้างใน (Contains) = 30 คะแนน
    unique.sort((a, b) => {
        const calcScore = (item) => {
            let score = 0;
            let targetValue = '';

            if (field === 'subDistrict') targetValue = item.district;
            else if (field === 'district') targetValue = item.amphoe;
            else if (field === 'province') targetValue = item.province;
            else if (field === 'zipCode') targetValue = item.zipcode;

            if (targetValue === primaryWord) {
                score += 100;
            } else if (targetValue.startsWith(primaryWord)) {
                score += 60;
            } else if (targetValue.includes(primaryWord)) {
                score += 30;
            }

            // ถ้าคำหลักตรงกับอำเภอในขณะที่ค้นหาตำบล ให้คะแนนเสริม
            if (field === 'subDistrict' && item.amphoe.startsWith(primaryWord)) {
                score += 40;
            }

            return score;
        };

        return calcScore(b) - calcScore(a);
    });

    return unique.slice(0, maxResults);
}
