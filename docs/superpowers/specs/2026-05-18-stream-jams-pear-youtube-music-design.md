# Stream Jams Music Widget Pear Desktop YouTube Music Design

## Purpose

Stream Jams Music Widget is a static HTML and JavaScript OBS browser-source widget that shows the current track playing in YouTube Music through Pear Desktop. The first version should be display-only, easy to configure, and ready for future music integrations without coupling the overlay UI to Pear-specific API details.

## Scope

This design covers the first implementation of the Stream Jams Music Widget overlay, setup workflow, and Pear Desktop integration. It does not include playback controls, OAuth flows, a local backend service, a build system, or non-Pear integrations.

## User Experience

Stream Jams Music Widget has two static entrypoints:

- `setup.html`: a guided setup page for creating an OBS-ready overlay URL.
- `index.html`: the OBS overlay page.

If `index.html` is opened without the required URL parameters, it should show a compact configuration error with a link to `setup.html`. The overlay itself should not include setup controls.

The setup page walks the user through configuring YouTube Music via Pear Desktop:

1. Open Pear Desktop.
2. Enable the API Server plugin.
3. Set the API Server auth strategy to `NONE`.
4. Confirm host and port.
5. Choose transport, theme, view, idle behavior, and optional advanced CSS.
6. Test the connection.
7. Generate a full absolute URL for OBS.

The default generated URL should use:

```text
index.html?integration=pear-youtube-music&host=127.0.0.1&port=26538&transport=auto&initialView=full&idleMode=none&idleAfter=30&theme=dark
```

When setup is opened from `file:///`, the generated OBS URL should also be a full `file:///` URL. If setup is later served locally, it should generate the matching absolute HTTP URL.

## Pear Desktop API Findings

Pear Desktop's API Server plugin is the first integration target. The relevant API behavior is:

- Default API server port: `26538`.
- Default API server host: `0.0.0.0`.
- Default auth strategy: `AUTH_AT_FIRST`.
- Supported no-auth strategy: `NONE`.
- Current song endpoint: `GET /api/v1/song`.
- Real-time endpoint: `GET /api/v1/ws`.
- API docs endpoint: `/swagger`.
- OpenAPI JSON endpoint: `/doc`.

The overlay requires Pear's API Server auth strategy to be set to `NONE` for WebSocket mode. Pear's API routes use bearer-token auth by default, and browser WebSocket clients cannot set arbitrary `Authorization` headers. If a future Pear API version supports query-token WebSocket auth or another browser-compatible mechanism, authenticated WebSocket support can be revisited.

Pear's current song payload includes:

- `title`
- `artist`
- `album`
- `imageSrc`
- `isPaused`
- `songDuration`
- `elapsedSeconds`
- `url`
- `videoId`
- `playlistId`
- `mediaType`

Pear's WebSocket endpoint emits JSON messages with event types including:

- `PLAYER_INFO`
- `VIDEO_CHANGED`
- `PLAYER_STATE_CHANGED`
- `POSITION_CHANGED`
- `VOLUME_CHANGED`
- `REPEAT_CHANGED`
- `SHUFFLE_CHANGED`

Stream Jams Music Widget should use `PLAYER_INFO`, `VIDEO_CHANGED`, `PLAYER_STATE_CHANGED`, and `POSITION_CHANGED` for the first version. Volume, repeat, and shuffle events are outside the display-only scope.

Sources:

- <https://github.com/pear-devs/pear-desktop>
- <https://raw.githubusercontent.com/pear-devs/pear-desktop/master/src/plugins/api-server/config.ts>
- <https://raw.githubusercontent.com/pear-devs/pear-desktop/master/src/plugins/api-server/backend/routes/control.ts>
- <https://raw.githubusercontent.com/pear-devs/pear-desktop/master/src/plugins/api-server/backend/routes/websocket.ts>
- <https://raw.githubusercontent.com/pear-devs/pear-desktop/master/src/plugins/api-server/backend/scheme/song-info.ts>

## Architecture

The overlay UI should depend on a normalized music source interface, not on Pear Desktop directly. Each integration owns its API details, event mapping, and setup instructions.

Conceptual source interface:

```js
source.connect();
source.disconnect();
source.on("state", handler);
source.on("connection", handler);
source.getCurrentState();
```

Normalized player state:

```js
{
  trackId,
  title,
  artist,
  album,
  artworkUrl,
  durationSeconds,
  elapsedSeconds,
  isPlaying,
  sourceName,
  updatedAt
}
```

Recommended file structure:

```text
index.html
setup.html
styles/
  overlay.css
  setup.css
src/
  app/
    overlayApp.js
    setupApp.js
  config/
    overlayConfig.js
    setupConfig.js
  sources/
    musicSource.js
    sourceRegistry.js
    pearYoutubeMusicSource.js
    mockMusicSource.js
  state/
    playerState.js
    progressClock.js
  ui/
    overlayView.js
    setupView.js
```

Responsibilities:

- `overlayApp.js`: parse config, create the source, manage connection lifecycle, manage idle behavior, and coordinate rendering.
- `setupApp.js`: drive the setup workflow, persist non-secret preferences, test the source, and generate the absolute OBS URL.
- `overlayConfig.js`: parse and validate overlay URL parameters.
- `setupConfig.js`: define setup defaults and safe persistence rules.
- `musicSource.js`: document the integration interface.
- `sourceRegistry.js`: map `integration` values to source implementations and setup metadata.
- `pearYoutubeMusicSource.js`: handle Pear REST, WebSocket, reconnect, polling fallback, and Pear-to-normalized-state mapping.
- `mockMusicSource.js`: provide demo data for setup and visual testing.
- `playerState.js`: hold state normalization helpers.
- `progressClock.js`: interpolate elapsed progress between Pear updates.
- `overlayView.js`: render full, compact, hidden, waiting, and disconnected states.
- `setupView.js`: render integration-specific setup sections and shared controls.

## Integration Behavior

The default transport mode is `auto`:

1. Try WebSocket at `ws://{host}:{port}/api/v1/ws`.
2. If WebSocket fails, fall back to REST polling at `http://{host}:{port}/api/v1/song`.
3. Reconnect WebSocket with backoff when the socket closes.
4. Keep local progress moving smoothly between Pear events.

Supported transport URL values:

- `auto`: prefer WebSocket, fall back to polling.
- `ws`: use WebSocket only.
- `poll`: use REST polling only.

REST polling should be used as a fallback and for setup connection testing. A 204 response from `/api/v1/song` means Pear is reachable but no song is currently available.

## Overlay States

The overlay has connection states:

- `connecting`
- `connected`
- `disconnected`
- `waiting`

The disconnected state should use the same visual shell as the track widget. If idle behavior is disabled, the disconnected shell remains visible. If idle behavior is enabled, it follows the same idle rules as normal playback.

The overlay has view states:

- `full`
- `compact`
- `hidden`

Full view shows:

- album art slot
- title
- artist
- album
- progress bar
- status text when useful

Full view requires the album art slot, but not a real artwork URL. If Pear does not provide `imageSrc`, the overlay should show a no-art placeholder in the art slot.

Compact view shows:

- title
- artist
- progress bar
- minimal source/status treatment when useful

Compact view omits album art entirely.

Hidden view is fully invisible:

- `opacity: 0`
- no pointer interactions
- optionally `visibility: hidden` after the fade transition

## Idle Behavior

Idle behavior is configured with:

```text
initialView=full|compact
idleMode=none|hide|compact
idleAfter=30
```

Defaults:

```text
initialView=full
idleMode=none
idleAfter=30
```

Rules:

- `idleMode=none`: keep the current view visible.
- `idleMode=hide`: after `idleAfter` seconds without significant activity, fade to hidden.
- `idleMode=compact`: after `idleAfter` seconds without significant activity, collapse to compact.
- `initialView=compact` is allowed.
- A new track restores `initialView`.
- Reconnect, playback resume, and meaningful metadata changes restore `initialView`.
- Routine position/progress updates do not count as significant activity.
- Progress continues to update while the widget is compact.

## Visual Design And Theming

Version 1 should support basic visual options:

```text
theme=dark|light
initialView=full|compact
```

The overlay should use CSS custom properties for theme values:

```css
:root {
  --sj-bg: rgba(12, 13, 16, 0.82);
  --sj-text: #f7f7f5;
  --sj-muted: #b7b8bd;
  --sj-accent: #7bdff2;
  --sj-progress-bg: rgba(255, 255, 255, 0.18);
}
```

Advanced users can provide a custom stylesheet via:

```text
customCss=custom-theme.css
```

The setup page should expose `customCss` under an Advanced Options toggle. The overlay should load custom CSS after the default overlay stylesheet. For version 1, custom CSS should be treated as a same-folder or same-origin relative path, not an arbitrary remote URL.

## Setup Persistence

The setup page may save non-secret settings in `localStorage`:

- integration
- host
- port
- transport
- theme
- initial view
- idle mode
- idle delay
- custom CSS path

This is acceptable in version 1 because none of those values are credentials. Future integrations that involve API keys, OAuth tokens, refresh tokens, or private account identifiers should not store those secrets in `localStorage`. Integration metadata should identify which fields are safe to persist.

## Future Integration Guidance

Each integration should have its own setup section because setup requirements may differ materially. Pear needs API Server instructions. A future Spotify integration might need OAuth or a local companion process. A future local endpoint integration might need a JSON URL and schema validation.

Shared setup helpers should still be reused where possible:

- host input
- port input
- transport selection
- connection test
- theme selection
- view and idle behavior controls
- URL generation

This keeps setup flows distinct for users while avoiding duplicated implementation details.

## Open Implementation Notes

Implementation should start with static HTML and JavaScript. No build system is required for the first pass. If module loading from `file:///` causes problems in OBS, the implementation can either use classic scripts or revisit a tiny local server later.

The first implementation should include mock/demo mode so the overlay can be styled and tested without Pear Desktop running:

```text
index.html?integration=mock&theme=dark&initialView=full&idleMode=compact&idleAfter=30
```

The mock source should use the same normalized music source interface as the Pear source.
