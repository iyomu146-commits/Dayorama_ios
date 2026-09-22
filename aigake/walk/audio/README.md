# Dayorama audio

`bgm2.wav`, `bgm_night.wav`, `place.wav`, `complete.wav` are the project owner's provided recordings. Day music uses `bgm2.wav`; the previous `bgm.wav` stays as an unused original. The original WAV files stay in the authoring workspace; only the prepared files in `runtime/` are included in the app and GitHub export.

- Day music: 07:00–18:59, night music: 19:00–06:59, using device local time and the same debug clock as the town.
- BGM: AAC, 160 kbps, stereo. Day music uses only seconds 0–44 of `bgm2.wav`. Its opening matches the phrase at about 42.3556 seconds (approximately 85 BPM); the last 1.6444 seconds overlap the opening at that alignment. The consumed opening is removed, giving a 42.3556-second period. Crossfade gains account for the measured waveform correlation to avoid a loudness bump. This replaces the fixed 2-second overlap, which returned about half a beat too early. Night music keeps its 1.2-second crossfade. Playback fades between day/night over about 2 seconds.
- Placement and completion: trimmed PCM WAV, with tiny edge fades. Placement keeps the original pitch.
- Day BGM's container uses a 44,100-unit movie timescale so browser decoding does not truncate the fractional loop period to milliseconds.
- UI: original 105 ms rounded wooden pop synthesized by `sound-synthesis.mjs`; `ui.wav` is an authoring preview. No existing game's sound recording or melody is used.
- There are no wind, water, bird or insect audio layers.

To prepare new source WAVs locally: `node aigake/app/scripts/prepare-audio.mjs /path/to/ffmpeg`. The original source WAVs must be present. CI uses the committed runtime files and does not need FFmpeg.

`runtime/preparation.json` records the processing parameters. The source sound service's applicable usage terms remain associated with the owner's original account and downloads.
