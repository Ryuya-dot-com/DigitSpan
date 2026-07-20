# Japanese digit audio set: normalized v3

This is the frozen Web-collection audio set. The legacy MP3 files in `../digits/` remain unchanged.

- Format: mono PCM WAV, 48 kHz, 16 bit
- Duration: exactly 900 ms per file
- Spoken onset: approximately 100 ms from file start using a common -40 dB threshold
- Integrated loudness: -20.73 to -20.68 LUFS
- True peak: at or below -3.07 dBFS
- Browser protocol identifier: `ja-digits-aligned-wav-v3`

`MANIFEST.csv` records duration, leading silence, loudness, true peak, and SHA-256 for every digit. Rebuild and verify the set with:

```sh
Rscript ../build_normalized_audio.R ..
```

The response cue remains `../beep.wav` (150 ms). The earlier `digits-normalized-v2/` MP3 set was an intermediate loudness-only normalization and is not used for data collection.
