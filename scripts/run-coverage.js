const { chromium } = require('playwright');
const v8toIstanbul = require('v8-to-istanbul');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function collectCoverage() {
    console.log('🧪 Running tests with coverage collection...\n');

    // Run the standard tests (they will run in the background)
    try {
        execSync('npx playwright test', { stdio: 'inherit' });
    } catch (error) {
        console.error('Tests failed, but continuing with coverage report...');
    }

    // Check if coverage data was collected
    const nycOutputDir = path.join(process.cwd(), '.nyc_output');

    if (!fs.existsSync(nycOutputDir) || fs.readdirSync(nycOutputDir).length === 0) {
        console.log('\n⚠️  No coverage data found.');
        console.log('Coverage collection requires using the coverage-helper in tests.');
        console.log('\nShowing test results summary instead.\n');
        process.exit(0);
    }

    console.log('\n📊 Generating coverage report...\n');

    // Generate NYC reports
    try {
        execSync('npx nyc report --reporter=text --reporter=html --reporter=lcov', { stdio: 'inherit' });
        console.log('\n✅ Coverage report generated!');
        console.log(`📁 HTML Report: ${path.join(process.cwd(), 'coverage', 'index.html')}`);
    } catch (error) {
        console.error('Error generating coverage report:', error.message);
    }
}

// Check if v8-to-istanbul is installed
try {
    require.resolve('v8-to-istanbul');
    collectCoverage();
} catch (e) {
    console.log('Installing v8-to-istanbul...');
    execSync('npm install --save-dev v8-to-istanbul', { stdio: 'inherit' });
    collectCoverage();
}
