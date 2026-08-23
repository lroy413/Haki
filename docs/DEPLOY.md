# Deploying Haki

**Setup is done.** It is live at
[haki-lac.vercel.app](https://haki-lac.vercel.app), and the loop is:

```
Claude pushes a branch  →  opens a PR into main  →  CI + a preview URL  →  merge  →  production
```

Skip to _Verifying a deploy_ for the day-to-day. Steps 1 and 2 are kept as a
record of how it was wired, and for the day it needs wiring again.

---

## Step 1 — create `main` ✅ done

The repo began with one branch, `claude/haki-app-brainstorm-m6z8d7`, as the
default, so there was nothing to merge _into_.

On GitHub: **Settings → General → Default branch → the ✏️ pencil → rename to
`main` → Rename branch.**

---

## Step 2 — connect Vercel ✅ done

1. [vercel.com](https://vercel.com) → **Add New… → Project** → import `lroy413/Haki`.
2. Vercel reads `vercel.json` from the repo, so **change nothing** on the
   configure screen. It already sets:
   - build command `npm run build:web`
   - output directory `dist`
   - the two cross-origin isolation headers
   - the SPA rewrite
3. **Deploy.**

You get a URL like `haki-xxxx.vercel.app`. Every merge into `main` redeploys it
automatically; every PR gets its own preview URL.

> Netlify and Cloudflare Pages work too — `public/_headers` and
> `public/_redirects` are committed for them. Build command `npm run build:web`,
> publish directory `dist`.
>
> **GitHub Pages will not work.** See _Why the headers matter_ below.

---

## Step 3 — put it on your phone

Open the Vercel URL in **Safari** on your iPhone → **Share** → **Add to Home
Screen**.

You get the 覇 icon, no browser chrome, and it works offline. Check
**Settings → Your data → Export data** once on day one: if that produces a file,
your data can always get out again.

---

## Verifying a deploy

Two things are worth checking every time, and both take seconds.

**The headers**, because they are the one thing that can differ between local
and production and silently break the database:

```bash
curl -sSI https://haki-lac.vercel.app/ | grep -i cross-origin
```

**That the bytes are the bytes you tested.** Expo content-hashes every file, so
the strongest check available is comparing the whole built output against what
is actually being served. If every file matches, production _is_ the build you
drove in a browser:

```bash
npm run build:web
cd dist && find . -type f | while read -r f; do
  rel="${f#./}"
  curl -sS "https://haki-lac.vercel.app/$rel" -o /tmp/p.bin
  [ "$(sha256sum "$f" | cut -d' ' -f1)" = "$(sha256sum /tmp/p.bin | cut -d' ' -f1)" ] \
    || echo "DIFFERS: $rel"
done
```

Silence means every file is identical. A deploy that is still building will
show the old bundle hash in `index.html` — wait and run it again rather than
assuming it failed.

---

## Why the headers matter

`expo-sqlite`'s web build drives its worker over `SharedArrayBuffer`, and
browsers only hand that to a **cross-origin-isolated** page. Without both of:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

…the database never opens and the app boots to an error screen. This is why
GitHub Pages is out — it cannot set custom response headers — and why
`npx serve dist` fails locally while `npm run serve:web` works.

If the deployed app shows the database error, check the response headers first:

```bash
curl -sI https://your-app.vercel.app | grep -i cross-origin
```

Both lines should be there.

---

## iOS requirement

Persistence uses OPFS. **iOS 17+** is the safe floor. On an older iOS the app
loads but cannot open its database.

---

## Moving to the native app later

The PWA and the native app are **two separate databases**. Nothing syncs
between them. To carry your data across:

1. In the PWA: **Settings → Your data → Export data** → save the `.json`.
2. Install the native build.
3. In the native app: **Settings → Your data → Import** → pick that file.

Import merges and never deletes, and it is idempotent — importing the same file
twice adds nothing the second time. If you are unsure whether it worked, just
run it again.

Verified end to end: exported from one browser profile, imported into a fresh
one, journal entry and training session both came back, second import reported
`0 added, 4 already here`.

**Known limit.** On the web, importing a backup with more than roughly six
tasks still corrupts the queries that follow it — the failure is down in
expo-sqlite's shared result buffer, below this app. Small exports restore
cleanly; a large one is not yet trustworthy on the PWA. Native does not use
that buffer, so the move _to_ native is the path this matters least on.

---

## Day-to-day after setup

| You want    | What happens                                                                     |
| ----------- | -------------------------------------------------------------------------------- |
| A change    | Claude pushes a branch and opens a PR into `main`                                |
| To check it | CI runs typecheck, tests, and both bundles on the PR; Vercel posts a preview URL |
| To ship it  | Merge the PR. `main` redeploys in about a minute.                                |
| To undo it  | Vercel → Deployments → the previous one → **Promote to Production**              |
