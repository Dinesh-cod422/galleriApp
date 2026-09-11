/* eslint-env jest */
require('react-native-gesture-handler/jestSetup');
require('@shopify/flash-list/jestSetup');

// MMKV is a JSI native module with no JS fallback — back it with an in-memory
// map so store/persistence logic is testable without a native runtime.
jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    MMKV: class {
      set(key, value) { store.set(key, String(value)); }
      getString(key) { return store.has(key) ? store.get(key) : undefined; }
      getBoolean(key) { return store.get(key) === 'true'; }
      getNumber(key) { return store.has(key) ? Number(store.get(key)) : undefined; }
      contains(key) { return store.has(key); }
      delete(key) { store.delete(key); }
      clearAll() { store.clear(); }
      getAllKeys() { return [...store.keys()]; }
    },
  };
});

jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
  trigger: jest.fn(),
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: { setString: jest.fn(), getString: jest.fn(async () => '') },
}));
