# Firebase Auth Setup on the Money Magnet Droplet

**Goal:** get the Ubuntu droplet authenticated to the Money Magnet Firebase
project (`money-magnet-cf5a4`) so `firebase deploy` works headlessly and the
Plaid transaction sync (`task_20260727_001`) is unblocked.

**Why this exists:** `firebase-tools` has been installed on the droplet since
2026‑07‑26, but the interactive `firebase login` never completed — the droplet
is headless, so the browser flow stalls. The fix below uses a **service
account** (non‑interactive, no browser, survives reboots) instead of a personal
login. This is the one thing standing between us and `npm run deploy:functions`.

Project facts (do not guess these):

| Thing | Value |
|---|---|
| Firebase project ID | `money-magnet-cf5a4` |
| Functions region | `us-central1` |
| Deploy command | `npm run deploy:functions` (= `firebase deploy --only functions`) |
| firebase-admin | installed in `functions/node_modules` (v12) |

---

## Step 1 — Create a service account & key

Do this once, in a browser on your laptop/phone (Google Cloud Console).

1. Open the Firebase project's service accounts:
   https://console.firebase.google.com/project/money-magnet-cf5a4/settings/serviceaccounts/adminsdk
   — or Google Cloud Console → **IAM & Admin → Service Accounts** for project
   `money-magnet-cf5a4`.
2. Use the existing **Firebase Admin SDK** service account
   (`firebase-adminsdk-...@money-magnet-cf5a4.iam.gserviceaccount.com`), or
   create a new one named `droplet-deploy`.
3. Grant it the roles needed for a functions deploy + an auth check
   (IAM & Admin → the SA → **Grant access / Add role**):
   - **Firebase Admin** (`roles/firebase.admin`) — deploy + read auth/firestore
   - **Cloud Functions Admin** (`roles/cloudfunctions.admin`)
   - **Service Account User** (`roles/iam.serviceAccountUser`)
   - **Cloud Build Editor** (`roles/cloudbuild.builds.editor`) — 2nd‑gen
     functions build step
   (If you just want the auth check to pass, **Firebase Authentication Admin**
   or Viewer alone is enough; the extra roles are for the deploy.)
4. On the SA, **Keys → Add key → Create new key → JSON**. A `.json` file
   downloads. Treat it like a password — it grants project access.

---

## Step 2 — Place the key on the droplet (outside the repo)

Never commit the key. Store it in a locked‑down dir outside `~/projects`:

```bash
mkdir -p /home/system/.config/money-magnet
# copy the JSON up from your laptop, e.g.:
#   scp firebase-deploy-sa.json system@<droplet-ip>:/home/system/.config/money-magnet/
mv /path/to/downloaded-key.json /home/system/.config/money-magnet/firebase-deploy-sa.json
chmod 600 /home/system/.config/money-magnet/firebase-deploy-sa.json
```

`~/projects/money-magnet/.gitignore` already ignores `.env` files, but the key
lives outside the repo entirely, so there is no way to commit it by accident.

---

## Step 3 — Set the environment variables

The Firebase CLI **and** `firebase-admin` both honor
`GOOGLE_APPLICATION_CREDENTIALS`. Export it (and pin the project) so no
interactive login is ever needed:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/home/system/.config/money-magnet/firebase-deploy-sa.json
export GOOGLE_CLOUD_PROJECT=money-magnet-cf5a4
```

Make it permanent so it survives your next SSH session / reboot — append to
`~/.bashrc` (or a systemd unit's `Environment=` if the app runs as a service):

```bash
cat >> ~/.bashrc <<'RC'
export GOOGLE_APPLICATION_CREDENTIALS=/home/system/.config/money-magnet/firebase-deploy-sa.json
export GOOGLE_CLOUD_PROJECT=money-magnet-cf5a4
RC
source ~/.bashrc
```

**How the code picks this up:** the Cloud Functions (`functions/index.js`) call
`admin.initializeApp()` with no args — in the deployed Firebase runtime that
auto‑uses the platform credential; when you run admin code *on the droplet* it
falls back to `GOOGLE_APPLICATION_CREDENTIALS`. The Plaid keys themselves are
**v2 secrets** (`PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`), set separately
in Step 5 — they are not part of this service‑account file.

---

## Step 4 — VERIFY auth works (do this BEFORE Plaid sync)

Run the bundled check from the repo root. It does a real round‑trip to the
Firebase Auth backend, so a green result proves the credential is valid for
`money-magnet-cf5a4`:

```bash
cd ~/projects/money-magnet
node scripts/verify-firebase-auth.js
```

Expected on success:

```
✅ Firebase Auth OK.
   project: money-magnet-cf5a4
   users reachable: yes
✅ Ready to deploy Plaid sync: npm run deploy:functions
```

If it prints `GOOGLE_APPLICATION_CREDENTIALS is not set` → redo Step 3.
If it prints `Firebase Auth check FAILED` → the key is wrong/for another
project, or the SA is missing the Firebase Authentication role (Step 1.3).

Also confirm the **CLI** is authenticated (this is what `deploy` uses):

```bash
npx firebase projects:list      # should list money-magnet-cf5a4, no browser prompt
```

> Fallback if you'd rather do a one‑time personal login instead of a service
> account: `npm run firebase:login` (= `firebase login --no-localhost`) prints a
> URL — open it on your phone, sign in as the Firebase owner, paste the code
> back. The service‑account path above is preferred because it's non‑interactive
> and doesn't expire with your session.

---

## Step 5 — Go live: deploy Plaid sync (`task_20260727_001`)

Only once Step 4 is green:

```bash
cd ~/projects/money-magnet
# set the 3 Plaid v2 secrets (use PRODUCTION Plaid secret):
npx firebase functions:secrets:set PLAID_CLIENT_ID
npx firebase functions:secrets:set PLAID_SECRET
npx firebase functions:secrets:set PLAID_ENV      # value: production

npm run deploy:functions
```

After deploy: in the app's **Accounts** page, reconnect your real bank
(sandbox tokens don't carry over), then hit **Sync Transactions**. Live
transactions should flow into Firestore and the forecast.

---

## Troubleshooting

- **`Failed to authenticate, have you run firebase login?`** on deploy →
  `GOOGLE_APPLICATION_CREDENTIALS` isn't exported in the shell you're deploying
  from. Re‑run Step 3 / `source ~/.bashrc`.
- **`PERMISSION_DENIED` during deploy** → SA is missing a role from Step 1.3
  (usually Cloud Functions Admin or Service Account User).
- **`project is <other>, expected money-magnet-cf5a4`** from the verify script →
  you exported a key from the wrong project; re‑download from the right one.
- **Never** paste the key contents into chat, commits, or logs.
