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
