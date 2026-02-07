# Phase 3: Ship It - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy the Watch Ninja game live at coupe-des-montres.jimmydore.fr with HTTPS and auto-deploys on push to master. The game is a static vanilla JS + Canvas site — no build step, no server-side logic.

</domain>

<decisions>
## Implementation Decisions

### Hosting setup
- Deploy to existing VPS accessible via `ssh vpsjim`
- **Be extra careful** — VPS hosts other services, do not break anything
- Static files only — no Docker container. Drop HTML/JS/CSS into a folder, add an nginx server block
- Nginx is already running on the VPS serving other sites
- File location: check existing sites on VPS to follow the same convention (likely /var/www/ or similar)

### SSL & DNS
- Domain: `coupe-des-montres.jimmydore.fr` (NOT roi-du-vinted — update roadmap references)
- A record already points to the VPS — no DNS changes needed
- SSL via Certbot / Let's Encrypt (already set up on VPS for other sites)
- Run certbot to obtain a cert for coupe-des-montres.jimmydore.fr

### CI/CD pipeline
- GitHub repo, use GitHub Actions
- Deploy method: SSH into VPS + `git pull` on the server
- Trigger: push to `master` branch
- Need to create a deploy SSH key and add it as a GitHub secret
- Clone/init the repo on the VPS so `git pull` works

### Caching & mobile performance
- Keep it simple — standard nginx gzip + sensible cache headers
- No PWA, no service worker, no minification
- Online-only is fine
- Add Open Graph meta tags for nice WhatsApp/iMessage sharing previews
- Add a favicon

### Claude's Discretion
- OG title/description text (something funny and fitting for Thomas's birthday)
- Favicon design/source
- Exact nginx config details (server block, gzip settings, cache headers)
- Exact GitHub Actions workflow structure
- Where to place files on VPS (follow existing convention found during research)

</decisions>

<specifics>
## Specific Ideas

- The VPS is shared — any server changes must be non-destructive and isolated to this site
- The game URL will be shared via messaging apps, so the OG preview matters for the "reveal" moment
- Domain is `coupe-des-montres` ("watch cutting") which fits the Fruit Ninja parody theme

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-ship-it*
*Context gathered: 2026-02-07*
