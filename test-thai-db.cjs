const db = require('thai-address-database');
console.log(Object.keys(db));
const result = db.searchAddressByDistrict('บางกะปิ');
console.log(result);
