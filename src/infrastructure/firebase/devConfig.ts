/**
 * Development-only switches.
 *
 * Every consumer guards on `__DEV__` as well, so nothing here can change the
 * behaviour of a release build even if a flag is committed in the "on"
 * position by accident.
 */
export type EmulatorConfig = {
  readonly enabled: boolean;
  /** Use the machine's LAN IP, not localhost, when running on a real device. */
  readonly host: string;
  readonly port: number;
};

/**
 * Point Firestore at a local emulator instead of the live project.
 *
 * Worth knowing: the emulator answers queries WITHOUT composite indexes, so
 * this is how you exercise the gallery before the real indexes exist — and how
 * you work on list/pagination code without spending live reads.
 *
 *   cd tools/seed
 *   npx firebase-tools@13 emulators:start --only firestore --project <project-id>
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 node seed.mjs
 *
 * Then flip `enabled` to true and relaunch the app.
 */
export const firestoreEmulator: EmulatorConfig = {
  enabled: false,
  host: 'localhost',
  port: 8080,
};
