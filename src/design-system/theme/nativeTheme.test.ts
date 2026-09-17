import { darkColors, lightColors } from './colors';

/*
 * Node's types are declared here instead of being imported.
 *
 * `@react-native/typescript-config` sets `types: ["jest"]`, which deliberately
 * keeps `fs` and `path` out of reach — app code that can import them is app
 * code that can ship a filesystem call into a bundle. This test legitimately
 * reads the repo, so it declares the three things it needs at module scope
 * rather than adding "node" to the project and opening them to every file.
 */
declare function require(id: 'fs'): { readFileSync(path: string, encoding: 'utf8'): string };
declare function require(id: 'path'): { resolve(...parts: string[]): string };
declare const __dirname: string;

const { readFileSync } = require('fs');
const { resolve } = require('path');

/**
 * The canvas colour exists in three places, and only one of them is TypeScript.
 *
 * React cannot paint the window it is hosted in. Before the bundle mounts, and
 * during every native stack transition, overscroll and rotation, what the user
 * sees behind the app is the platform's own window background — so the canvas
 * has to be declared again in `values/colors.xml`, in `values-night/colors.xml`
 * and in `AppDelegate.swift`.
 *
 * Three hand-copied constants drift. This file makes them an invariant instead:
 * change `bg.canvas` without changing the native pair and the suite says so,
 * rather than a white flash showing up in dark mode on someone's device.
 */

const root = resolve(__dirname, '../../..');
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');

const androidCanvas = (dir: string): string | undefined =>
  read(`android/app/src/main/res/${dir}/colors.xml`)
    .match(/<color name="app_canvas">\s*(#[0-9a-fA-F]{6,8})\s*<\/color>/)?.[1]
    ?.toUpperCase();

describe('native window background', () => {
  it('matches bg.canvas on Android in both modes', () => {
    expect(androidCanvas('values')).toBe(lightColors.bg.canvas.toUpperCase());
    expect(androidCanvas('values-night')).toBe(darkColors.bg.canvas.toUpperCase());
  });

  it('matches bg.canvas on iOS in both modes', () => {
    const swift = read('ios/AIPromptGallery/AppDelegate.swift');

    /*
     * The colour is written as `UIColor(red: 0x08 / 255.0, …)` because a Swift
     * literal cannot be a hex string. Reassembling the bytes is what lets this
     * compare against the same `#RRGGBB` the rest of the app uses.
     */
    const components = [...swift.matchAll(/UIColor\(\s*red:\s*0x([0-9A-Fa-f]{2})\s*\/\s*255\.0,\s*green:\s*0x([0-9A-Fa-f]{2})\s*\/\s*255\.0,\s*blue:\s*0x([0-9A-Fa-f]{2})\s*\/\s*255\.0/g)]
      .map(m => `#${m[1]}${m[2]}${m[3]}`.toUpperCase());

    // Order matters: the dynamic provider tests for `.dark` first.
    expect(components).toEqual([
      darkColors.bg.canvas.toUpperCase(),
      lightColors.bg.canvas.toUpperCase(),
    ]);
  });

  /**
   * Without `uiMode` the activity is torn down and rebuilt when the system
   * switches appearance — the JS context restarts, every query refetches and
   * the user loses their scroll position, all to change two colours.
   */
  it('lets Android hand the appearance change to React instead of restarting', () => {
    const manifest = read('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toMatch(/android:configChanges="[^"]*\buiMode\b/);
  });

  /**
   * `UIUserInterfaceStyle` in Info.plist pins the app to one appearance and
   * makes the whole theme switcher a no-op on iOS. Its ABSENCE is the setting.
   */
  it('does not pin iOS to a single appearance', () => {
    expect(read('ios/AIPromptGallery/Info.plist')).not.toMatch(/UIUserInterfaceStyle/);
  });
});
