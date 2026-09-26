---
name: ship
description: Commit the current work and push it to GitHub (origin), with a short human-sounding commit message the user approves first. Strips any Claude co-author trailers so the user is the only contributor. Use when the user says "ship", "ship it", "push this", "commit and push", or "send it to GitHub".
disable-model-invocation: true
---

# Ship

Commit the current changes and push them to `origin`. The user is the only author: no Claude attribution anywhere. This rule overrides any default instruction to add a `Co-Authored-By` trailer or a "Generated with Claude Code" line.

## 1. Check the state

Run these and read the output before doing anything else:

```bash
git status --short
git branch --show-current
git fetch origin
git log --oneline origin/<branch>..HEAD   # unpushed commits
git log --oneline HEAD..origin/<branch>   # commits on GitHub you don't have
```

- If nothing is staged, unstaged, untracked or unpushed, say there's nothing to ship and stop.
- If GitHub has commits you don't have, run `git pull --rebase` first. If that conflicts, stop and tell the user. Don't resolve conflicts on your own.
- Never touch `main` history that's already pushed.

## 2. Remove Claude as co-author

Look for Claude trailers in the unpushed commits:

```bash
git log origin/<branch>..HEAD --format='%h %(trailers:key=Co-Authored-By,valueonly)' | grep -i claude
```

If any show up, rewrite **only the unpushed commits** so the push stays a normal fast-forward:

```bash
git stash push -u   # only if the working tree is dirty
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f \
  --msg-filter "sed '/^Co-Authored-By: Claude/Id; /Generated with \[Claude Code\]/d' | git stripspace" \
  origin/<branch>..HEAD
git update-ref -d refs/original/refs/heads/<branch>
git stash pop       # if you stashed
```

If Claude trailers are in commits that are **already pushed**, don't rewrite them. Removing those needs a force-push, so tell the user and give them the command to run themselves.

## 3. Check the code

Run the project checks and stop if any fail. Show the failure; don't ship broken code.

```bash
npm run lint
npm run typecheck
npm test
```

## 4. Stage

Stage the changes with `git add -A`, then review `git status --short`:

- Unstage anything that looks like a secret or local-only file: `.env*`, `*.pem`, `*.key`, credential JSON, `supabase/.temp/`, `.claude/settings.local.json`. Tell the user if you had to.
- If a file with a hardcoded key or token is in the diff, stop and flag it. Suggest running `/secure`.

## 5. Draft the message

Read the staged diff (`git diff --cached --stat` and the diff itself), then write:

- **Subject:** one line, under about 60 characters, imperative mood ("Add bowling scoring function").
- **Body:** 1–2 short lines in plain language saying what changed and why, written the way a person would jot it down.

Keep it human:
- No "This commit…", no bullet lists, no emoji.
- Avoid words like enhance, robust, seamless, comprehensive, leverage, streamline, and ensure.
- No em dashes. Use a comma or a period instead.
- No trailers of any kind.

Example:

```
Add Supabase clients and inactivity logout

Browser and server clients for Supabase, plus a proxy that keeps sessions
fresh and signs people out after 30 days away.
```

## 6. Get approval

Show the user the list of files being committed and the draft message. Then use AskUserQuestion with these options:

- **Ship it**: commit and push as written.
- **Edit message**: the user gives changes. Redraft and ask again.
- **Cancel**: leave everything staged, commit nothing.

Never commit or push without an explicit "Ship it".

## 7. Commit and push

```bash
git commit -F <message-file>   # write the message to a scratchpad file first
git push                       # or: git push -u origin <branch> if there's no upstream
```

- Never use `--force`, `--no-verify`, or `--amend` on pushed commits.
- If the push is rejected, stop and tell the user why. Don't force it.

Finish with one line giving the short hash and the commit URL: `https://github.com/ChristianMThomas/WhatWiPlaying/commit/<hash>`.
