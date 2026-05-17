const fs = require('fs');
try {
  const content = fs.readFileSync('check-db-results.txt', 'utf16le');
  fs.writeFileSync('check-db-results-decoded.txt', content, 'utf8');
} catch(e) {}
