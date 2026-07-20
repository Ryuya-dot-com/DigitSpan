# Japanese/English Digit Span — GitHub Pages release

This repository is a generated, public-release subset of the PVLT Digit Span project. It contains no PVLT response workbook, participant crosswalk, legacy Unity application, or historical result CSV. The GitHub Pages workflow uploads **only `site/`**.

Do not copy the parent PVLT workspace into this repository. Regenerate this directory from the private workspace with:

```sh
Rscript "digitspan_Japanese/Jikken_v2 2/build_github_pages_release.R"
```

## Public paths

- Landing page: `site/index.html`
- Researcher utility: `site/researcher/index.html`
- Forward task: `site/web-forward/index.html`
- Backward task: `site/web-backward/index.html`
- Shared runtime: `site/web-common/`
- Frozen audio: `site/audio/`

All application and audio URLs are relative so the site works under a project path such as `https://Ryuya-dot-com.github.io/<repository>/`. The researcher utility is public and is **not an authenticated administration service**. It must contain no password, API key, signing key, participant identifier, response, or confidential study metadata.

Participant identifiers are entered in the task UI and must never be placed in a participant-link query string or fragment. The static app does not upload results. CSV files remain on the browser/device until the researcher or participant moves them through the study's approved data-return procedure.

## Required checks before publication

1. Verify that the tagged release contains exactly the audio scope approved by the study owner on 2026-07-20: Japanese `ja-digits-aligned-wav-v3`, US-English `en-us-digits-aligned-wav-v1`, and common `beep.wav`. See `NOTICE.md`. This project approval is not a third-party legal warranty, and regenerated, replaced, or additional audio requires a new review.
2. Confirm that the deployed protocol, task, schema, timing, and audio-set versions match `PROTOCOL.md` and the preregistration/ethics materials.
3. Confirm that English and Japanese instructions are semantically equivalent, and that each approved participant link contains the intended independent interface (`lang`) and spoken-digit (`spoken`) settings with the matching audio-set version. Japanese- and English-audio results are distinct stimulus conditions.
4. Complete a clean-browser run of forward and backward modes, save both CSVs, and validate them before recruitment.
5. Confirm the result-return, duplicate-session, interruption, withdrawal, and retention procedures. GitHub Pages is static hosting and supplies no authenticated result receiver.
6. Review the release manifest and approve the `github-pages` deployment environment. A hidden URL is not access control.

## Local verification

```sh
node tools/verify-public-release.mjs
python3 -m http.server 8000 --directory site
```

Then open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/web-forward/`
- `http://127.0.0.1:8000/web-backward/`

The accelerated `?test=1` mode is for loopback automated testing only. A deployed Pages URL must never enable accelerated test behavior, even when `?test=1` is appended. Research ingestion must reject every row with `test_mode != 0`.

## GitHub Pages setup and release

1. Create a **new clean repository** from this generated directory. Do not initialize the parent PVLT directory as a Git repository.
2. In repository settings, select **Pages → Source → GitHub Actions**.
3. Protect `main`, require the verification workflow, and configure the `github-pages` environment with the available reviewer and deployment-branch/tag protections.
4. Tag an approved release with a tag beginning `digitspan-v`, for example `digitspan-v3.2.0`.
5. Run the Pages workflow manually from that tag, select the required `audio_rights_confirmed` checkbox only after confirming that the tag matches the exact 2026-07-20-approved audio scope, and approve the `github-pages` environment after checking the release evidence.

Pull requests and pushes run verification but do not deploy. This intentionally separates a source merge from a research-site release. Roll back by rerunning the workflow from the last approved tag.

GitHub Pages does not provide arbitrary response-header configuration. The HTML uses a meta Content Security Policy and a no-referrer policy, but header-only protections such as CSP `frame-ancestors` cannot be established by this repository alone. Use a hosting/CDN layer with controlled security headers if the approved deployment requires them.

## Manifests

- `RELEASE_MANIFEST.sha256` covers every generated repository file except itself.
- `site/RELEASE_MANIFEST.sha256` covers every deployed file except itself.
- `site/audio/digits-normalized-v3/MANIFEST.csv` contains the frozen Japanese digit-audio measurements and SHA-256 values.
- `site/audio/digits-en-us-normalized-v1/MANIFEST.csv` contains the frozen US-English digit-audio measurements and SHA-256 values.

Run `node tools/verify-public-release.mjs` after every checkout and before every manual deployment.
