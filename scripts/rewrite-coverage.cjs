const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Use the bundled file path that has sourcemaps
const TARGET_FILE = path.resolve(__dirname, '../dist/growspace-manager-card.js');
const COVERAGE_DIR = path.resolve(__dirname, '../coverage/tmp');

// Pattern to match the served URL
// It typically looks like http://127.0.0.1:8123/local/community/lovelace-growspace-manager-card/growspace-manager-card.js?v=2
const URL_PATTERN = /growspace-manager-card\.js/;

console.log('Rewriting coverage URLs to:', TARGET_FILE);

// Simple glob replacement since 'glob' might not be installed in the environment
const files = fs.readdirSync(COVERAGE_DIR).filter(f => f.endsWith('.json')).map(f => path.join(COVERAGE_DIR, f));

files.forEach(file => {
    try {
        const content = JSON.parse(fs.readFileSync(file, 'utf8'));
        let modified = false;

        if (content.result) {
            content.result = content.result.map(entry => {
                if (URL_PATTERN.test(entry.url)) {
                    console.log(`Rewriting ${entry.url} in ${path.basename(file)}`);
                    entry.url = `file://${TARGET_FILE}`; // c8 likes file:// URLs or absolute paths
                    modified = true;
                }
                return entry;
            });
        }

        if (modified) {
            fs.writeFileSync(file, JSON.stringify(content));
        }
    } catch (e) {
        console.error(`Failed to process ${file}:`, e);
    }
});

console.log('Done rewriting coverage files.');
