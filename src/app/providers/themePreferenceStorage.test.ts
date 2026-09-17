import { readThemePreference, writeThemePreference } from './themePreferenceStorage';

describe('themePreferenceStorage', () => {
  it('follows the system until a choice is made', () => {
    expect(readThemePreference()).toBe('system');
  });

  /** The whole point: a theme that resets on relaunch is worse than none. */
  it('remembers the choice', () => {
    writeThemePreference('dark');

    expect(readThemePreference()).toBe('dark');
  });

  it('falls back to system rather than trusting whatever is on disk', () => {
    writeThemePreference('midnight' as never);

    expect(readThemePreference()).toBe('system');
  });
});
