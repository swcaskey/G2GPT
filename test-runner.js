const Jasmine = require('jasmine');
const jasmine = new Jasmine();

jasmine.loadConfig({ // Configure Jasmine to look for spec files in the 'spec' directory
  spec_dir: 'spec',
  spec_files: [
    '**/*[sS]pec.js'
  ],
  helpers: [],
  stopSpecOnExpectationFailure: false,
  random: false
});

// Add error handler
process.on('unhandledRejection', (reason, promise) => { // Log unhandled promise rejections with details for debugging
  console.error('\n!!! Unhandled Promise Rejection !!!');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
});

// Add handler for uncaught exceptions to log them with details for debugging
process.on('uncaughtException', (error) => { // Log uncaught exceptions with details for debugging
  console.error('\n!!! Uncaught Exception !!!');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
});

// Add a reporter to see what's happening
jasmine.env.clearReporters();
jasmine.addReporter({ // Custom reporter to log test progress and results in a readable format
  jasmineStarted: () => console.log('\n=== Jasmine Tests Started ===\n'),
  suiteStarted: (result) => console.log(`\nSuite: ${result.description}`),
  specStarted: (result) => console.log(`  Spec: ${result.description}...`),
  specDone: (result) => {
    if (result.status === 'passed') { // Log passed specs with a checkmark for clarity
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
  suiteDone: (result) => { // Log any errors that occurred in the suite after it finishes
    if (result.failedExpectations && result.failedExpectations.length > 0) { // Log details of any suite-level failures that occurred outside of individual specs
      console.log(`\n  Suite "${result.description}" had errors:`);
      result.failedExpectations.forEach((failure) => {
        console.log(`    ${failure.message}`);
      });
    }
  },
  jasmineDone: (result) => {// Log summary of test results at the end of the test run
    console.log('\n=== Jasmine Tests Complete ===');
    console.log(`Total: ${result.totalCount || 0}, Failed: ${result.failedExpectations ? result.failedExpectations.length : result.failedCount || 0}`);
    if (result.failedExpectations && result.failedExpectations.length > 0) { // Log details of any top-level failures that occurred outside of individual specs
      console.log('\nTop-level failures:');
      result.failedExpectations.forEach((failure) => { // Log details of each top-level failure for debugging
        console.log(`  ${failure.message}`);
        console.log(`  ${failure.stack}`);
      });
    }
  }
});

jasmine.execute();
