const fs = require('fs');
let content = fs.readFileSync('src/data/mockData.js', 'utf8');

content = content.replace("      }\n      {\n        id: 'sales_receipt'", "      },\n      {\n        id: 'sales_receipt'");
content = content.replace("      },\r\n      {\r\n        id: 'sales_receipt'", "      },\r\n      {\r\n        id: 'sales_receipt'");
content = content.replace("      },,", "      },");

fs.writeFileSync('src/data/mockData.js', content, 'utf8');
console.log("Fixed mockData.js syntax");
