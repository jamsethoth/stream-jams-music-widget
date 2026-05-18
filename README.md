# Stream Jams

Stream Jams is a small static HTML overlay intended for use as a browser source in OBS Studio. Its goal is to give stream viewers a clean, minimal view of the music currently playing on the user's local system without taking over the scene.

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

Stream Jams is intended to eventually support integrations with local music playback sources. Spotify and YouTube Music are the initial targets, but the exact integration strategy is intentionally left undecided for now.

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

## Current Status

This repository currently contains only the project intention. Implementation details, architecture, and integration choices are intentionally pending discussion.
