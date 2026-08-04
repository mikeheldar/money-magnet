#!/usr/bin/env node
/**
 * verify-firebase-auth.js — droplet Firebase Auth check.
 *
 * Confirms the service-account credential on this droplet can authenticate
 * against the Money Magnet Firebase project BEFORE you deploy / run Plaid sync.
 *
 * Run from the repo root:
 *   node scripts/verify-firebase-auth.js
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS pointing at the service-account JSON.
 */

const path = require('path');
const EXPECTED_PROJECT = 'money-magnet-cf5a4';

// firebase-admin lives in functions/node_modules; resolve it from there.
let admin;
try {
  admin = require('firebase-admin');
} catch (_) {
  try {
    admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
  } catch (e) {
    console.error('❌ firebase-admin not found. Install deps first:');
    console.error('   cd ~/projects/money-magnet/functions && npm install');
    process.exit(1);
  }
}

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS is not set.');
  console.error('   export GOOGLE_APPLICATION_CREDENTIALS=/home/system/.config/money-magnet/firebase-deploy-sa.json');
  process.exit(1);
}

(async () => {
  try {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });

    const projectId =
      admin.app().options.projectId ||
      (admin.app().options.credential && admin.app().options.credential.projectId) ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      '(unknown)';

    // Real round-trip to the Firebase Auth backend — proves the credential works.
    const list = await admin.auth().listUsers(1);

    console.log('✅ Firebase Auth OK.');
    console.log('   project:', projectId);
    console.log('   users reachable:', list.users.length >= 0 ? 'yes' : 'no');

    if (projectId !== EXPECTED_PROJECT && projectId !== '(unknown)') {
      console.warn(`⚠️  project is ${projectId}, expected ${EXPECTED_PROJECT} — check you exported the right key.`);
      process.exit(2);
    }
    console.log('✅ Ready to deploy Plaid sync: npm run deploy:functions');
    process.exit(0);
  } catch (err) {
    console.error('❌ Firebase Auth check FAILED:', err.message);
    console.error('   - Is the service-account key valid and for', EXPECTED_PROJECT, '?');
    console.error('   - Does the SA have the Firebase Authentication Admin / Viewer role?');
    process.exit(1);
  }
})();
