# Notice: code, audio, privacy, and public hosting

## Audio-publication authorization

No repository-wide licence is granted by this notice.

On 2026-07-20, the study owner explicitly approved public distribution through this project of exactly these frozen audio assets:

- Japanese digit set `ja-digits-aligned-wav-v3`;
- US-English digit set `en-us-digits-aligned-wav-v1`;
- common `beep.wav`.

This approval applies only to the frozen files identified by the release and audio manifests. It does not automatically cover regenerated, replaced, or newly added audio. The required manual `audio_rights_confirmed` workflow gate remains in place so that every deployment explicitly confirms that its tagged release contains only the approved audio scope.

The public release contains normalized Japanese and US-English WAV derivatives of digit clips whose local generation records use the `gTTS` Python package and Google Translate text-to-speech output. The English source record fixes gTTS 2.5.4, `lang=en`, `tld=us`, `slow=False`, and the explicit words `zero` through `nine`. The MIT licence of the gTTS software applies to that software; it does not, by itself, establish permission to redistribute speech output produced through a Google service. Google Cloud Text-to-Speech documentation is not evidence that these particular files were created under a Cloud Text-to-Speech account or its terms.

The study owner's project approval records the decision to publish the exact frozen assets listed above. It is not a third-party legal warranty, a licence grant from Google or another service provider, or a determination that would automatically apply outside this project's stated use and release scope.

## Excluded material

The generated repository intentionally excludes:

- PVLT workbooks, questionnaires, answer files, crosswalks, participant-level results, and exported Digit Span CSVs;
- historical forward/backward result CSVs;
- Unity/macOS/Windows applications and binaries;
- private keys, access tokens, credentials, and local absolute paths;
- the old distribution ZIP and source project documents.

Only the exact files recorded in the release manifests are permitted.

## Public researcher utility

The researcher page is a public static utility. GitHub Pages does not authenticate a researcher, make links single-use, sign study settings, receive results, or protect a page merely because its path is not advertised. Do not enter or embed secrets, direct identifiers, participant codes, or returned data in the researcher page or generated URLs.

## Participant data and third-party hosting

The task is designed to keep responses in browser memory and save a local CSV; it does not automatically upload research results. GitHub and its delivery network may nevertheless process ordinary web-request metadata under their applicable terms and privacy notices. The approved participant information should accurately identify the public hosting arrangement and the separate procedure, if any, used to return CSV files.

Anonymous study codes are still pseudonymous while a re-identification key exists. Never place a participant code in a URL, analytics event, error-reporting service, repository issue, or public log.

## Scientific exposure

Static JavaScript and a public source repository expose fixed trial sequences and scoring logic. Search exclusion and an unlisted URL are not security controls. If advance access to stimuli or answers poses a material validity risk, use an approved delivery architecture that does not publish the complete fixed task to every visitor.

Japanese and English spoken digits are separate stimulus conditions. Interface language and spoken-digit language are selected independently by the researcher and fixed in the participant link. Validate their pairing with the declared audio-set version, preserve both provenance fields in analysis, and do not pool language conditions without a prespecified analysis rule.
