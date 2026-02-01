# Git setup for Money Magnet

If git commands are failing (especially `push` / `pull` / `fetch`), use this guide.

## 1. Run the diagnostic script

From the **money-magnet** folder (your repo root):

```bash
bash scripts/git-diagnose.sh
```

Or open a terminal in Cursor/VS Code (Terminal → New Terminal) and run it. The script prints branch, remote, status, and tries a fetch. If you see errors there, use the sections below.

## 2. Make sure you're in the right folder

Git must run from the repo root (where `.git` lives). If your workspace is the whole `projects` folder, run git from the money-magnet subfolder:

```bash
cd money-magnet
git status
```

Or from anywhere:

```bash
git -C /path/to/money-magnet status
```

## 3. Fix authentication (push/fetch failing)

GitHub no longer accepts account passwords for HTTPS. You need either a **Personal Access Token (PAT)** or **SSH**.

### Option A: HTTPS with Personal Access Token

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. **Generate new token**. Give it a name, set expiry, and enable at least **repo** (and **workflow** if you push `.github/workflows`).
3. Copy the token (you won’t see it again).
4. When you run `git push` or `git fetch`, use the token as the **password** when Git asks for credentials.
5. To store it so you don’t type it every time:
   - **macOS**: Git will use the Keychain. After one successful push with the token, it’s stored.
   - Or set a credential helper:
     ```bash
     git config --global credential.helper store
     ```
     (Next push: enter username + token as password; they’ll be saved in plain text.)

### Option B: SSH

1. Create an SSH key (if you don’t have one):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com" -f ~/.ssh/id_ed25519_github
   ```
2. Add the **public** key to GitHub: **Settings** → **SSH and GPG keys** → **New SSH key**.
3. Switch the repo to SSH and push:
   ```bash
   cd money-magnet
   git remote set-url origin git@github.com:mikeheldar/money-magnet.git
   git push origin main
   ```

## 4. Pushing workflow files (`.github/workflows`)

If you get:

```text
refusing to allow an OAuth App to create or update workflow ... without `workflow` scope
```

then the app (e.g. Cursor) doesn’t have permission to change workflows. Options:

- **Push from terminal** using your own credentials (HTTPS + PAT or SSH) so your user’s permissions apply.
- Or add/update the workflow file on GitHub in the browser (repo → create/edit file under `.github/workflows/`).

## 5. Check remote and branch

```bash
cd money-magnet
git remote -v
# Should show: origin  https://github.com/mikeheldar/money-magnet.git (or git@github.com:...)

git branch -vv
# main should track origin/main
```

If `origin` is wrong or missing:

```bash
git remote remove origin
git remote add origin https://github.com/mikeheldar/money-magnet.git
# Or for SSH: git remote add origin git@github.com:mikeheldar/money-magnet.git
git fetch origin
git branch --set-upstream-to=origin/main main
```

## 6. Cursor/IDE terminal shows no output

If the integrated terminal runs git but shows no output:

- Run the same commands in an **external terminal** (e.g. Terminal.app, iTerm) from the `money-magnet` folder.
- Or run `bash scripts/git-diagnose.sh` there and read the printed output.

## Quick reference

| Problem              | What to do                                      |
|---------------------|-------------------------------------------------|
| Push asks for password | Use a PAT as password, or switch to SSH.     |
| “Permission denied” / 403 | Check PAT scopes or SSH key on GitHub.      |
| “Workflow scope” error   | Push from terminal or edit workflow on GitHub. |
| “Not a git repository”    | `cd` into the `money-magnet` folder.         |
| Wrong repo / remote      | Fix with `git remote set-url origin ...`.   |
