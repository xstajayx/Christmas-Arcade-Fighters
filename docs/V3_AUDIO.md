# V3 announcer production status

All thirty-one required WAV files are integrated through the manifest, decoded lazily after audio unlock, mixed with an independent announcer volume and available offline after precaching. Device speech remains an optional disabled fallback.

The files are **generic robotic eSpeak NG speech**, not a convincing projected professional arcade performance. No high-quality performance/voice-generation service or human recording pack was supplied. Professional delivery, pronunciation/listening approval, compression/reverb direction and the final mix remain incomplete. Replace the following exact clips with approved original recordings to close that gate; do not represent their current existence as professional voice sign-off.

- `jamie`
- `nash`
- `bucket`
- `beardy`
- `round-one`
- `round-two`
- `final-round`
- `fight`
- `first-hit`
- `counter`
- `combo`
- `super`
- `knockout`
- `perfect`
- `you-win`
- `you-lose`
- `final-boss`
- `congratulations`
- `santa-slam`
- `reindeer-rampage`
- `bucket-blizzard`
- `festive-fury`
- `choose-your-fighter` — Choose your fighter!
- `new-challenger` — New challenger!
- `boss-battle` — Boss battle!
- `final-battle` — Final battle!
- `rob` — The Rob Father!
- `santa` — Santa!
- `the-rob-father-special` — The Rob Father Special!
- `frost` — Frost Jamie!
- `santas-final-delivery` — Santa's Final Delivery!

`npm run voices:generate` is a reproducible offline fallback pipeline using development-only eSpeak NG WASM plus FFmpeg. It does not imitate any actor or game announcer and is not bundled into runtime. The original procedural themes/effects are independently authored; longer composed tracks and human listening/balance direction remain open. Boss phase/character music changes and grab/throw/break/landing effects are implemented, but synthetic audio is not automatically approved because an AudioContext runs.
