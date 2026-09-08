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

export const formatFullAddress = (data) => {
    if (!data) return '-';
    const no = (data.addr_no || '').trim();
    const soi = (data.addr_soi || '').trim();
    const road = (data.addr_road || '').trim();
    const sub = (data.addr_subdistrict || '').trim();
    const dist = (data.addr_district || '').trim();
    const prov = (data.addr_province || '').trim();
    const zip = (data.addr_zip || '').trim();

    const hasMeaningfulPart = [no, soi, road, sub, dist, prov, zip].some(val => val !== '' && val !== '-');

    if (hasMeaningfulPart) {
        const isBkk = prov.includes('กรุงเทพ') || prov.includes('กทม');
        const parts = [];

        if (no && no !== '-') parts.push(no);
        if (soi && soi !== '-') {
            parts.push(soi.startsWith('ซอย') ? soi : `ซอย${soi}`);
        }
        if (road && road !== '-') {
            parts.push(road.startsWith('ถนน') ? road : `ถนน${road}`);
        }
        if (sub && sub !== '-') {
            if (isBkk) {
                parts.push(sub.startsWith('แขวง') ? sub : `แขวง${sub.replace(/^(ต\.|ตำบล)/, '')}`);
            } else {
                parts.push(sub.startsWith('ต.') || sub.startsWith('ตำบล') ? sub : `ต.${sub}`);
            }
        }
        if (dist && dist !== '-') {
            if (isBkk) {
                parts.push(dist.startsWith('เขต') ? dist : `เขต${dist.replace(/^(อ\.|อำเภอ)/, '')}`);
            } else {
                parts.push(dist.startsWith('อ.') || dist.startsWith('อำเภอ') ? dist : `อ.${dist}`);
            }
        }
        if (prov && prov !== '-') {
            if (isBkk) {
                parts.push(prov.startsWith('จ.') ? prov.replace(/^จ\./, '') : prov);
            } else {
                parts.push(prov.startsWith('จ.') || prov.startsWith('จังหวัด') ? prov : `จ.${prov}`);
            }
        }
        if (zip && zip !== '-') parts.push(zip);

        const joined = parts.join(' ').trim();
        if (joined) return joined;
    }

    return (data.address || '').trim() || '-';
};

