// Quick test runner to check if tests execute
const Jasmine = require('jasmine');
const jasmine = new Jasmine();

jasmine.loadConfigFile('spec/support/jasmine.json');

jasmine.execute().then((result) => {
  console.log('Tests completed with result:', result);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}).catch((error) => {
  console.error('Error running tests:', error);
  process.exit(1);
});
