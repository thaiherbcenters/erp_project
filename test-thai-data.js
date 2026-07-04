const thaiData = require('thai-data');
console.log(Object.keys(thaiData));
// See if there is a search or filter method
console.log(thaiData.length || Object.keys(thaiData).length);
console.log(thaiData[0] || Object.values(thaiData)[0]);
