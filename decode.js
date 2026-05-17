const fs = require('fs');
try {
  const content = fs.readFileSync('db-results.txt', 'utf16le');
  fs.writeFileSync('db-results-decoded.txt', content, 'utf8');
} catch(e) {}
