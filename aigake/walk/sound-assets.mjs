// Source WAVs stay in audio/. Only these prepared files are shipped in the app.
export const SOUND_ASSETS=Object.freeze({day:'audio/runtime/bgm.m4a',night:'audio/runtime/bgm-night.m4a',place:'audio/runtime/place.wav',complete:'audio/runtime/complete.wav'});
export function musicPeriod(hour){const h=((Number(hour)%24)+24)%24;return h>=19||h<7?'night':'day';}
