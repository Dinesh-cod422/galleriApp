/* eslint-env jest */
// Fail a test if an unexpected console.error slips through (missing keys,
// act() warnings, prop-type violations) instead of letting it scroll past.
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    originalError(...args);
    throw new Error(`console.error in test: ${args[0]}`);
  };
});
afterAll(() => {
  console.error = originalError;
});
