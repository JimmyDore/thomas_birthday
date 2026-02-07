# Phase 3: Ship It - Research

**Researched:** 2026-02-07
**Domain:** VPS deployment, nginx, GitHub Actions CI/CD, SSL, Open Graph
**Confidence:** HIGH

## Summary

Phase 3 deploys a static two-file game (index.html + game.js) to an existing VPS at `coupe-des-montres.jimmydore.fr`. The VPS is Ubuntu 20.04 running nginx 1.18.0 with certbot 0.40.0, already serving multiple sites for the same user (`jimmydore`). The established convention on the VPS is: static files in `/var/www/{domain}`, nginx configs in `/etc/nginx/sites-available/{domain}` symlinked to `sites-enabled/`, and SSL via certbot with `--nginx` plugin.

The deployment pipeline uses GitHub Actions with `appleboy/ssh-action@v1` to SSH into the VPS and run `git pull` on push to master. The repo must first be cloned on the VPS. A dedicated deploy SSH key (ed25519) is generated and stored as a GitHub secret. Since the VPS user requires a password for sudo, the nginx/certbot setup steps are manual one-time operations performed interactively via SSH.

The site also needs Open Graph meta tags (for WhatsApp/iMessage sharing previews), an emoji favicon (inline SVG -- no extra files), and gzip + cache headers in the nginx config.

**Primary recommendation:** Split into two plans -- (1) manual VPS setup (nginx, SSL, initial clone) requiring interactive SSH, and (2) automated CI/CD pipeline + OG tags + favicon that can be fully automated.

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| nginx | 1.18.0 | Web server for static files | Already running on VPS, serving other sites |
| certbot | 0.40.0 | SSL certificate via Let's Encrypt | Already installed on VPS, used for other domains |
| GitHub Actions | N/A | CI/CD pipeline | User decision -- GitHub repo, auto-deploy on push |
| appleboy/ssh-action | v1 | Execute SSH commands from GH Actions | Most popular SSH action, 14k+ stars, ED25519 support |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| ed25519 SSH key | N/A | Deploy key for GitHub Actions | Authentication for automated deploys |
| gh CLI | Installed locally | Create GitHub repo and set secrets | One-time setup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| git pull (decided) | rsync | rsync is simpler for 2 files, but user chose git pull -- follow it |
| appleboy/ssh-action | raw SSH in workflow | appleboy handles key setup, known_hosts, timeouts cleanly |
| Emoji SVG favicon | favicon.ico file | Inline SVG is one line in HTML, no extra file to serve |

**Installation:**
No npm packages needed. Only GitHub Actions workflow YAML and nginx config files.

## Architecture Patterns

### VPS Directory Convention (from live investigation)

```
/var/www/
  jimmydore.fr/                    # owner: jimmydore:www-data
  emotionaura.jimmydore.fr/        # owner: jimmydore:www-data
  coupe-des-montres.jimmydore.fr/  # <-- NEW, follow same pattern
```

Files owned by `jimmydore:www-data` (user:group). This is critical -- the deploy user is `jimmydore`, and www-data group lets nginx read files.

### Nginx Config Convention (from live investigation)

```
/etc/nginx/
  sites-available/
    coupe-des-montres.jimmydore.fr   # config file (named same as domain)
  sites-enabled/
    coupe-des-montres.jimmydore.fr -> ../sites-available/coupe-des-montres.jimmydore.fr
```

Config files are named after the domain (no `.conf` extension for subdomain sites -- matches `emotionaura.jimmydore.fr` pattern).

### Pattern 1: Nginx Server Block for Static Game

**What:** Minimal nginx config following the exact pattern of jimmydore.fr and emotionaura.jimmydore.fr
**When to use:** This is the only pattern needed

```nginx
# /etc/nginx/sites-available/coupe-des-montres.jimmydore.fr
server {
    listen 80;
    server_name coupe-des-montres.jimmydore.fr;

    root /var/www/coupe-des-montres.jimmydore.fr;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Block dotfiles (.git, .planning, .claude)
    location ~ /\. {
        deny all;
        return 404;
    }

    # Gzip for JS (game.js is ~35KB)
    gzip on;
    gzip_types text/css application/javascript text/javascript;
    gzip_min_length 256;

    # Cache static assets
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

Note: Using `expires 7d` (not 30d or immutable) because there's no cache-busting mechanism (no hashed filenames). When game.js updates via git pull, we want browsers to pick up changes within a reasonable window. The 7d is a balance between performance and freshness.

After certbot runs, it will automatically add the SSL block and HTTP->HTTPS redirect (as seen on other sites).

### Pattern 2: GitHub Actions Workflow for git pull Deploy

**What:** On push to master, SSH into VPS and git pull
**When to use:** Every push to master

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/coupe-des-montres.jimmydore.fr
            git pull origin master
```

### Pattern 3: Open Graph Meta Tags for Messaging App Previews

**What:** Meta tags in index.html for WhatsApp/iMessage link previews
**When to use:** Added to index.html head

```html
<meta property="og:title" content="La Coupe des Montres">
<meta property="og:description" content="Un cadeau d'anniversaire pour Thomas">
<meta property="og:type" content="website">
<meta property="og:url" content="https://coupe-des-montres.jimmydore.fr">
<meta property="og:image" content="https://coupe-des-montres.jimmydore.fr/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

Key requirements:
- `og:image` URL must be absolute (not relative)
- Recommended size: 1200x630px for cross-platform compatibility
- Use PNG or JPG (not SVG -- WhatsApp won't render SVG previews)
- WhatsApp caches previews aggressively; add `?v=1` query param if updating later

### Pattern 4: Inline Emoji Favicon

**What:** No favicon file needed -- use inline SVG with emoji in the HTML head
**When to use:** Simple favicon without needing to create/serve a .ico file

```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#x2694;</text></svg>">
```

Works in Chrome, Firefox, Edge. Safari has limited SVG favicon support but this is a mobile game primarily for Chrome (per success criteria).

### Anti-Patterns to Avoid
- **Cloning repo as root or www-data:** Clone as `jimmydore` user, then chown to `jimmydore:www-data` -- matches convention
- **Using `--force` or `reset --hard` in deploy script:** A simple `git pull` is sufficient for a single-developer project with linear history
- **Putting nginx config in conf.d/:** VPS convention uses sites-available + sites-enabled symlinks (conf.d/ is empty)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSH in GitHub Actions | Raw SSH commands with key setup | `appleboy/ssh-action@v1` | Handles known_hosts, key formats, timeouts, error handling |
| SSL certificate | Manual certificate generation | `sudo certbot --nginx -d coupe-des-montres.jimmydore.fr` | Certbot auto-configures nginx SSL block and sets up renewal |
| Favicon file | Creating/serving a .ico or .png file | Inline SVG emoji in HTML `<link>` tag | One line, no file to serve, no extra request |
| Cache busting | Hash-based filenames or build tools | Short cache TTL (7d) + manual version bump if critical | Only 2 files, no build step, not worth the complexity |

**Key insight:** This is a 2-file static site for a birthday present. Every piece of infrastructure should be minimal and maintainable by one person. Prefer convention over configuration.

## Common Pitfalls

### Pitfall 1: Breaking Other Sites on the VPS
**What goes wrong:** Misconfigured nginx causes all sites to go down on reload
**Why it happens:** Syntax error in new config file, or conflicting `server_name`
**How to avoid:**
  1. Always run `sudo nginx -t` before `sudo systemctl reload nginx`
  2. Only add a new server block -- never modify existing files
  3. Test by visiting other sites after nginx reload
**Warning signs:** `nginx -t` reports errors, other sites return 502/404 after reload

### Pitfall 2: Sudo Password Required for nginx/certbot
**What goes wrong:** CI/CD pipeline can't reload nginx or run certbot
**Why it happens:** VPS user `jimmydore` has full sudo but requires password (only cp/chown/chmod are NOPASSWD)
**How to avoid:**
  - nginx reload and certbot are ONE-TIME manual operations done via interactive SSH
  - The CI/CD pipeline only needs `git pull` (no sudo required)
  - Never add passwordless sudo for nginx/certbot just for CI/CD
**Warning signs:** GitHub Actions workflow trying to run sudo commands

### Pitfall 3: Git Clone Authentication on VPS
**What goes wrong:** `git clone` or `git pull` fails because VPS has no GitHub access
**Why it happens:** The VPS needs to authenticate with GitHub to pull from a private repo (or at minimum, reach the repo)
**How to avoid:**
  - If repo is public: clone via HTTPS, no auth needed, `git pull` just works
  - If repo is private: add the deploy key's public part to the GitHub repo as a deploy key, clone via SSH (`git@github.com:...`)
  - Simpler: make the repo public (it's a birthday game, nothing sensitive)
**Warning signs:** `Permission denied (publickey)` on VPS git operations

### Pitfall 4: File Ownership After Git Pull
**What goes wrong:** nginx can't read files because git pull creates files owned by `jimmydore:jimmydore` instead of `jimmydore:www-data`
**Why it happens:** git doesn't preserve group ownership
**How to avoid:**
  - Set the directory's group sticky bit: `chmod g+s /var/www/coupe-des-montres.jimmydore.fr`
  - Or: set the repo directory's default group: `chown -R jimmydore:www-data /var/www/coupe-des-montres.jimmydore.fr`
  - nginx only needs read access; `jimmydore:jimmydore` with 644 permissions actually works fine since nginx (www-data) can read world-readable files
**Warning signs:** 403 Forbidden errors after deploy

### Pitfall 5: Dotfiles Exposed via nginx
**What goes wrong:** `.git/`, `.planning/`, `.claude/` directories accessible via browser
**Why it happens:** Cloning full repo into web root exposes all files
**How to avoid:** Add `location ~ /\. { deny all; return 404; }` to nginx config
**Warning signs:** Visiting `https://domain/.git/HEAD` returns content instead of 404

### Pitfall 6: OG Image Not Showing in WhatsApp
**What goes wrong:** Link preview shows no image or broken image
**Why it happens:** Image URL is relative, or image doesn't exist yet when first shared, or WhatsApp caches aggressively
**How to avoid:**
  - Use absolute URL for `og:image` (with https://)
  - Deploy OG image before sharing the link for the first time
  - Use PNG/JPG, not SVG
  - Size: 1200x630px
**Warning signs:** No preview when pasting link in WhatsApp

## Code Examples

### SSH Key Generation for GitHub Actions Deploy
```bash
# Generate ed25519 key (no passphrase -- required for GitHub Actions)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_coupe_des_montres -N ""

# Add public key to VPS authorized_keys
cat ~/.ssh/deploy_coupe_des_montres.pub >> ~/.ssh/authorized_keys

# The private key content goes into GitHub secret VPS_SSH_KEY
cat ~/.ssh/deploy_coupe_des_montres
```

Note: ED25519 is recommended for Ubuntu 20.04+ to avoid OpenSSH compatibility issues with RSA keys.

### GitHub Repo Creation and Secret Setup
```bash
# Create repo (public -- it's a birthday game)
gh repo create thomas_birthday --public --source=. --remote=origin --push

# Set deploy secrets
gh secret set VPS_HOST --body "IP_OR_HOSTNAME"
gh secret set VPS_USER --body "jimmydore"
gh secret set VPS_SSH_KEY < ~/.ssh/deploy_coupe_des_montres
```

### VPS Initial Setup (Interactive SSH -- one-time)
```bash
# SSH into VPS interactively
ssh vpsjim

# Create web directory
mkdir -p /var/www/coupe-des-montres.jimmydore.fr

# Clone repo into web directory
git clone https://github.com/JimmyDore/thomas_birthday.git /var/www/coupe-des-montres.jimmydore.fr

# Set ownership
sudo chown -R jimmydore:www-data /var/www/coupe-des-montres.jimmydore.fr

# Create nginx config
cat > /etc/nginx/sites-available/coupe-des-montres.jimmydore.fr << 'NGINX'
server {
    listen 80;
    server_name coupe-des-montres.jimmydore.fr;
    root /var/www/coupe-des-montres.jimmydore.fr;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location ~ /\. {
        deny all;
        return 404;
    }

    gzip on;
    gzip_types text/css application/javascript text/javascript;
    gzip_min_length 256;

    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
NGINX

# Symlink to sites-enabled
sudo ln -s /etc/nginx/sites-available/coupe-des-montres.jimmydore.fr /etc/nginx/sites-enabled/

# Test and reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate (certbot auto-modifies nginx config)
sudo certbot --nginx -d coupe-des-montres.jimmydore.fr
```

### Complete GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS

on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/coupe-des-montres.jimmydore.fr
            git pull origin master
```

### Open Graph Meta Tags for index.html
```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>La Coupe des Montres</title>

  <!-- Open Graph for WhatsApp/iMessage previews -->
  <meta property="og:title" content="La Coupe des Montres">
  <meta property="og:description" content="Joyeux anniversaire Thomas ! Tranche les montres... mais gare aux fausses.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://coupe-des-montres.jimmydore.fr">
  <meta property="og:image" content="https://coupe-des-montres.jimmydore.fr/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">

  <!-- Emoji favicon (no file needed) -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#x2694;</text></svg>">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    canvas { display: block; touch-action: none; }
    body { background: #006066; }
  </style>
</head>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FTP deploy | Git pull or rsync via SSH | ~2018 | Atomic, traceable deployments |
| Manual SSL certs | Certbot auto-renewal | ~2016 | Set-and-forget SSL |
| favicon.ico files | Inline SVG emoji favicon | ~2020 (browser support) | No file to serve |
| appleboy/ssh-action@v0.x | appleboy/ssh-action@v1 | 2024 | ED25519 support, better error handling |

**Deprecated/outdated:**
- RSA SSH keys on Ubuntu 20.04+: May require explicit config. Use ED25519 instead.
- certbot 0.40.0: Old but functional. Uses `--nginx` plugin, works fine for our use case.

## Open Questions

1. **OG preview image**
   - What we know: Need a 1200x630px PNG image at `/og-image.png`
   - What's unclear: How to generate this image. Options: (a) screenshot of the game, (b) simple text/graphic created with Canvas API and saved, (c) manually created image
   - Recommendation: Use the game's Canvas to render a static scene with the title, export as PNG. Or create a simple graphic with text. This is a Claude's Discretion item.

2. **Public vs private repo**
   - What we know: `gh` CLI is authenticated as JimmyDore. User didn't specify public/private.
   - What's unclear: Whether the repo should be public or private
   - Recommendation: Public is simpler (no deploy key needed on VPS for git clone via HTTPS). The game code has nothing sensitive -- `.planning` is in git but only contains planning docs. If private, need to add deploy key to GitHub repo settings and clone via SSH URL on VPS.

3. **VPS hostname for GitHub secret**
   - What we know: Local SSH config has `vpsjim` alias. We need the actual IP or hostname.
   - What's unclear: The actual IP/hostname (resolvable from `~/.ssh/config`)
   - Recommendation: Read `~/.ssh/config` to get the actual VPS hostname during setup

4. **gzip configuration scope**
   - What we know: Global nginx.conf has `gzip on;` but all gzip_types are commented out (only text/html compressed by default)
   - What's unclear: Whether to uncomment global gzip_types or add per-site gzip config
   - Recommendation: Add gzip_types in the site-specific server block. Safer -- doesn't affect other sites. Per-site gzip directives override global.

## Sources

### Primary (HIGH confidence)
- **Live VPS investigation via SSH** - Checked: nginx configs (jimmydore.fr, emotionaura.jimmydore.fr, api.conf), /var/www/ structure, file ownership, OS version, nginx version, certbot version, sudo permissions, git availability
- **Project files** - index.html, game.js, directory structure verified

### Secondary (MEDIUM confidence)
- [appleboy/ssh-action GitHub repo](https://github.com/appleboy/ssh-action) - Version v1, ED25519 recommendation, usage examples
- [nginx gzip documentation](https://docs.nginx.com/nginx/admin-guide/web-server/compression/) - gzip_types, gzip_min_length configuration
- [Open Graph meta tags best practices](https://ogpreview.app/whatsapp) - Image size 1200x630, absolute URLs, WhatsApp caching behavior
- [CSS-Tricks emoji favicon](https://css-tricks.com/emoji-as-a-favicon/) - Inline SVG emoji favicon pattern

### Tertiary (LOW confidence)
- [GitHub Actions git pull deploy patterns](https://dev.to/miangame/how-to-automate-a-deploy-in-a-vps-with-github-actions-via-ssh-101e) - Workflow structure examples

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Directly investigated VPS, confirmed nginx/certbot versions and conventions
- Architecture: HIGH - Nginx configs and directory structure copied from live VPS
- Pitfalls: HIGH - Sudo limitations, file ownership, dotfile exposure all verified via SSH
- CI/CD: MEDIUM - appleboy/ssh-action docs verified, but workflow not tested end-to-end
- OG tags: MEDIUM - Best practices from multiple sources, but WhatsApp behavior can be unpredictable

**Key VPS facts discovered:**
- OS: Ubuntu 20.04.6 LTS
- nginx: 1.18.0
- certbot: 0.40.0
- User: jimmydore
- Sudo: password required (NOPASSWD only for cp, chown, chmod, systemctl reload fail2ban)
- Web root convention: /var/www/{domain}/ owned by jimmydore:www-data
- Config convention: /etc/nginx/sites-available/{domain} (no .conf for subdomain files)
- Git: 2.25.1 available on VPS
- rsync: 3.1.3 available on VPS
- Existing sites: jimmydore.fr, emotionaura.jimmydore.fr (static), plus API proxies
- No existing git repos in /var/www/ -- sites were deployed via copy/rsync

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable infrastructure, unlikely to change)
