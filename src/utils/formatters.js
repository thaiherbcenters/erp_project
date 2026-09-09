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

export const getAddressParts = (data) => {
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

    const isBkk = prov.includes('กรุงเทพ') || prov.includes('กทม');
    const parts = [];

    if (no) {
        let cleanNo = no.replace(/(ซ\.-|ถ\.-|ต\.-|อ\.-|จ\.-)/g, '').trim();
        if (cleanNo && cleanNo !== '-') {
            const noTokens = cleanNo.split(/[ \t]+/).filter(p => p && p !== '-');
            parts.push(...noTokens);
        }
    }
    if (soi) {
        let cleanSoi = soi.replace(/^(ซ\.|ซอย)\s*/, '');
        if (cleanSoi && cleanSoi !== '-') parts.push('ซอย' + cleanSoi);
    }
    if (road) {
        let cleanRoad = road.replace(/^(ถ\.|ถนน)\s*/, '');
        if (cleanRoad && cleanRoad !== '-') parts.push('ถนน' + cleanRoad);
    }
    if (sub) {
        let cleanSub = sub.replace(/^(ต\.|ตำบล|แขวง)\s*/, '');
        if (cleanSub && cleanSub !== '-') {
            parts.push(isBkk ? ('แขวง' + cleanSub) : ('ต.' + cleanSub));
        }
    }
    if (dist) {
        let cleanDist = dist.replace(/^(อ\.|อำเภอ|เขต)\s*/, '');
        if (cleanDist && cleanDist !== '-') {
            parts.push(isBkk ? ('เขต' + cleanDist) : ('อ.' + cleanDist));
        }
    }
    if (prov) {
        let cleanProv = prov.replace(/^(จ\.|จังหวัด)\s*/, '');
        if (cleanProv && cleanProv !== '-') {
            parts.push(isBkk ? cleanProv : ('จ.' + cleanProv));
        }
    }
    if (zip && zip !== '-') parts.push(zip);

    return parts;
};

export const formatFullAddress = (data) => {
    if (!data) return '-';
    if (typeof data === 'string') return data.trim() || '-';
    const parts = getAddressParts(data);
    return parts.length > 0 ? parts.join(' ') : (data.address || '').trim() || '-';
};

