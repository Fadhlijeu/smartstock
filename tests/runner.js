/**
 * runner.js — Test Runner for SAP StockMon
 * Executes all test suites inside the Electron Node environment.
 */

'use strict';

const { run } = require('node:test');
const { spec } = require('node:test/reporters');
const path = require('path');
const fs = require('fs');

function findTestFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  const testsDir = __dirname;
  const files = findTestFiles(testsDir);

  console.log(`\n======================================================`);
  console.log(`🚀 SAP StockMon Automated Test Suite`);
  console.log(`   Running ${files.length} test suites with Electron runtime`);
  console.log(`======================================================\n`);

  const testStream = run({
    files,
    concurrency: 1, // Sequential execution for deterministic DB operations
    timeout: 30000,
  });

  testStream.compose(new spec()).pipe(process.stdout);

  testStream.on('test:fail', () => {
    process.exitCode = 1;
  });
}

main().catch((err) => {
  console.error('[FATAL] Test runner error:', err);
  process.exit(1);
});
