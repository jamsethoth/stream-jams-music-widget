# Stream Jams Music Widget

Stream Jams Music Widget is a small static HTML overlay for OBS Studio. It shows the current track playing on the streamer's local system in a compact, readable now-playing widget.

The widget is designed to sit in a corner, along an edge, or inside a reserved scene area without taking over the stream layout.

## Current Features

- OBS-friendly browser-source overlay.
- Guided setup page for generating an overlay URL.
- Pear Desktop YouTube Music integration.
- Mock integration for local styling and smoke testing.
- Full and compact overlay views.
- Dark and light themes.
- Playback progress display.
- Optional idle behavior to hide or collapse the widget.
- Optional `styles/custom-theme.css` override for local runtime styling.
- Runtime package generation for local hosting or direct file use.

## Runtime Files

The runtime widget is made of:

- `index.html`: the OBS overlay page.
- `setup.html`: the setup page for generating overlay URLs.
- `browser/`: generated classic browser scripts used by the HTML entrypoints.
- `styles/`: overlay and setup styling.

The HTML files intentionally load generated classic scripts from `browser/` so the widget can be opened directly from `file:///` in OBS or a browser without ES module CORS errors.

## Pear Desktop Setup

The first supported real integration is YouTube Music through Pear Desktop.

In Pear Desktop:

1. Enable the API Server plugin.
2. Set the API Server auth strategy to `NONE`.
3. Confirm the API host and port.
4. Open `setup.html`.
5. Generate the OBS overlay URL.
6. Add that URL as an OBS browser source.

The default Pear Desktop overlay URL is:

```text
index.html?integration=pear-youtube-music&host=127.0.0.1&port=26538&transport=auto&initialView=full&idleMode=none&idleAfter=30&theme=dark
```

## Custom Styling

The runtime automatically looks for an optional stylesheet at:

```text
styles/custom-theme.css
```

To customize the overlay, add that file manually to the `styles/` directory next to `overlay.css` in your runtime package. The widget loads `styles/custom-theme.css` after the default overlay stylesheet when it is present, so your rules can override the defaults. If the file is missing, the browser falls back to the default styles without any setup changes or URL parameters.

## Mock Mode

Mock mode is available for styling and smoke testing without Pear Desktop:

```text
index.html?integration=mock&theme=dark&initialView=full&idleMode=compact&idleAfter=30
```

## Project Structure

- `src/`: source of truth for application logic, written as testable ES modules.
- `browser/`: generated browser bundles built from `src/`; ignored by git and rebuilt during validation and packaging.
- `styles/`: CSS for the overlay and setup page.
- `tests/`: Node test coverage for config parsing, state normalization, progress interpolation, and Pear event handling.
- `scripts/`: build, validation, and runtime packaging scripts.
- `.github/workflows/validate.yml`: pull request and main-branch validation.
- `.github/workflows/release.yml`: manual release workflow that creates a runtime zip.

## Development

Install dependencies:

```bash
npm install
```

Build generated browser bundles:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Run the full validation suite:

```bash
npm run validate
```

Validation rebuilds the generated browser bundles before checking the static pages.

Create a local runtime package:

```bash
npm run package
```

Validate the generated runtime package:

```bash
npm run verify:package
```

The package command creates:

```text
dist/stream-jams-music-widget-v<version>.zip
```

That zip contains only the files needed to run or host the widget:

- `index.html`
- `setup.html`
- `browser/`
- `styles/`
- `README.md`
- `RELEASE.txt`

## Releases

Releases are created manually through the GitHub Actions `Release` workflow.

The release workflow:

1. Accepts a semantic version input.
2. Validates that the version is semantic and does not include a leading `v`.
3. Installs dependencies.
4. Validates tests and static files, rebuilding `browser/` from `src/`.
5. Creates and verifies a runtime-only zip.
6. Creates and pushes a `v<version>` tag.
7. Creates a GitHub Release with generated release notes.
8. Attaches the runtime zip as a downloadable release asset.

## Integration Direction

The overlay UI depends on a normalized music-source interface. Pear Desktop behavior is handled inside the Pear source adapter so future integrations can map their own APIs independently.

Potential future integrations include:

- Spotify metadata.
- A configurable local metadata endpoint.
- A small local companion process.
- Additional local music players.

The static overlay should remain stream-safe: no secrets, credentials, OAuth tokens, or private playback tokens should be embedded in the browser source.
