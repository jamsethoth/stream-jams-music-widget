# Stream Jams Music Widget

Stream Jams Music Widget is a small static HTML overlay intended for use as a browser source in OBS Studio. Its goal is to give stream viewers a clean, minimal view of the music currently playing on the user's local system without taking over the scene.

The app is planned as a compact now-playing display that can sit in a corner, along an edge, or within a small reserved area of a stream layout. It should be readable at streaming resolutions, visually quiet enough not to distract from the main content, and flexible enough to match different scene styles.

## Intended Display

The overlay should show the essential context for the current track:

- Song name
- Artist name
- Album name
- Album art
- Playback progress through the song

The playback progress should be represented with a playhead or progress bar so viewers can tell roughly how far along the current song is.

## Integration Direction

Stream Jams Music Widget is intended to eventually support integrations with local music playback sources. Spotify and YouTube Music are the initial targets, but the exact integration strategy is intentionally left undecided for now.

Possible future directions may include:

- Reading metadata from Spotify
- Reading metadata from YouTube Music
- Listening to a small local companion process
- Accepting track metadata from a configurable local endpoint
- Falling back to manually supplied or mocked track data during development

The first implementation plan should decide how much of this surface belongs in the static overlay itself and what should remain outside the browser source.

## Design Goals

- Static HTML-first: easy to load directly or serve locally for OBS.
- OBS-friendly: sized and styled for use as a browser source.
- Minimal: compact layout, restrained visual treatment, and no unnecessary controls.
- Legible: clear hierarchy for song, artist, album, and playback state.
- Integration-ready: structured so playback data can later come from Spotify, YouTube Music, or another local source.
- Stream-safe: no secrets, credentials, or private playback tokens embedded in the static page.

## First Iteration

This repository now contains a static first pass of the widget:

- `setup.html` builds an OBS-ready overlay URL.
- `index.html` renders the overlay.
- `browser/` contains file-safe classic browser scripts used by the HTML entrypoints.
- `src/` contains testable ES modules for config parsing, source integration, state normalization, progress interpolation, and rendering.
- `tests/` covers the pure behavior that should stay stable as integrations are added.
- `.github/workflows/validate.yml` is ready to run validation in GitHub Actions.

The planned default Pear Desktop URL is:

```text
index.html?integration=pear-youtube-music&host=127.0.0.1&port=26538&transport=auto&initialView=full&idleMode=none&idleAfter=30&theme=dark
```

Mock mode is available for styling and smoke testing without Pear Desktop:

```text
index.html?integration=mock&theme=dark&initialView=full&idleMode=compact&idleAfter=30
```

## Development

The project is dependency-free for the first iteration and uses ES modules.
The checked-in HTML entrypoints intentionally load classic scripts from `browser/` so they can be opened directly from `file:///` in OBS or a browser without ES module CORS errors.

```bash
npm test
npm run validate
```

In this local workspace, Node is not available inside WSL 1, so the same test files can also be checked with Deno:

```bash
deno test --allow-read --no-check
deno run --allow-read scripts/validate-static-pages.js
```
