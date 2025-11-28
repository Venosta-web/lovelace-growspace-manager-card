const fs = require('fs');
const path = require('path');

// Simple coverage report aggregator
const coverageDir = path.join(__dirname, '..', 'coverage');

if (!fs.existsSync(coverageDir)) {
    console.log('No coverage data found. Run tests with coverage collection enabled.');
    process.exit(0);
}

const files = fs.readdirSync(coverageDir).filter(f => f.endsWith('.json'));

if (files.length === 0) {
    console.log('No coverage files found in coverage directory.');
    process.exit(0);
}

console.log('\n📊 Coverage Report\n');
console.log(`Found ${files.length} coverage file(s)\n`);

let totalBytes = 0;
let coveredBytes = 0;
const fileStats = [];

files.forEach(file => {
    const data = JSON.parse(fs.readFileSync(path.join(coverageDir, file), 'utf8'));

    data.forEach(entry => {
        if (entry.url && entry.url.includes('growspace-manager-card')) {
            const totalFileBytes = entry.text.length;
            let covered = 0;

            entry.ranges.forEach(range => {
                covered += (range.end - range.start);
            });

            totalBytes += totalFileBytes;
            coveredBytes += covered;

            const coverage = ((covered / totalFileBytes) * 100).toFixed(2);
            fileStats.push({
                file: entry.url.split('/').pop(),
                coverage: parseFloat(coverage)
            });
        }
    });
});

// Display results
console.log('File Coverage:');
fileStats.forEach(stat => {
    const bar = '█'.repeat(Math.floor(stat.coverage / 2));
    const empty = '░'.repeat(50 - Math.floor(stat.coverage / 2));
    console.log(`  ${stat.file.padEnd(40)} ${bar}${empty} ${stat.coverage.toFixed(2)}%`);
});

const overallCoverage = totalBytes > 0 ? ((coveredBytes / totalBytes) * 100).toFixed(2) : 0;
console.log(`\n${'='.repeat(80)}`);
console.log(`  Overall Coverage: ${overallCoverage}%`);
console.log(`  Total Bytes: ${totalBytes}`);
console.log(`  Covered Bytes: ${coveredBytes}`);
console.log(`${'='.repeat(80)}\n`);

// Exit with error if coverage is below threshold (optional)
const threshold = 50; // 50% coverage threshold
if (parseFloat(overallCoverage) < threshold) {
    console.log(`⚠️  Warning: Coverage (${overallCoverage}%) is below threshold (${threshold}%)`);
}
