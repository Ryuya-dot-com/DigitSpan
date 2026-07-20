# Japanese/English Digit Span research protocol

## Status and scope

- Protocol version: `digitspan-research-3.2.0`
- Public release version: `digitspan-pages-1.1.0`
- Frozen on: 2026-07-20
- Modes: forward and backward, scored separately
- Maintained implementation: `web-forward/`, `web-backward/`, and `web-common/experiment.js`
- Intended use: a reproducible research measure for this PVLT project

This is not a clinical WAIS administration. It uses prerecorded Japanese or US-English audio selected before launch, keyboard responses, three fixed trials at every level, includes the digit 0, and does not apply a clinical early-discontinuation rule. Do not convert its results to WAIS scaled scores or compare them directly with clinical norms.

## Frozen design

| Element | Decision |
|---|---|
| Order | Forward first, then backward. Record any deviation. |
| Practice | Three fixed trials per mode; feedback is shown; practice is never scored. |
| Main trials | 21 fixed trials per mode: three trials at every length from 3 through 9 digits. |
| Early stopping | None. Every participant receives the same 21 main trials unless a technical error terminates the session. |
| Replay | Never replay a main-trial sequence for inattention, a wrong response, or a timeout. |
| Response | Type digits only after the response cue. Forward uses the presented order; backward uses the exact reverse order. |
| Feedback | Main-trial correctness is not displayed. |
| Primary score | Exact whole-sequence correct count, separately for forward and backward, each 0–21. |

Traditional public protocols present one digit per second and often stop after both trials at a length are failed. The present study keeps the one-second presentation standard but deliberately retains the full fixed matrix. This avoids outcome-dependent missing trials and preserves comparability with the legacy 21-trial research implementation. Fixed full administration is also preferable to a fragile two-error maximum-span estimate when trial-level precision is important; Woods et al. report improved reliability from fuller computerized sampling and continuous span metrics ([PubMed](https://pubmed.ncbi.nlm.nih.gov/20680884/)).

## Administration

1. Use a quiet room, one participant at a time, with headphones or a fixed external speaker.
2. Close notifications and unrelated applications. Use the full-screen control where possible.
3. Enter only the study-issued anonymous ID. Never enter a name, student number, or email address.
4. Run the audio check. The participant must explicitly confirm that both the spoken digit and beep were audible. Keep the same volume for both modes.
5. Complete the three practice trials. Practice accuracy is not an eligibility rule; its purpose is to establish task understanding.
6. Complete all 21 forward main trials, then all 21 backward main trials. Do not give correctness feedback or repeat a sequence.
7. Download the CSV immediately after each mode and move it to the restricted raw-data area.

The researcher independently selects (a) the participant's initial interface language and (b) the spoken-digit language when creating the participant link. The participant may change only the interface language before practice begins; the spoken-digit language cannot be changed in the participant task. Both are locked once practice begins and are recorded on every CSV row. Use the same interface and spoken-digit conditions for forward and backward unless a planned design specifies otherwise; document and validate any deviation during restricted integration.

The public GitHub Pages release fixes the release, protocol, task, audio-set, timing, initial-interface-language, and spoken-digit-language values in the participant link. `spoken=ja` must be paired with `audio=ja-digits-aligned-wav-v3`; `spoken=en` must be paired with `audio=en-us-digits-aligned-wav-v1`. Any missing, duplicate, unknown, or mismatched public parameter fails closed. The anonymous participant ID is entered only inside the task and must never be placed in a URL. The researcher page is a public link-building utility, not an authenticated administration system.

The no-replay rule follows public administration guidance: a repeated identical sequence becomes practice. The CDC manual distinguishes an actual interruption from ordinary inattention and says not to repeat merely inattentive trials ([CDC/NHANES manual](https://wwwn.cdc.gov/nchs/Data/Nhanes3/Manuals/cognitiv.pdf)).

## Stimuli and presentation timing

The fixed sequence lists are versioned in each mode's `app.js`. In backward mode, `target` is the sequence actually presented and `expected` is its exact reverse. The backward list was corrected in `backward-fixed-21-v2`: the legacy CSV's `questions` values were expected responses, not presented sequences.

| Timing field | Frozen value | Definition |
|---|---:|---|
| `pre_digits_ms` | 1,000 ms | Delay from trial start to first digit onset |
| `digit_soa_ms` | 1,000 ms | Onset of one digit to onset of the next |
| `last_digit_to_beep_ms` | 1,000 ms | Final digit onset to beep onset |
| Beep duration | 150 ms | Existing `audio/beep.wav` |
| `response_unlock_after_beep_ms` | 0 ms | Input and RT clock begin at beep offset |
| `main_next_trial_delay_ms` | 750 ms | Manual/timeout finalization to next main trial |
| `practice_feedback_ms` | 2,000 ms | Practice feedback display before the next trial |
| `response_deadline_ms` | `2,000 × (level + 1)` | 8 s at level 3 through 20 s at level 9 |

One-second digit onset spacing is consistent with public Digit Span procedures ([NIH/dbGaP protocol](https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/document.cgi?phd=3304&study_id=phs000007.v22.p8), [NIA/SOF protocol](https://agingresearchbiobank.nia.nih.gov/studies/sof/documents/download/Protocols/Visit_9/DigitSpanTest_%20Visit9_V1.2.pdf/)). It is specifically implemented as a stimulus-onset asynchrony, not as “audio duration plus a gap”: experimental evidence shows that both presentation rate and regularity change forward-span performance ([Schwartze et al., PubMed](https://pubmed.ncbi.nlm.nih.gov/31062352/)).

The Web task has two separately versioned audio sets:

- `ja-digits-aligned-wav-v3` in `audio/digits-normalized-v3/`;
- `en-us-digits-aligned-wav-v1` in `audio/digits-en-us-normalized-v1/`.

Both sets use mono 48 kHz/16-bit PCM WAV files of exactly 900 ms, align spoken onset at approximately 100 ms, and apply the same -20.7 LUFS / -3 dBFS normalization target. Each set's `MANIFEST.csv` fixes every digit file by SHA-256 and records duration, detected leading silence, integrated loudness, and true peak. The Japanese source files remain unchanged for auditability. The English source uses the explicit words `zero` through `nine`, gTTS 2.5.4 with `lang=en`, `tld=us`, and `slow=False`; this provenance does not itself establish public-redistribution permission.

Spoken language is a stimulus condition, not a cosmetic translation. Digit-span performance may differ by language and language proficiency, including within the same bilingual participant ([Chincotta et al., PubMed](https://pubmed.ncbi.nlm.nih.gov/9466242/); [López et al., PubMed](https://pubmed.ncbi.nlm.nih.gov/26786894/)). Do not pool Japanese- and English-audio observations as exchangeable without a prespecified model or stratified analysis. The selected audio set and `spoken_digit_language` must be included in eligibility checks and reported with results.

## Trial scoring

For a technically valid trial:

- Forward: `correct = 1` only when `response == target`.
- Backward: `correct = 1` only when `response == reverse(target)`.
- Any omission, addition, duplication, transposition, forward-order response in backward mode, or other mismatch is `correct = 0`.
- A response deadline with an empty or partial response is a valid incorrect trial: `timed_out = 1`, `submit_method = timeout`, `correct = 0`.
- A trial-level audio failure is not an incorrect response: `valid_trial = 0`, `trial_status = technical_error`, and `correct` and `rt_ms` are missing.

Exact order scoring matches public forward/backward definitions, while public procedures also keep “not administered” distinct from an incorrect item ([NIA/SOF protocol](https://agingresearchbiobank.nia.nih.gov/studies/sof/documents/download/Protocols/Visit_9/DigitSpanTest_%20Visit9_V1.2.pdf/), [NIH/dbGaP protocol](https://www.ncbi.nlm.nih.gov/projects/gap/cgi-bin/document.cgi?phd=3304&study_id=phs000007.v22.p8)).

## Participant-level outcomes

Compute outcomes separately by mode.

### Primary

- `total_exact_correct`: sum of `correct` over the 21 valid main trials; range 0–21.
- `accuracy_rate`: `total_exact_correct / 21`.

The primary score is missing when a mode does not have one eligible, complete 21-trial session.

### Secondary

- `level_correct_L3` through `level_correct_L9`: exact correct count among the three trials at each level; range 0–3.
- `span_1of3`: longest level with at least one correct trial. Set `span_1of3_left_censored = 1` and leave the span missing when no measured level passes; set `span_1of3_right_censored = 1` when level 9 passes.
- `span_2of3`: longest level with at least two correct trials. Set `span_2of3_left_censored = 1` and leave the span missing when no measured level passes; set `span_2of3_right_censored = 1` when level 9 passes. This is a study-defined robustness measure, not a clinical score.
- For each criterion separately, set `span_1of3_nonmonotonic` or `span_2of3_nonmonotonic` to 1 when a longer level passes after any shorter level has failed the same criterion. The span remains the highest passing level; the flag prevents a nonmonotonic response profile from being mistaken for a conventional stopping-rule span.
- `weighted_digits`: sum of `level × correct` over main trials; range 0–126. Report only as secondary.

Do not use a forward-plus-backward total as the primary endpoint. A combined 0–42 score may be reported descriptively only when both modes are eligible; forward and backward must remain visible because aggregation can conceal different performance profiles.

## Reaction time

`rt_ms` begins when the input is enabled at beep offset and ends at manual submission or the response deadline. RT never changes `correct` and never removes a trial from the primary accuracy score.

For exploratory RT summaries, include only trials that are:

- main phase, production mode, technically valid, and correct;
- manually submitted rather than timed out;
- `250 <= rt_ms < response_deadline_ms`;
- free of a trial-level focus-loss or visibility-change event.

Use the participant median within each mode and retain `n_rt_valid`, the number of contributing trials. Set the median to missing when `n_rt_valid < 3`; retain the count. The 250 ms rule is only an implausibly-fast-input QC bound; no population-tail trimming or post-hoc outlier cutoff is permitted without a separate preregistered analysis amendment.

## Technical errors, interruptions, and quality flags

| Event | Trial coding | Session/use rule |
|---|---|---|
| Preflight audio initially fails, then passes and is explicitly confirmed | Increment `preflight_audio_error_count` | Session remains eligible. |
| Audio fails during a trial | `valid_trial=0`, `correct=NA`, `trial_status=technical_error` | End the session and save the partial CSV. The mode has no primary score. |
| Wrong answer, accidental key entry, ordinary inattention | `valid_trial=1`, `correct=0` | Continue; no replay. |
| Empty or partial response at deadline | `valid_trial=1`, `correct=0`, `timed_out=1` | Continue; no replay. |
| Browser tab becomes hidden during a main trial | Retain response and flag the trial | Exclude the session from the confirmatory set; retain for documented exploratory/sensitivity analysis. |
| Window loses focus without a visibility change | Retain response and flag the trial | Keep in the primary accuracy set; repeat results in a sensitivity set excluding affected sessions. |
| Known external interruption that prevented hearing/responding | Stop the session; do not replay the same main sequence | Treat as incomplete/technical. |

No alternate main stimulus set is currently frozen. Once any main-trial digit has been presented, re-running the same participant on the same fixed set is not a valid confirmatory replacement because it creates prior exposure. A future retest requires a separately developed, preregistered parallel set and a new trial-set version.

## Session eligibility and duplicates

A mode is eligible for confirmatory scoring only when all conditions hold:

- `test_mode == 0`;
- exactly 21 main rows, all `valid_trial == 1` and `trial_status == complete`;
- `session_status == completed` and no trial audio error;
- expected task, practice-set, trial-set, audio-set, timing, and schema versions;
- expected public-release, configured interface-language, spoken-digit-language, and matching audio-set values;
- fixed presented/expected sequences match the registered version;
- no main-trial visibility-change event;
- no duplicate participant-trial rows.

When more than one otherwise eligible completed session exists for the same anonymous ID and mode, use the earliest eligible session and flag all later sessions. Do not choose the higher score. Selection occurs in the restricted integration step using raw session metadata; precise timestamps and `session_id` are then removed from the anonymous master.

Forward and backward eligibility are independent. A participant may contribute to a mode-specific analysis when the other mode is missing, but any combined analysis requires both eligible modes.

## PVLT integration

Digit Span is not present in the current `0. Wide&LongData(KS)` data. The anonymous workbook therefore contains an empty `digitspan_long` schema, not observed Digit Span records.

For later integration:

1. Validate the raw Digit Span CSV against this protocol before scoring.
2. Map `participant_id` to the master `anonymous_id` in the restricted area.
3. Exclude test-mode rows and resolve session eligibility/duplicates before de-identification.
4. Remove the source participant ID, session ID, exact UTC timestamps, time zone, device/browser details, and screen dimensions.
5. Append trial rows to `digitspan_long`; derive participant summaries only from eligible sessions.

The privacy-transformed trial table retains `release_version`, `configured_initial_language`, `ui_language`, `spoken_digit_language`, and `audio_set_version`. It removes the source participant ID and other session/device identifiers as described above. For this release, interface-language values are `ja` or `en`, and `spoken_digit_language` is independently `ja` or `en`. The audio-set value must match the spoken language.

## Public GitHub Pages distribution

Only the allowlisted static release may be published. Never publish this parent directory: it also contains legacy CSV outputs, Unity applications, and other research assets. The public release contains the maintained browser tasks, normalized audio, participant and researcher utility pages, documentation, and automated release checks.

GitHub Pages is static hosting. The application does not transmit the participant ID or responses and saves the result CSV locally in the browser, but the hosting service still receives ordinary HTTP request metadata. Pages does not authenticate researchers, issue one-time participant links, receive results, or provide a secure research-data store. Do not put credentials, tokens, identifiable data, or results in the repository, JavaScript, configuration, or URL.

The fixed sequences and audio files are necessarily downloadable from a public static site. Manage stimulus pre-exposure procedurally. On 2026-07-20, the study owner explicitly approved public distribution through this project of the exact frozen Japanese set `ja-digits-aligned-wav-v3`, US-English set `en-us-digits-aligned-wav-v1`, and common `beep.wav`. The manual `audio_rights_confirmed` gate remains required for every deployment and must be selected only after confirming that the tagged release matches this exact scope. Regenerated, replaced, or additional audio requires a new review. This project approval is not a third-party legal warranty or a licence grant from any audio service provider.

`test=1` is accepted only on loopback hosts (`localhost`, `127.0.0.1`, or `[::1]`). A public URL containing `test=1` fails closed and must never be used for collection.

## Version 3.2.0 amendment

Version 3.2.0 makes interface language and spoken-digit language independent researcher-controlled launch settings. It adds the English-US audio set, requires a matching `spoken` and `audio` pair in public links, preserves the selected spoken language in the forward-to-backward handoff, and records the selected audio provenance in the existing schema-v4 fields. Fixed trial sequences, presentation timing, response deadlines, scoring, validity rules, and participant outcomes are unchanged from 3.1.0. Japanese- and English-audio records must not be treated as exchangeable merely because they share a task version.

## Version 3.1.0 amendment

Version 3.1.0 adds the bilingual, language-locked interface, public-release link validation, local-only test-mode guard, forward-to-backward handoff after CSV download, and four CSV provenance fields. Fixed sequences, Japanese audio, presentation timing, response deadlines, scoring, validity rules, and outcomes are unchanged from 3.0.0. Raw files from 3.0.0 and 3.1.0 must still be validated against their declared schema and task versions rather than merged silently.

## Version changes requiring a new protocol version

Increment the relevant version before collection if any of the following changes: digit files or loudness processing, presented sequences, practice sequences, timing, response deadline, scoring, validity/exclusion rules, or CSV fields. Never merge incompatible versions silently.
