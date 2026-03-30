const Jasmine = require('jasmine');
const jasmine = new Jasmine();

jasmine.loadConfig({
  spec_dir: 'spec',
  spec_files: [
    '**/*[sS]pec.js'
  ],
  helpers: [],
  stopSpecOnExpectationFailure: false,
  random: false
});

// Add error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n!!! Unhandled Promise Rejection !!!');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('\n!!! Uncaught Exception !!!');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

// Add a reporter to see what's happening
jasmine.env.clearReporters();
jasmine.addReporter({
  jasmineStarted: () => console.log('\n=== Jasmine Tests Started ===\n'),
  suiteStarted: (result) => console.log(`\nSuite: ${result.description}`),
  specStarted: (result) => console.log(`  Spec: ${result.description}...`),
  specDone: (result) => {
    if (result.status === 'passed') {
      console.log(`    ✓ PASSED`);
    } else if (result.status === 'failed') {
      console.log(`    ✗ FAILED`);
      result.failedExpectations.forEach((failure) => {
        console.log(`      ${failure.message}`);
        if (failure.stack) console.log(`      Stack: ${failure.stack.substring(0, 500)}`);
      });
    } else {
      console.log(`    ? ${result.status.toUpperCase()}`);
    }
  },
  suiteDone: (result) => {
    if (result.failedExpectations && result.failedExpectations.length > 0) {
      console.log(`\n  Suite "${result.description}" had errors:`);
      result.failedExpectations.forEach((failure) => {
        console.log(`    ${failure.message}`);
      });
    }
  },
  jasmineDone: (result) => {
    console.log('\n=== Jasmine Tests Complete ===');
    console.log(`Total: ${result.totalCount || 0}, Failed: ${result.failedExpectations ? result.failedExpectations.length : result.failedCount || 0}`);
    if (result.failedExpectations && result.failedExpectations.length > 0) {
      console.log('\nTop-level failures:');
      result.failedExpectations.forEach((failure) => {
        console.log(`  ${failure.message}`);
        console.log(`  ${failure.stack}`);
      });
    }
  }
});

jasmine.execute();
