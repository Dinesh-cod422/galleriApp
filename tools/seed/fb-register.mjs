/**
 * Registers the Android + iOS apps in the Firebase project and writes their
 * native config files into the RN project.
 *
 *   node fb-register.mjs --key <sa.json> --root <repo> \
 *        --android-package com.promptkalai --ios-bundle com.promptkalai
 *
 * Additive only — never touches apps that already exist, so the old package's
 * registration survives a rename and old installs keep working.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { argv, exit } from 'node:process';
import { GoogleAuth } from 'google-auth-library';

const value = (n) => { const i = argv.indexOf(`--${n}`); return i !== -1 ? argv[i + 1] : undefined; };
const key = JSON.parse(readFileSync(value('key'), 'utf8'));
const ROOT = value('root');
const PROJECT = key.project_id;
const API = `https://firebase.googleapis.com/v1beta1`;

// Overridable so a package rename does not mean editing this file. The
// defaults are the CURRENT ids, so an argument-less run re-checks the live app
// rather than registering something unexpected.
const ANDROID_PACKAGE = value('android-package') ?? 'com.promptkalai';
const IOS_BUNDLE = value('ios-bundle') ?? 'com.promptkalai';
const DISPLAY_NAME = value('display-name') ?? 'Prompt Kalai';
/** Where GoogleService-Info.plist goes; the Xcode GROUP name, not the bundle id. */
const IOS_DIR = value('ios-dir') ?? 'AIPromptGallery';

const auth = new GoogleAuth({
  credentials: key,
  scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const run = async () => {
  const client = await auth.getClient();
  const get = async (url) => (await client.request({ url })).data;

  /** App creation is a long-running operation; poll until it resolves. */
  const createApp = async (kind, body, matchField, matchValue) => {
    const list = await get(`${API}/projects/${PROJECT}/${kind}`);
    const existing = (list.apps ?? []).find(a => a[matchField] === matchValue);
    if (existing) {
      console.log(`  EXISTS   ${kind}: ${matchValue} (${existing.appId})`);
      return existing;
    }
    console.log(`  CREATING ${kind}: ${matchValue}`);
    const op = (await client.request({
      url: `${API}/projects/${PROJECT}/${kind}`, method: 'POST', data: body,
    })).data;

    let operation = op;
    for (let i = 0; i < 30 && !operation.done; i += 1) {
      await sleep(2000);
      operation = await get(`${API}/${operation.name}`);
    }
    if (!operation.done) throw new Error(`Timed out creating ${kind}`);
    if (operation.error) throw new Error(operation.error.message);
    console.log(`  CREATED  ${kind}: ${operation.response.appId}`);
    return operation.response;
  };

  console.log(`\nRegistering apps in "${PROJECT}"…\n`);

  const androidApp = await createApp(
    'androidApps',
    { displayName: `${DISPLAY_NAME} (Android)`, packageName: ANDROID_PACKAGE },
    'packageName', ANDROID_PACKAGE,
  );
  const iosApp = await createApp(
    'iosApps',
    { displayName: `${DISPLAY_NAME} (iOS)`, bundleId: IOS_BUNDLE },
    'bundleId', IOS_BUNDLE,
  );

  console.log('\nFetching native config files…\n');

  const androidCfg = await get(`${API}/${androidApp.name}/config`);
  const androidPath = `${ROOT}/android/app/google-services.json`;
  writeFileSync(androidPath, Buffer.from(androidCfg.configFileContents, 'base64'));
  console.log(`  wrote ${androidPath}`);

  const iosCfg = await get(`${API}/${iosApp.name}/config`);
  const iosPath = `${ROOT}/ios/${IOS_DIR}/GoogleService-Info.plist`;
  writeFileSync(iosPath, Buffer.from(iosCfg.configFileContents, 'base64'));
  console.log(`  wrote ${iosPath}`);

  console.log(`\n  Android appId: ${androidApp.appId}`);
  console.log(`  iOS appId:     ${iosApp.appId}\n`);
  exit(0);
};

run().catch(e => {
  const m = e?.response?.data?.error?.message ?? e.message;
  console.error('\nRegistration failed:', m, '\n');
  exit(1);
});
