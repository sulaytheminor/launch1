# STMC Helper

A minimal, dark-mode-first React foundation for the STMC Helper toolset.

## What's here

- Landing screen with a "connect solana wallet" placeholder button (no real
  wallet integration yet — just UI state).
- Post-connection layout with a collapsible sidebar (Home, Settings) and
  persistent "STMC helper" branding in the top-left.
- Settings page with a wallet disconnect action, a Black/White theme
  switcher, and a contact bar.
- A full theme system driven by CSS variables (`src/index.css`), so future
  pages/tools automatically pick up whichever theme is active.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs a static site to `dist/`.

## Deploying to Netlify

This repo includes a `netlify.toml` already configured with:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect (`/* -> /index.html`) so client-side navigation works.

Just connect the repo (or drag-and-drop the `dist/` folder) in Netlify — no
extra configuration needed.

## Project structure

```
src/
  context/ThemeContext.jsx   # theme state (black/white), no localStorage
  components/
    Landing.jsx              # pre-connection screen
    Sidebar.jsx               # collapsible left nav
    Logo.jsx                  # "STMC helper" branding
    Home.jsx                  # placeholder for future STMC tools
    Settings.jsx               # wallet, theme, contact
  App.jsx                     # top-level state: connection, active page, sidebar
```

## Adding future tools

Add a new component under `src/components/`, add a nav entry in
`Sidebar.jsx`'s `NAV_ITEMS`, and render it in `App.jsx` alongside `Home` and
`Settings`. Every component automatically inherits the active theme through
the CSS variables set on `.app-root`.
