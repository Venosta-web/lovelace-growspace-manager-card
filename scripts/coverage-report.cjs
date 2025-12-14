const fs = require('fs');
const path = require('path');

// Simple coverage report aggregator
const coverageDir = path.join(__dirname, '..', 'coverage', 'tmp');

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
    const content = JSON.parse(fs.readFileSync(path.join(coverageDir, file), 'utf8'));
    const data = Array.isArray(content) ? content : (content.result || []);

    data.forEach(entry => {
        if (entry.url && entry.url.includes('growspace-manager-card')) {
            const content = entry.source || entry.text;
            const totalFileBytes = content ? content.length : 0;
            let coveredForFileEntry = 0; // Renamed to avoid confusion with global coveredBytes

            if (totalFileBytes > 0 && entry.functions) {
                entry.functions.forEach(fn => {
                    // Merge ranges to avoid double counting
                    const sortedRanges = fn.ranges.sort((a, b) => a.startOffset - b.startOffset);
                    let mergedRanges = [];
                    if (sortedRanges.length > 0) {
                        let current = { ...sortedRanges[0] }; // Clone to avoid modifying original
                        for (let i = 1; i < sortedRanges.length; i++) {
                            let next = sortedRanges[i];
                            if (current.endOffset >= next.startOffset) {
                                current.endOffset = Math.max(current.endOffset, next.endOffset);
                            } else {
                                mergedRanges.push(current);
                                current = { ...next }; // Clone next
                            }
                        }
                        mergedRanges.push(current);
                    }

                    mergedRanges.forEach(range => {
                        if (range.count > 0) { // Only count if the range was executed
                            coveredForFileEntry += (range.endOffset - range.startOffset);
                        }
                    });
                });
            }

            totalBytes += totalFileBytes;
            coveredBytes += coveredForFileEntry; // Add the calculated covered bytes for this entry

            const coverage = totalFileBytes > 0 ? ((coveredForFileEntry / totalFileBytes) * 100).toFixed(2) : 0;
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
    const coverageVal = Math.min(100, Math.max(0, stat.coverage));
    const barLen = Math.floor(coverageVal / 2);
    const emptyLen = Math.max(0, 50 - barLen);
    const bar = '█'.repeat(barLen);
    const empty = '░'.repeat(emptyLen);
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
