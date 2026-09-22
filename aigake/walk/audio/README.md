# Dayorama audio

`bgm2.wav`, `bgm_night.wav`, `place.wav`, `complete.wav` are the project owner's provided recordings. Day music uses `bgm2.wav`; the previous `bgm.wav` stays as an unused original. The original WAV files stay in the authoring workspace; only the prepared files in `runtime/` are included in the app and GitHub export.

- Day music: 07:00–18:59, night music: 19:00–06:59, using device local time and the same debug clock as the town.
- BGM: AAC, 160 kbps, stereo. Day music uses only seconds 0–44 of `bgm2.wav`. Its last 2 seconds overlap its first 2 seconds with a smooth equal-power crossfade, with no fade to silence. The consumed opening is removed to keep the phrase moving forward, so the resulting loop lasts 42 seconds. Night music joins its tail to the opening with a 1.2-second crossfade. Playback fades between day/night over about 2 seconds.
- Placement and completion: trimmed PCM WAV, with tiny edge fades. Placement keeps the original pitch.
- UI: original 105 ms rounded wooden pop synthesized by `sound-synthesis.mjs`; `ui.wav` is an authoring preview. No existing game's sound recording or melody is used.
- There are no wind, water, bird or insect audio layers.

To prepare new source WAVs locally: `node aigake/app/scripts/prepare-audio.mjs /path/to/ffmpeg`. The original source WAVs must be present. CI uses the committed runtime files and does not need FFmpeg.

`runtime/preparation.json` records the processing parameters. The source sound service's applicable usage terms remain associated with the owner's original account and downloads.
