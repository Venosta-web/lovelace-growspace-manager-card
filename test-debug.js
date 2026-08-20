const fs = require('fs');
const content = fs.readFileSync('tests/unit/dialogs/config-dialog-coverage.spec.ts', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(30, 65).join('\n'));
