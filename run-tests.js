// Quick test runner to check if tests execute
const Jasmine = require('jasmine');
const jasmine = new Jasmine();

jasmine.loadConfigFile('spec/support/jasmine.json');

jasmine.execute().then((result) => { // Log test results and exit with appropriate status code
  console.log('Tests completed with result:', result);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}).catch((error) => { // Handle any errors that occur during test execution
  console.error('Error running tests:', error);
  process.exit(1);
});
