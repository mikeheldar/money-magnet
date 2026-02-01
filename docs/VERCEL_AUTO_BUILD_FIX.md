# Fix Vercel Not Building on Push

When you push (check in) code, Vercel should automatically start a new build. If it doesn’t, use this checklist.

## 1. Confirm Git is connected in Vercel

1. Open **[Vercel Dashboard](https://vercel.com/dashboard)** → your project (e.g. Money Magnet).
2. Go to **Settings** → **Git**.
3. Under **Connected Git Repository**:
   - It should show your GitHub repo (e.g. `mikeheldar/money-magnet`).
   - If it says **Not connected** or the repo is wrong:
     - Click **Connect Git Repository** (or **Disconnect** then reconnect).
     - Choose the correct GitHub repo and authorize if asked.
4. Under **Production Branch**, set it to the branch you push to (usually `main` or `master`).

## 2. Root Directory (only for monorepos)

**You only need this if your repo has multiple apps** and Money Magnet lives in a subfolder (e.g. repo root is `projects` and the app is in `money-magnet`). In that case, Vercel may show **Root Directory** under **Settings** → **General** when you first import the project. If you don’t see it, your project is likely using the repo root—leave it as is.

## 3. Check GitHub webhook

1. On GitHub: **Repository** → **Settings** → **Webhooks**.
2. Find the Vercel webhook (URL like `https://api.vercel.com/v1/integrations/deploy/...`).
3. Click it and open **Recent Deliveries**.
4. For a recent `push` event, the response should be **200**.
5. If the webhook is missing or deliveries fail:
   - In Vercel: **Settings** → **Git** → **Disconnect** the repo, then **Connect** again to recreate the webhook.

## 4. Don’t skip all builds

1. In Vercel: **Settings** → **Git** → **Ignored Build Step**.
2. If you use a custom command, it must **not** always exit successfully (e.g. always `exit 0`), or every build will be skipped.
3. To build on every push, leave this empty or use a condition that only skips when you really want (e.g. docs-only changes).

## 5. Optional: Vercel Deploy Hook (fallback)

If the Git integration still doesn’t trigger builds, you can trigger them with a **Deploy Hook**:

1. In Vercel: **Settings** → **Git** → scroll to **Deploy Hooks**.
2. Add a hook, e.g. name: `GitHub Push`, branch: `main`.
3. Copy the hook URL.
4. In GitHub: **Repository** → **Settings** → **Secrets and variables** → **Actions**.
5. Add a secret: name `VERCEL_DEPLOY_HOOK`, value = the hook URL.
6. The workflow in `.github/workflows/vercel-build.yml` (if added) can then call this hook on push so each push still triggers a Vercel build.

## 6. Manual redeploy

To deploy the latest commit without re-pushing:

1. Vercel Dashboard → your project → **Deployments**.
2. Open the **...** menu on the latest deployment → **Redeploy**.
3. Check **Use existing Build Cache** if you want, then confirm.

## Quick checklist

- [ ] Vercel project **Settings** → **Git** shows the correct **Connected Git Repository**.
- [ ] **Production Branch** is correct (e.g. `main`).
- [ ] If your repo is a monorepo and you see **Root Directory** in Settings → General, set it to the app folder (e.g. `money-magnet`).
- [ ] GitHub **Settings** → **Webhooks** has a Vercel webhook with recent **200** deliveries for `push`.
- [ ] **Ignored Build Step** is not forcing every build to be skipped.

After fixing, push a small change (e.g. empty commit: `git commit --allow-empty -m "Trigger Vercel" && git push`) and confirm a new deployment appears under **Deployments**.

---

## GitHub Actions workflow (`.github/workflows/vercel-build.yml`)

A workflow runs on every push to `main` / `master` and:

1. **Runs the build** so you get a green check and know the build works.
2. **Optionally triggers Vercel**: If you add a repo secret **`VERCEL_DEPLOY_HOOK`** with your [Vercel Deploy Hook](https://vercel.com/docs/deployments/deploy-hooks) URL, the workflow will call it after a successful build so Vercel starts a deployment even if the Git webhook didn’t fire.

**If this app lives in a monorepo** (repo root is the parent of `money-magnet`): move `.github` to the repo root and in the workflow set the default working directory to this app, e.g. `defaults: run: working-directory: money-magnet`.

---
*Push a change to trigger Vercel; check Deployments in the dashboard.*
