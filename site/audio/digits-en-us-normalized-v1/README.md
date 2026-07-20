# US-English digit audio set: normalized v1

This is a frozen research audio set for the spoken digits 0–9 in US English.
It is independent of, and does not replace, the Japanese
`../digits-normalized-v3/` set.

## Frozen synthesis condition

- Words: `zero`, `one`, `two`, `three`, `four`, `five`, `six`, `seven`,
  `eight`, `nine` (one word per file)
- Generator: gTTS 2.5.4
- Parameters: `lang="en"`, `tld="us"`, `slow=False`
- Frozen source files: `../digits-en-us-gtts-source-v1/0.mp3` through `9.mp3`
- Intended browser audio-set identifier: `en-us-digits-aligned-wav-v1`

The remote gTTS service can change independently of this repository. The
source and normalized SHA-256 values are therefore frozen in `MANIFEST.csv`;
regeneration is not assumed to reproduce the same speech waveform.

## Normalized output

- Format: mono PCM WAV, 48 kHz, 16 bit
- Duration: exactly 900 ms per file
- Spoken onset: 99.94–100.19 ms from file start using a common -40 dB
  threshold
- Integrated loudness: -20.72 to -20.67 LUFS (target -20.7 LUFS)
- True peak: -9.10 to -5.72 dBFS (all at or below the -3 dBFS ceiling)

`MANIFEST.csv` records the word, duration, leading silence, loudness, true
peak, source SHA-256, and normalized-file SHA-256 for every digit.

To rebuild the normalized WAV files from the frozen MP3 sources:

```sh
Rscript audio/build_normalized_audio_en_us.R
```

To create a new source set from gTTS (requires network access and intentionally
refuses to overwrite the frozen set unless `--force` is supplied):

```sh
python3 generate_digit_clips_en_us.py
```

## Publication authorization record

On 2026-07-20, the study owner explicitly approved public distribution through
this project of the exact frozen Japanese set `ja-digits-aligned-wav-v3`, this
US-English set `en-us-digits-aligned-wav-v1`, and the common `beep.wav`. The
approval covers only the files fixed by the corresponding manifests and release
record; regenerated, replaced, or newly added audio requires a new review.

The manual `audio_rights_confirmed` deployment gate remains required. This
project approval is not a third-party legal warranty or a licence grant from
Google. The gTTS package licence covers the gTTS software and does not by itself
establish redistribution rights for speech returned by the remote Google
service.
