const fs = require('fs');
const txt = fs.readFileSync('db-results.txt', 'utf16le');
console.log(txt);
