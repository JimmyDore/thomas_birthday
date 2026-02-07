---
phase: "03-ship-it"
plan: "01"
subsystem: "deployment"
tags: ["og-tags", "favicon", "github-actions", "ci-cd", "ssh-deploy"]
requires: ["02-complete-game"]
provides: ["github-repo", "deploy-workflow", "og-meta-tags", "deploy-ssh-key"]
affects: ["03-02"]
tech-stack:
  added: ["appleboy/ssh-action@v1"]
  patterns: ["git-pull-deploy", "ssh-action-ci"]
key-files:
  created: [".github/workflows/deploy.yml"]
  modified: ["index.html"]
key-decisions:
  - id: "03-01-og-description"
    decision: "OG description in French with Fruit Ninja parody hint"
    context: "WhatsApp/iMessage link preview needs to be funny and French"
  - id: "03-01-favicon-svg"
    decision: "Inline SVG emoji favicon (crossed swords) -- no file needed"
    context: "Simplest approach for emoji favicon, works in Chrome"
  - id: "03-01-deploy-strategy"
    decision: "SSH git-pull deploy via appleboy/ssh-action@v1"
    context: "Simplest CI/CD for static site on personal VPS"
  - id: "03-01-deploy-key"
    decision: "Dedicated ED25519 deploy key (no passphrase) for GitHub Actions"
    context: "Isolated key for CI/CD, not reusing personal SSH key"
duration: "2min"
completed: "2026-02-07"
---

# Phase 3 Plan 1: Local Deployment Assets Summary

OG meta tags for WhatsApp/iMessage link previews, emoji favicon, GitHub Actions SSH deploy workflow, GitHub repo with deploy secrets configured.

## Performance

- **Duration:** 2 minutes
- **Start:** 2026-02-07T14:02:31Z
- **End:** 2026-02-07T14:04:24Z
- **Tasks completed:** 3/3
- **Files created:** 1
- **Files modified:** 1

## Accomplishments

1. **OG meta tags and favicon** -- index.html now has a title, 7 Open Graph meta tags for rich link previews (WhatsApp, iMessage), and an inline SVG crossed-swords emoji favicon
2. **GitHub Actions workflow** -- Deploy pipeline triggers on push to master, SSHs into VPS, runs git pull in the web root
3. **GitHub infrastructure** -- Public repo created at github.com/JimmyDore/thomas_birthday, ED25519 deploy key generated and authorized on VPS, three secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY) configured

## Task Commits

| # | Task | Commit | Type |
|---|------|--------|------|
| 1 | Add OG meta tags, favicon, and title | `0b9c9b4` | feat |
| 2 | Create GitHub Actions deploy workflow | `b4d28ac` | feat |
| 3 | Create GitHub repo, deploy key, secrets, push | (infra-only, no file commit) | -- |

## Files Created

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | CI/CD pipeline -- SSH deploy on push to master |

## Files Modified

| File | Changes |
|------|---------|
| `index.html` | Added title, 7 OG meta tags, inline SVG emoji favicon |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| OG description: "Joyeux anniversaire Thomas ! Tranche les montres de luxe... mais gare aux contrefacons !" | Short, funny, in French, hints at Fruit Ninja parody |
| Inline SVG favicon with crossed swords emoji | Zero-file approach, works in Chrome (target browser) |
| appleboy/ssh-action@v1 for deploy | Most popular SSH action, ED25519 support, simple git-pull deploy |
| Dedicated ED25519 deploy key | Security isolation -- CI/CD uses its own key, not personal SSH key |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unicode escape in HTML meta content**
- **Found during:** Task 1
- **Issue:** `\u00e7` literal string written in og:description instead of actual UTF-8 c-cedilla character
- **Fix:** Replaced `\u00e7` with actual `c` character in "contrefacons"
- **Files modified:** index.html

No other deviations.

## Issues Encountered

None. All infrastructure steps (repo creation, SSH key generation, VPS key authorization, secret configuration) completed without errors.

## Next Phase Readiness

**Ready for 03-02 (VPS Setup):** All local/GitHub-side work is complete. The next plan needs to:
1. SSH into VPS and create the web root directory
2. Git clone the repo on the VPS
3. Configure nginx server block for coupe-des-montres.jimmydore.fr
4. Run certbot for SSL certificate
5. Test end-to-end deploy by pushing a change
