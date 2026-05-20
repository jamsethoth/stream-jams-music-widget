# Spotify Static Integration Notes

## Context

The Spotify integration should be added as a new music source without weakening the existing source contract or changing the widget's look, feel, or setup configuration model. Spotify-specific authorization details should stay inside the Spotify source/setup path, while the overlay continues to consume normalized now-playing state.

The project must remain static. A local companion service is not acceptable for this feature.

## Branch Context

These notes were captured for the Spotify static integration feature on May 20, 2026.

The moved project location is:

```text
C:\dev\projects\stream-jams-music-widget
```

The feature branch created for preserving this work is:

```text
codex/spotify-static-integration-notes
```

## Existing Contract To Preserve

The overlay should continue to depend on the normalized music source interface rather than Spotify-specific details.

Current conceptual source shape:

```js
source.connect();
source.disconnect();
source.on("state", handler);
source.on("connection", handler);
source.getCurrentState();
```

Current normalized player state shape:

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

Spotify should map its Web API responses into this shape. The overlay UI, themes, idle behavior, custom CSS behavior, view selection, and OBS URL generation should remain shared.

## Static Spotify Auth Findings

Spotify should use Authorization Code with PKCE for static/browser-only authorization. This avoids embedding a Spotify client secret in the app. The Spotify `client_id` is public and may be present in setup code or configuration.

PKCE solves the client-secret problem, but it does not make resulting Spotify tokens secure inside a static app. Anything that the static widget can read can potentially be read by a local user, browser devtools, OBS Chromium storage, malware, extensions, injected script, logs, or accidental exports.

Spotify access tokens expire after about one hour. A refresh token can extend the session, but a refresh token stored in a static app is a long-lived local secret.

## URL Token Handling

Tokens must not be placed in generated OBS URLs by default.

Encoding a token for use in a URL, such as Base64, is not security. Encrypting a token for use in a URL only helps if the decryption key is not also available to the static widget. If OBS can decrypt a token using only static files, then the key is available to anyone who can inspect the files or URL.

Do not put refresh tokens in URL parameters or URL fragments.

An access token in an OBS URL would work for roughly one hour, but it is still exposed to anyone who can see the URL, logs, screenshots, browser history, or OBS configuration. It may be acceptable only as an explicit short-session mode, not as the default secure path.

## Setup And OBS Storage Constraint

Setup cannot be done inside OBS. That means tokens stored in the normal browser's storage during setup will not automatically be available to OBS's Chromium browser source profile.

Because the project must remain static, there is no fully secure way to transfer a long-lived refresh token from setup to OBS without either exposing the token or relying on a non-static trusted storage component.

The safest static design is:

- Use Spotify PKCE.
- Request the minimum Spotify scopes.
- Avoid a client secret entirely.
- Do not persist refresh tokens by default.
- Do not include tokens in generated OBS URLs by default.
- Treat any persistent browser-storage mode as an explicit convenience option with clear local-risk language.
- Treat any access-token-in-URL mode as short-lived and expiring.

## Recommended Spotify Scope

Start with:

```text
user-read-currently-playing
```

Only add `user-read-playback-state` if implementation proves it is required for progress, duration, or reliable playback status. Do not request playback-control, playlist, library, account, or modification scopes for the display-only overlay.

## Local Risk Model

For local-only use, the main risk is Spotify token exposure. If a refresh token is persisted, anything with access to the relevant browser or OBS profile storage may extract it and mint new access tokens until the grant is revoked or expires.

With the narrow read-only scope, exposure should be limited to currently playing or playback-state data. It should not allow playback changes, playlist edits, account billing access, or broader account modification unless broader scopes are requested.

Specific risks to guard against:

- Token theft from browser storage.
- Token leakage through generated OBS URLs.
- Token leakage through logs, thrown errors, copied diagnostics, or screenshots.
- Token exposure in OBS/browser cache files.
- Cross-site scripting or arbitrary custom JavaScript.
- Remote custom CSS or other remote resource loading that can be used for exfiltration.
- Accidentally showing private or unexpected music on stream.

## Implementation Direction For Later

Add Spotify as its own source and setup metadata path:

- `spotifySource.js` owns Spotify Web API calls, auth state inputs, response mapping, expiry handling, and connection status.
- `setupApp.js` and setup UI gain a Spotify setup section without changing shared theme, layout, view, idle, opacity, alignment, or custom CSS controls.
- `sourceRegistry.js` registers Spotify without changing Pear or mock behavior.
- `overlayConfig.js` validates Spotify-specific configuration without allowing long-lived secrets in normal generated URLs.
- Tests cover source registration, config validation, token redaction, and Spotify response normalization.

The eventual design should explicitly choose between:

1. Ephemeral access token mode: secure-by-default static mode, reauth required about hourly.
2. Explicit persistent refresh-token mode: more convenient, but local-storage risk must be visible and opt-in.
3. Explicit short-lived access-token URL mode: useful for OBS handoff, expires quickly, never uses refresh tokens.

None of those modes should change the existing normalized source contract or the overlay's visual configuration behavior.
