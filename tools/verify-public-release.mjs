#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir, lstat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const EXPECTED_ROOT_FILES = new Set([
  ".github/workflows/pages.yml",
  "GENERATED_RELEASE.txt",
  "NOTICE.md",
  "PROTOCOL.md",
  "README.md",
  "RELEASE_MANIFEST.sha256",
  "tools/verify-public-release.mjs",
]);

const EXPECTED_SITE_FILES = new Set([
  ".nojekyll",
  "404.html",
  "RELEASE_MANIFEST.sha256",
  "assets/site.css",
  "assets/site.js",
  "audio/beep.wav",
  "audio/digits-en-us-normalized-v1/MANIFEST.csv",
  "audio/digits-en-us-normalized-v1/README.md",
  ...Array.from({ length: 10 }, (_, digit) => `audio/digits-en-us-normalized-v1/${digit}.wav`),
  "audio/digits-normalized-v3/MANIFEST.csv",
  "audio/digits-normalized-v3/README.md",
  ...Array.from({ length: 10 }, (_, digit) => `audio/digits-normalized-v3/${digit}.wav`),
  "index.html",
  "researcher/index.html",
  "robots.txt",
  "web-backward/app.js",
  "web-backward/index.html",
  "web-backward/style.css",
  "web-common/experiment.css",
  "web-common/experiment.js",
  "web-common/i18n.js",
  "web-forward/app.js",
  "web-forward/index.html",
  "web-forward/style.css",
]);

const ALLOWED_CSV = new Set([
  "site/audio/digits-en-us-normalized-v1/MANIFEST.csv",
  "site/audio/digits-normalized-v3/MANIFEST.csv",
]);
const FORBIDDEN_EXTENSIONS = new Set([
  ".app", ".dll", ".doc", ".docx", ".dylib", ".exe", ".key", ".p12",
  ".pdf", ".ppt", ".pptx", ".sav", ".xls", ".xlsm", ".xlsx", ".zip",
]);
const EXPECTED_BEEP_SHA256 = "204ea67e7a100873e70a3bd9a7b43199596d51e2d53e096e312d00ac563c8798";
const EXPECTED_TIMING = {
  preDigitsMs: 1000,
  digitSoaMs: 1000,
  lastDigitToBeepMs: 1000,
  responseUnlockAfterBeepMs: 0,
  practiceFeedbackMs: 2000,
  mainNextTrialDelayMs: 750,
  audioCheckGapMs: 150,
};
const EXPECTED_CONFIGS = {
  "web-forward/app.js": {
    mode: "forward",
    releaseVersion: "digitspan-pages-1.1.0",
    schemaVersion: "digitspan-trial-v4",
    protocolVersion: "digitspan-research-3.2.0",
    taskVersion: "digitspan-forward-web-3.2.0",
    practiceSetVersion: "forward-practice-v2",
    trialSetVersion: "forward-fixed-21-v1",
    timingVersion: "fixed-soa-deadline-v1",
    nextMode: {
      path: "../web-backward/",
      taskVersion: "digitspan-backward-web-3.2.0",
    },
    practiceTrials: ["483", "715", "960"],
    mainTrials: [
      "624", "846", "279",
      "9017", "4901", "2169",
      "97183", "87431", "36450",
      "729628", "263849", "395401",
      "7485063", "0682957", "5326987",
      "45867320", "65729014", "95106347",
      "074819653", "156849732", "153482069",
    ],
    timing: EXPECTED_TIMING,
    audioSets: {
      ja: {
        audioSetVersion: "ja-digits-aligned-wav-v3",
        spokenDigitLanguage: "ja",
        digitsDir: "../audio/digits-normalized-v3",
        digitExtension: ".wav",
        beep: "../audio/beep.wav",
      },
      en: {
        audioSetVersion: "en-us-digits-aligned-wav-v1",
        spokenDigitLanguage: "en",
        digitsDir: "../audio/digits-en-us-normalized-v1",
        digitExtension: ".wav",
        beep: "../audio/beep.wav",
      },
    },
  },
  "web-backward/app.js": {
    mode: "backward",
    releaseVersion: "digitspan-pages-1.1.0",
    schemaVersion: "digitspan-trial-v4",
    protocolVersion: "digitspan-research-3.2.0",
    taskVersion: "digitspan-backward-web-3.2.0",
    practiceSetVersion: "backward-practice-v1",
    trialSetVersion: "backward-fixed-21-v2",
    timingVersion: "fixed-soa-deadline-v1",
    practiceTrials: ["274", "589", "603"],
    mainTrials: [
      "932", "725", "012",
      "7639", "3965", "4503",
      "90135", "92768", "09623",
      "730516", "361845", "903185",
      "2865170", "8190742", "8170236",
      "91256407", "43721608", "28614953",
      "935041276", "065349721", "243819705",
    ],
    timing: EXPECTED_TIMING,
    audioSets: {
      ja: {
        audioSetVersion: "ja-digits-aligned-wav-v3",
        spokenDigitLanguage: "ja",
        digitsDir: "../audio/digits-normalized-v3",
        digitExtension: ".wav",
        beep: "../audio/beep.wav",
      },
      en: {
        audioSetVersion: "en-us-digits-aligned-wav-v1",
        spokenDigitLanguage: "en",
        digitsDir: "../audio/digits-en-us-normalized-v1",
        digitExtension: ".wav",
        beep: "../audio/beep.wav",
      },
    },
  },
};
const EXPECTED_CSV_HEADERS = [
  "release_version",
  "schema_version",
  "protocol_version",
  "task_version",
  "practice_set_version",
  "trial_set_version",
  "audio_set_version",
  "timing_version",
  "configured_initial_language",
  "ui_language",
  "spoken_digit_language",
  "participant_id",
  "session_id",
  "session_started_at_utc",
  "session_completed_at_utc",
  "session_status",
  "mode",
  "phase",
  "trial",
  "trial_status",
  "valid_trial",
  "level",
  "target",
  "expected",
  "response",
  "correct",
  "rt_ms",
  "first_key_rt_ms",
  "typing_duration_ms",
  "response_deadline_ms",
  "submit_method",
  "timed_out",
  "trial_started_at_utc",
  "trial_opened_at_utc",
  "submitted_at_utc",
  "pre_digits_ms",
  "digit_soa_ms",
  "last_digit_to_beep_ms",
  "response_unlock_after_beep_ms",
  "practice_feedback_ms",
  "main_next_trial_delay_ms",
  "audio_check_gap_ms",
  "max_abs_digit_soa_deviation_ms",
  "last_digit_to_beep_deviation_ms",
  "session_focus_loss_count",
  "session_visibility_change_count",
  "trial_focus_loss_count",
  "trial_visibility_change_count",
  "preflight_audio_error_count",
  "trial_audio_error_count",
  "technical_error_message",
  "test_mode",
];

const args = process.argv.slice(2);
let root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--root" && args[index + 1]) {
    root = args[index + 1];
    index += 1;
  } else {
    throw new Error(`Unknown or incomplete argument: ${args[index]}`);
  }
}
root = path.resolve(root);
const siteRoot = path.join(root, "site");

const failures = [];
const passes = [];

function fail(message) {
  failures.push(message);
}

function pass(message) {
  passes.push(message);
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function listFiles(directory) {
  const files = [];
  async function visit(current, relative = "") {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      // actions/checkout creates this non-deployable directory. All other
      // top-level dotfiles remain subject to the exact public allowlist.
      if (!relative && entry.name === ".git" && entry.isDirectory()) continue;
      const absolute = path.join(current, entry.name);
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      const info = await lstat(absolute);
      if (info.isSymbolicLink()) {
        fail(`Symbolic links are forbidden: ${toPosix(path.relative(root, absolute))}`);
        continue;
      }
      if (info.isDirectory()) await visit(absolute, rel);
      else if (info.isFile()) files.push(rel);
      else fail(`Unsupported filesystem entry: ${toPosix(path.relative(root, absolute))}`);
    }
  }
  await visit(directory);
  return files.sort();
}

function equalSets(actual, expected, label) {
  const actualSet = new Set(actual);
  const missing = [...expected].filter((item) => !actualSet.has(item)).sort();
  const unexpected = actual.filter((item) => !expected.has(item)).sort();
  if (missing.length || unexpected.length) {
    if (missing.length) fail(`${label} missing files: ${missing.join(", ")}`);
    if (unexpected.length) fail(`${label} unexpected files: ${unexpected.join(", ")}`);
  } else {
    pass(`${label} matches the exact public allowlist (${actual.length} files)`);
  }
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function evaluateBrowserExport(relative, exportName) {
  const source = await readFile(path.join(siteRoot, ...relative.split("/")), "utf8");
  const sandbox = { window: Object.create(null) };
  const context = vm.createContext(sandbox, {
    name: `verify:${relative}`,
    codeGeneration: { strings: false, wasm: false },
  });
  const script = new vm.Script(source, { filename: relative });
  script.runInContext(context, { timeout: 1000 });
  const exported = context.window[exportName];
  if (!exported) throw new Error(`${relative} did not define window.${exportName}`);
  return exported;
}

function extractObjectLiteral(source, variableName) {
  const escapedName = variableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const assignment = new RegExp(`\\bconst\\s+${escapedName}\\s*=`).exec(source);
  if (!assignment) throw new Error(`Could not find const ${variableName}`);
  const start = source.indexOf("{", assignment.index + assignment[0].length);
  if (start < 0) throw new Error(`Could not find ${variableName} object literal`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (["\"", "'", "`"].includes(character)) {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unclosed ${variableName} object literal`);
}

function evaluateObjectLiteral(source, variableName, filename) {
  const literal = extractObjectLiteral(source, variableName);
  const context = vm.createContext(Object.create(null), {
    name: `verify-literal:${filename}`,
    codeGeneration: { strings: false, wasm: false },
  });
  return new vm.Script(`(${literal})`, { filename }).runInContext(context, { timeout: 1000 });
}

async function verifyFrozenConfigs() {
  for (const [relative, expected] of Object.entries(EXPECTED_CONFIGS)) {
    let actual;
    try {
      actual = await evaluateBrowserExport(relative, "DIGIT_SPAN_CONFIG");
    } catch (error) {
      fail(`${relative}: could not load DIGIT_SPAN_CONFIG (${error.message})`);
      continue;
    }
    if (canonical(actual) !== canonical(expected)) {
      fail(`${relative}: frozen release/schema/protocol/task/trial/audio/timing configuration changed`);
    }
  }
  pass("Forward and backward configurations match the complete frozen 1.1.0 / schema-v4 / protocol-3.2.0 dual-audio contract");
}

async function verifyTaskInternationalization() {
  let messages;
  try {
    const exported = await evaluateBrowserExport("web-common/i18n.js", "DIGIT_SPAN_I18N");
    messages = exported.messages;
  } catch (error) {
    fail(`web-common/i18n.js: could not load the translation dictionary (${error.message})`);
    return;
  }
  if (!messages || typeof messages.ja !== "object" || typeof messages.en !== "object") {
    fail("web-common/i18n.js: both ja and en dictionaries are required");
    return;
  }

  const jaKeys = Object.keys(messages.ja).sort();
  const enKeys = Object.keys(messages.en).sort();
  const missingJapanese = enKeys.filter((key) => !Object.prototype.hasOwnProperty.call(messages.ja, key));
  const missingEnglish = jaKeys.filter((key) => !Object.prototype.hasOwnProperty.call(messages.en, key));
  if (missingJapanese.length) fail(`web-common/i18n.js: Japanese keys missing: ${missingJapanese.join(", ")}`);
  if (missingEnglish.length) fail(`web-common/i18n.js: English keys missing: ${missingEnglish.join(", ")}`);
  for (const language of ["ja", "en"]) {
    for (const [key, value] of Object.entries(messages[language])) {
      if (typeof value !== "string" || !value.trim()) fail(`web-common/i18n.js: ${language}.${key} is empty or not text`);
    }
  }

  const knownDataAttributes = new Set([
    "data-i18n",
    "data-i18n-placeholder",
    "data-i18n-aria-label",
    "data-i18n-title",
  ]);
  for (const relative of ["web-forward/index.html", "web-backward/index.html"]) {
    const html = await readFile(path.join(siteRoot, ...relative.split("/")), "utf8");
    for (const tagMatch of html.matchAll(/<([A-Za-z0-9:-]+)\b[^>]*>/g)) {
      const attrs = attributes(tagMatch[0]);
      for (const [name, key] of Object.entries(attrs)) {
        if (!name.startsWith("data-i18n")) continue;
        if (!knownDataAttributes.has(name)) fail(`${relative}: unsupported translation attribute ${name}`);
        if (!key) fail(`${relative}: ${name} has no translation key`);
        for (const language of ["ja", "en"]) {
          if (!Object.prototype.hasOwnProperty.call(messages[language], key)) {
            fail(`${relative}: ${name} key is missing from ${language}: ${key}`);
          }
        }
      }
    }
  }

  const siteScriptRelative = "assets/site.js";
  const siteSource = await readFile(path.join(siteRoot, ...siteScriptRelative.split("/")), "utf8");
  let siteMessages;
  let siteVersions;
  try {
    siteMessages = evaluateObjectLiteral(siteSource, "messages", siteScriptRelative);
    siteVersions = evaluateObjectLiteral(siteSource, "versions", siteScriptRelative);
  } catch (error) {
    fail(`${siteScriptRelative}: could not read static dictionaries/configuration (${error.message})`);
  }
  if (siteMessages?.ja && siteMessages?.en) {
    const siteJapaneseKeys = Object.keys(siteMessages.ja).sort();
    const siteEnglishKeys = Object.keys(siteMessages.en).sort();
    const siteMissingJapanese = siteEnglishKeys.filter((key) => !Object.prototype.hasOwnProperty.call(siteMessages.ja, key));
    const siteMissingEnglish = siteJapaneseKeys.filter((key) => !Object.prototype.hasOwnProperty.call(siteMessages.en, key));
    if (siteMissingJapanese.length) fail(`${siteScriptRelative}: Japanese keys missing: ${siteMissingJapanese.join(", ")}`);
    if (siteMissingEnglish.length) fail(`${siteScriptRelative}: English keys missing: ${siteMissingEnglish.join(", ")}`);
    for (const language of ["ja", "en"]) {
      for (const [key, value] of Object.entries(siteMessages[language])) {
        if (typeof value !== "string" || !value.trim()) fail(`${siteScriptRelative}: ${language}.${key} is empty or not text`);
      }
    }
    for (const relative of ["index.html", "researcher/index.html"]) {
      const html = await readFile(path.join(siteRoot, ...relative.split("/")), "utf8");
      for (const tagMatch of html.matchAll(/<([A-Za-z0-9:-]+)\b[^>]*>/g)) {
        const attrs = attributes(tagMatch[0]);
        if (Object.prototype.hasOwnProperty.call(attrs, "data-site-i18n")) {
          const key = attrs["data-site-i18n"];
          for (const language of ["ja", "en"]) {
            if (!Object.prototype.hasOwnProperty.call(siteMessages[language], key)) {
              fail(`${relative}: data-site-i18n key is missing from ${language}: ${key}`);
            }
          }
        }
        if (Object.prototype.hasOwnProperty.call(attrs, "data-site-version")) {
          const key = attrs["data-site-version"];
          const knownDynamicAudio = key === "audio"
            && siteVersions?.audioSets?.ja === "ja-digits-aligned-wav-v3"
            && siteVersions?.audioSets?.en === "en-us-digits-aligned-wav-v1";
          if (!knownDynamicAudio && !Object.prototype.hasOwnProperty.call(siteVersions || {}, key)) {
            fail(`${relative}: unknown data-site-version key: ${key}`);
          }
        }
      }
    }
    if (!siteMissingJapanese.length && !siteMissingEnglish.length) {
      pass(`Japanese/English landing/researcher dictionaries have identical keys (${siteJapaneseKeys.length}), and page keys resolve`);
    }
  } else {
    fail(`${siteScriptRelative}: both ja and en site dictionaries are required`);
  }

  const expectedSiteVersions = {
    release: "digitspan-pages-1.1.0",
    protocol: "digitspan-research-3.2.0",
    forward: "digitspan-forward-web-3.2.0",
    backward: "digitspan-backward-web-3.2.0",
    audioSets: {
      ja: "ja-digits-aligned-wav-v3",
      en: "en-us-digits-aligned-wav-v1",
    },
    timing: "fixed-soa-deadline-v1",
  };
  if (siteVersions && canonical(siteVersions) !== canonical(expectedSiteVersions)) {
    fail(`${siteScriptRelative}: public link-builder versions differ from the frozen task configuration`);
  }
  const requiredSiteQueryMappings = [
    /release\s*:\s*versions\.release\s*,/,
    /protocol\s*:\s*versions\.protocol\s*,/,
    /task\s*,/,
    /const\s+audio\s*=\s*versions\.audioSets\[spokenLanguage\]\s*;/,
    /\baudio\s*,/,
    /timing\s*:\s*versions\.timing\s*,/,
    /lang\s*:\s*initialLanguage\s*,/,
    /spoken\s*:\s*spokenLanguage\s*,/,
  ];
  if (requiredSiteQueryMappings.some((pattern) => !pattern.test(siteSource))) {
    fail(`${siteScriptRelative}: participant link does not bind all frozen versions, interface language, and spoken language`);
  }
  if (/URLSearchParams\s*\(\s*\{[\s\S]{0,500}?participant(?:Id|_id)/i.test(siteSource)) {
    fail(`${siteScriptRelative}: participant identifiers must never be placed in a generated URL`);
  }
  if (!missingJapanese.length && !missingEnglish.length) {
    pass(`Japanese/English task dictionaries have identical keys (${jaKeys.length}), and task HTML keys resolve in both languages`);
  }
}

async function verifyExperimentContract() {
  const relative = "web-common/experiment.js";
  const source = await readFile(path.join(siteRoot, ...relative.split("/")), "utf8");
  const headerMatch = source.match(/function\s+buildCsv\s*\(\s*\)\s*\{\s*const\s+headers\s*=\s*\[([\s\S]*?)\]\s*;/);
  if (!headerMatch) {
    fail(`${relative}: could not find the CSV header array`);
  } else {
    const headers = [...headerMatch[1].matchAll(/"([A-Za-z0-9_]+)"/g)].map((match) => match[1]);
    const residue = headerMatch[1].replace(/"[A-Za-z0-9_]+"\s*,?/g, "").trim();
    if (residue) fail(`${relative}: CSV header array contains a non-literal entry`);
    if (headers.join("|") !== EXPECTED_CSV_HEADERS.join("|")) {
      fail(`${relative}: schema-v4 CSV columns or order changed`);
    }
  }

  const provenanceMappings = [
    /release_version\s*:\s*config\.releaseVersion\s*,/,
    /audio_set_version\s*:\s*activeAudio\.audioSetVersion\s*,/,
    /configured_initial_language\s*:\s*configuredInitialLanguage\s*,/,
    /ui_language\s*:\s*uiLanguage\s*,/,
    /spoken_digit_language\s*:\s*configuredSpokenDigitLanguage\s*,/,
  ];
  if (provenanceMappings.some((pattern) => !pattern.test(source))) {
    fail(`${relative}: one or more 3.2.0 provenance-column mappings changed`);
  }
  if (!/test_mode\s*:\s*testMode\s*\?\s*1\s*:\s*0\s*,/.test(source)) {
    fail(`${relative}: test_mode must be exported as numeric 1/0`);
  }

  const requiredPatterns = [
    [/const\s+loopbackHost\s*=\s*isLoopbackHost\(window\.location\.hostname\)\s*;/, "loopback detection"],
    [/const\s+testRequested\s*=\s*params\.get\("test"\)\s*===\s*"1"\s*;/, "test=1 request detection"],
    [/const\s+testMode\s*=\s*testRequested\s*&&\s*loopbackHost\s*;/, "test-mode loopback gate"],
    [/const\s+configuredSpokenDigitLanguage\s*=\s*\["ja",\s*"en"\]\.includes\(params\.get\("spoken"\)\)\s*\?\s*params\.get\("spoken"\)\s*:\s*"ja"\s*;/, "spoken-language selection"],
    [/const\s+activeAudio\s*=\s*config\?\.audioSets\?\.\[configuredSpokenDigitLanguage\]\s*;/, "spoken-language audio-set binding"],
    [/if\s*\(params\.has\("test"\)\s*&&\s*!loopbackHost\)\s*\{\s*throw\s+new\s+Error\(t\("error\.publicTest"\)\)\s*;\s*\}/, "public test-mode fail-closed check"],
    [/const\s+requiredPublicKeys\s*=\s*\[\.\.\.Object\.keys\(versionParams\),\s*"lang",\s*"spoken"\]\s*;/, "public spoken-language requirement"],
    [/function\s+responseDeadlineMs\(level\)\s*\{\s*return\s+2000\s*\*\s*\(level\s*\+\s*1\)\s*;\s*\}/, "frozen response deadline"],
    [/function\s+effectiveDelay\(ms\)\s*\{\s*return\s+testMode\s*\?\s*Math\.min\(ms,\s*2\)\s*:\s*ms\s*;\s*\}/, "test-only accelerated delay"],
    [/if\s*\(testMode\)\s*\{\s*window\.__digitSpanTest\s*=/, "test-hook loopback gate"],
  ];
  for (const [pattern, label] of requiredPatterns) {
    if (!pattern.test(source)) fail(`${relative}: ${label} changed or is missing`);
  }

  const loopbackMatch = source.match(/function\s+isLoopbackHost\(hostname\)\s*\{([\s\S]*?)\n\s*\}/);
  const actualLoopbackBody = loopbackMatch?.[1].replace(/\s+/g, " ").trim();
  const expectedLoopbackBody = "return hostname === \"localhost\" || hostname === \"127.0.0.1\" || hostname === \"::1\" || hostname === \"[::1]\";";
  if (actualLoopbackBody !== expectedLoopbackBody) {
    fail(`${relative}: loopback allowlist must be exactly localhost, 127.0.0.1, ::1, and [::1]`);
  }
  pass("CSV schema/provenance, fixed response deadline, and loopback-only test-mode contracts checked");
}

async function verifyManifest(manifestPath, manifestRoot, label) {
  const relativeManifest = toPosix(path.relative(manifestRoot, manifestPath));
  const text = await readFile(manifestPath, "utf8");
  const records = new Map();
  for (const [index, line] of text.trimEnd().split("\n").entries()) {
    const match = line.replace(/\r$/, "").match(/^([0-9a-f]{64})  ([A-Za-z0-9._/-]+)$/);
    if (!match) {
      fail(`${label} has an invalid line ${index + 1}`);
      continue;
    }
    const [, digest, relative] = match;
    if (relative.startsWith("/") || relative.split("/").includes("..")) {
      fail(`${label} has an unsafe path: ${relative}`);
      continue;
    }
    if (records.has(relative)) fail(`${label} repeats path: ${relative}`);
    records.set(relative, digest);
  }

  const actual = (await listFiles(manifestRoot)).filter((item) => item !== relativeManifest);
  equalSets(actual, new Set(records.keys()), `${label} coverage`);
  for (const [relative, expected] of records) {
    const actualDigest = await sha256(path.join(manifestRoot, ...relative.split("/")));
    if (actualDigest !== expected) fail(`${label} hash mismatch: ${relative}`);
  }
  if (![...records.keys()].some((item) => item.endsWith("audio/beep.wav") || item === "audio/beep.wav")) {
    fail(`${label} does not bind beep.wav`);
  }
  pass(`${label} SHA-256 entries verified (${records.size})`);
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      values.push(value);
      value = "";
    } else value += char;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  values.push(value);
  return values;
}

function parseWave(buffer, label) {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`${label} is not a RIFF/WAVE file`);
  }
  let offset = 12;
  let format = null;
  let dataBytes = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > buffer.length) throw new Error(`${label} has a truncated ${id} chunk`);
    if (id === "fmt " && size >= 16) {
      format = {
        audioFormat: buffer.readUInt16LE(start),
        channels: buffer.readUInt16LE(start + 2),
        sampleRate: buffer.readUInt32LE(start + 4),
        bitsPerSample: buffer.readUInt16LE(start + 14),
      };
    }
    if (id === "data") dataBytes = size;
    offset = start + size + (size % 2);
  }
  if (!format || dataBytes === null) throw new Error(`${label} lacks fmt or data chunks`);
  const bytesPerFrame = format.channels * (format.bitsPerSample / 8);
  return { ...format, frames: dataBytes / bytesPerFrame };
}

async function verifyDigitAudioSet({ directory, expectedHeader, label, words = null }) {
  const manifestPath = path.join(siteRoot, "audio", directory, "MANIFEST.csv");
  const lines = (await readFile(manifestPath, "utf8")).trim().split(/\r?\n/);
  const header = parseCsvLine(lines.shift());
  if (header.join("|") !== expectedHeader.join("|")) fail(`${label} MANIFEST.csv header changed`);
  const rows = lines.map(parseCsvLine);
  if (rows.length !== 10) fail(`${label} manifest has ${rows.length} rows, expected 10`);
  const seen = new Set();
  for (const row of rows) {
    const record = Object.fromEntries(header.map((name, index) => [name, row[index]]));
    const digit = Number(record.digit);
    if (!Number.isInteger(digit) || digit < 0 || digit > 9 || seen.has(digit)) {
      fail(`Invalid or duplicate ${label} row: ${record.digit}`);
      continue;
    }
    seen.add(digit);
    if (record.file !== `${digit}.wav`) fail(`Unexpected ${label} filename for ${digit}: ${record.file}`);
    if (words && record.word !== words[digit]) fail(`${label} digit ${digit} has unexpected word: ${record.word}`);
    if (Object.prototype.hasOwnProperty.call(record, "source_sha256") && !/^[0-9a-f]{64}$/.test(record.source_sha256)) {
      fail(`${label} digit ${digit} has invalid source SHA-256`);
    }
    const audioPath = path.join(siteRoot, "audio", directory, record.file);
    if ((await sha256(audioPath)) !== record.sha256) fail(`${label} digit ${digit} SHA-256 differs from MANIFEST.csv`);
    const wave = parseWave(await readFile(audioPath), `${label} digit ${digit}`);
    if (wave.audioFormat !== 1 || wave.channels !== 1 || wave.sampleRate !== 48000 || wave.bitsPerSample !== 16 || wave.frames !== 43200) {
      fail(`${label} digit ${digit} is not mono PCM16 48 kHz with exactly 43,200 frames`);
    }
    const duration = Number(record.duration_seconds);
    const onset = Number(record.leading_silence_seconds);
    const loudness = Number(record.integrated_lufs);
    const peak = Number(record.true_peak_dbfs);
    if (Math.abs(duration - 0.9) >= 1 / 48000) fail(`${label} digit ${digit} duration is outside tolerance`);
    if (Math.abs(onset - 0.1) > 0.012) fail(`${label} digit ${digit} onset is outside tolerance`);
    if (loudness < -20.8 || loudness > -20.6) fail(`${label} digit ${digit} loudness is outside the frozen range`);
    if (peak > -3) fail(`${label} digit ${digit} true peak exceeds -3 dBFS`);
  }
  if (seen.size === 10) pass(`All ten ${label} WAV files match the frozen manifest and PCM contract`);
}

async function verifyAudio() {
  await verifyDigitAudioSet({
    directory: "digits-normalized-v3",
    expectedHeader: [
      "digit", "file", "duration_seconds", "leading_silence_seconds",
      "integrated_lufs", "true_peak_dbfs", "sha256",
    ],
    label: "Japanese digit",
  });
  await verifyDigitAudioSet({
    directory: "digits-en-us-normalized-v1",
    expectedHeader: [
      "digit", "word", "file", "duration_seconds", "leading_silence_seconds",
      "integrated_lufs", "true_peak_dbfs", "source_sha256", "sha256",
    ],
    label: "US-English digit",
    words: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
  });

  const beepPath = path.join(siteRoot, "audio", "beep.wav");
  if ((await sha256(beepPath)) !== EXPECTED_BEEP_SHA256) fail("beep.wav SHA-256 changed");
  const beep = parseWave(await readFile(beepPath), "beep.wav");
  if (beep.audioFormat !== 1 || beep.channels !== 1 || beep.sampleRate !== 44100 || beep.bitsPerSample !== 16 || beep.frames !== 6615) {
    fail("beep.wav is not the frozen mono PCM16 44.1 kHz / 6,615-frame cue");
  } else pass("beep.wav matches the frozen hash and PCM contract");
}

function attributes(tag) {
  const result = {};
  const body = tag.replace(/^<\/?[A-Za-z0-9:-]+/, "").replace(/>$/, "");
  const pattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of body.matchAll(pattern)) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return result;
}

function parseCsp(value) {
  const directives = new Map();
  for (const part of value.split(";")) {
    const words = part.trim().split(/\s+/).filter(Boolean);
    if (words.length) directives.set(words[0].toLowerCase(), words.slice(1));
  }
  return directives;
}

function localTarget(htmlRelative, rawUrl) {
  const withoutFragment = rawUrl.split("#", 1)[0];
  const withoutQuery = withoutFragment.split("?", 1)[0];
  if (!withoutQuery) return null;
  const decoded = decodeURIComponent(withoutQuery);
  const parent = path.posix.dirname(htmlRelative);
  let target = path.posix.normalize(path.posix.join(parent, decoded));
  if (decoded.endsWith("/")) target = path.posix.join(target, "index.html");
  return target.replace(/^\.\//, "");
}

async function verifyHtml(siteFiles) {
  const siteSet = new Set(siteFiles);
  const htmlFiles = siteFiles.filter((item) => item.endsWith(".html"));
  for (const relative of htmlFiles) {
    const html = await readFile(path.join(siteRoot, ...relative.split("/")), "utf8");
    const htmlTag = html.match(/<html\b[^>]*>/i);
    const htmlAttrs = htmlTag ? attributes(htmlTag[0]) : {};
    if (!new Set(["ja", "en"]).has((htmlAttrs.lang || "").toLowerCase())) fail(`${relative}: html lang must be ja or en`);
    if (/<base\b/i.test(html)) fail(`${relative}: <base> is forbidden; use relative URLs`);
    if (/<style\b[^>]*>[\s\S]*?<\/style>/i.test(html) || /\sstyle\s*=/i.test(html)) fail(`${relative}: inline CSS is forbidden`);
    for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const attrs = attributes(`<script ${script[1]}>`);
      if (!attrs.src && script[2].trim()) fail(`${relative}: inline JavaScript is forbidden`);
    }

    const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attributes(match[0]));
    const referrer = metaTags.find((item) => (item.name || "").toLowerCase() === "referrer");
    if (!referrer || (referrer.content || "").toLowerCase() !== "no-referrer") fail(`${relative}: missing meta referrer=no-referrer`);
    const robots = metaTags.find((item) => (item.name || "").toLowerCase() === "robots");
    const robotTokens = new Set((robots?.content || "").toLowerCase().split(/[\s,]+/).filter(Boolean));
    for (const token of ["noindex", "nofollow", "noarchive"]) {
      if (!robotTokens.has(token)) fail(`${relative}: robots meta is missing ${token}`);
    }
    const cspMeta = metaTags.find((item) => (item["http-equiv"] || "").toLowerCase() === "content-security-policy");
    if (!cspMeta?.content) {
      fail(`${relative}: missing meta Content-Security-Policy`);
    } else {
      const csp = parseCsp(cspMeta.content);
      const exact = new Map([
        ["script-src", ["'self'"]],
        ["style-src", ["'self'"]],
        ["media-src", ["'self'"]],
        ["connect-src", ["'none'"]],
        ["object-src", ["'none'"]],
        ["base-uri", ["'none'"]],
        ["form-action", ["'none'"]],
      ]);
      const defaultValues = csp.get("default-src") || [];
      if (defaultValues.length !== 1 || defaultValues[0] !== "'self'") fail(`${relative}: default-src must be exactly 'self'`);
      for (const [directive, expected] of exact) {
        if ((csp.get(directive) || []).join(" ") !== expected.join(" ")) fail(`${relative}: ${directive} must be exactly ${expected.join(" ")}`);
      }
      const imageValues = csp.get("img-src") || [];
      if (imageValues.join(" ") !== "'self' data:") fail(`${relative}: img-src must be exactly 'self' data:`);
      if (/unsafe-inline|unsafe-eval|https?:|\*/i.test(cspMeta.content)) fail(`${relative}: CSP contains an unsafe or external source`);
    }

    for (const tagMatch of html.matchAll(/<([A-Za-z0-9:-]+)\b[^>]*>/g)) {
      const tagName = tagMatch[1].toLowerCase();
      const attrs = attributes(tagMatch[0]);
      for (const attributeName of Object.keys(attrs)) {
        if (/^on[a-z]/i.test(attributeName)) fail(`${relative}: inline event handler is forbidden: ${attributeName}`);
      }
      for (const name of ["src", "href", "poster"]) {
        const value = attrs[name];
        if (!value || value.startsWith("#")) continue;
        if (value.startsWith("/") || value.startsWith("\\")) {
          fail(`${relative}: root-relative ${name} is not project-Pages safe: ${value}`);
          continue;
        }
        if (value.startsWith("data:")) {
          const iconLink = tagName === "link" && /(?:^|\s)icon(?:\s|$)/i.test(attrs.rel || "");
          if (!(tagName === "img" || iconLink)) fail(`${relative}: data URL is permitted only for images/icons`);
          continue;
        }
        let parsed;
        try { parsed = new URL(value, "https://release.invalid/"); }
        catch { fail(`${relative}: invalid ${name} URL: ${value}`); continue; }
        const external = parsed.origin !== "https://release.invalid";
        if (external) {
          if (!(tagName === "a" && parsed.protocol === "https:")) fail(`${relative}: external resource is forbidden: ${value}`);
          if (tagName === "a" && (attrs.target || "").toLowerCase() === "_blank") {
            const relTokens = new Set((attrs.rel || "").toLowerCase().split(/\s+/));
            if (!relTokens.has("noopener") || !relTokens.has("noreferrer")) fail(`${relative}: target=_blank link lacks noopener noreferrer`);
          }
          continue;
        }
        const target = localTarget(relative, value);
        if (target && !siteSet.has(target)) fail(`${relative}: local ${name} target is missing: ${value} -> ${target}`);
      }
    }
  }
  pass(`HTML policy and local-link checks completed (${htmlFiles.length} pages)`);
}

async function verifyCss(siteFiles) {
  const siteSet = new Set(siteFiles);
  for (const relative of siteFiles.filter((item) => item.endsWith(".css"))) {
    const css = await readFile(path.join(siteRoot, ...relative.split("/")), "utf8");
    const urls = [
      ...[...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].map((match) => match[1].trim()),
      ...[...css.matchAll(/@import\s+["']([^"']+)["']/gi)].map((match) => match[1].trim()),
    ];
    for (const value of urls) {
      if (value.startsWith("data:")) continue;
      if (value.startsWith("/") || /^https?:|^\/\//i.test(value)) {
        fail(`${relative}: external or root-relative CSS URL is forbidden: ${value}`);
        continue;
      }
      const target = localTarget(relative, value);
      if (target && !siteSet.has(target)) fail(`${relative}: CSS target is missing: ${value} -> ${target}`);
    }
  }
  pass("CSS URL checks completed");
}

async function verifyNoPrivateMaterial(rootFiles) {
  for (const relative of rootFiles) {
    const lower = relative.toLowerCase();
    const extension = path.posix.extname(lower);
    if (FORBIDDEN_EXTENSIONS.has(extension)) fail(`Forbidden public-release extension: ${relative}`);
    if (extension === ".csv" && !ALLOWED_CSV.has(relative)) fail(`Only the frozen audio MANIFEST.csv may be public: ${relative}`);
    if (/unity|digitforward01|digitback01|wide&long|0maindata|participant|response.*\.csv/i.test(relative)) {
      fail(`Private or legacy-looking path is forbidden: ${relative}`);
    }
  }
  const textFiles = rootFiles.filter((item) => /\.(?:css|html|js|json|md|mjs|txt|ya?ml)$/i.test(item));
  for (const relative of textFiles) {
    const text = await readFile(path.join(root, ...relative.split("/")), "utf8");
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)) fail(`${relative}: embedded private key marker`);
    if (/(?:^|["'\s])(\/Users\/|[A-Za-z]:\\\\Users\\\\)/m.test(text)) fail(`${relative}: local user path is forbidden`);
    if (/\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|private[_-]?key)\s*[:=]\s*["'][^"']+["']/i.test(text)) {
      fail(`${relative}: possible embedded secret assignment`);
    }
  }
  pass("No forbidden archive, office, legacy-binary, result-CSV, local-path, or secret material found");
}

async function verifyJavaScript(siteFiles) {
  const jsFiles = siteFiles.filter((item) => /\.(?:js|mjs)$/.test(item));
  const { spawnSync } = await import("node:child_process");
  for (const relative of jsFiles) {
    const result = spawnSync(process.execPath, ["--check", path.join(siteRoot, ...relative.split("/"))], { encoding: "utf8" });
    if (result.status !== 0) fail(`${relative}: node --check failed\n${result.stderr || result.stdout}`);
  }
  pass(`JavaScript syntax checked (${jsFiles.length} files)`);
}

async function verifyDeploymentWorkflow() {
  const relative = ".github/workflows/pages.yml";
  const source = await readFile(path.join(root, ...relative.split("/")), "utf8");
  const requiredPatterns = [
    [/workflow_dispatch:\s*\n\s*inputs:\s*\n\s*audio_rights_confirmed:/, "manual audio-rights confirmation input"],
    [/startsWith\(github\.ref, 'refs\/tags\/digitspan-v'\)/, "approved release-tag gate"],
    [/inputs\.audio_rights_confirmed\s*==\s*true/, "audio-rights deployment gate"],
    [/uses:\s*actions\/upload-pages-artifact@v4[\s\S]*?path:\s*\.\/site(?:\s|$)/, "site-only Pages artifact"],
    [/uses:\s*actions\/deploy-pages@v4/, "official Pages deploy action"],
  ];
  for (const [pattern, label] of requiredPatterns) {
    if (!pattern.test(source)) fail(`${relative}: ${label} changed or is missing`);
  }
  pass("Tag, audio-rights confirmation, and site-only deployment gates checked");
}

async function main() {
  const rootFiles = await listFiles(root);
  const siteFiles = await listFiles(siteRoot);
  equalSets(rootFiles, new Set([...EXPECTED_ROOT_FILES, ...[...EXPECTED_SITE_FILES].map((item) => `site/${item}`)]), "Generated repository");
  equalSets(siteFiles, EXPECTED_SITE_FILES, "Pages site");
  await verifyManifest(path.join(root, "RELEASE_MANIFEST.sha256"), root, "Repository manifest");
  await verifyManifest(path.join(siteRoot, "RELEASE_MANIFEST.sha256"), siteRoot, "Site manifest");
  await verifyNoPrivateMaterial(rootFiles);
  await verifyAudio();
  await verifyFrozenConfigs();
  await verifyTaskInternationalization();
  await verifyExperimentContract();
  await verifyDeploymentWorkflow();
  await verifyHtml(siteFiles);
  await verifyCss(siteFiles);
  await verifyJavaScript(siteFiles);

  for (const message of passes) console.log(`[PASS] ${message}`);
  if (failures.length) {
    for (const message of failures) console.error(`[FAIL] ${message}`);
    console.error(`FAILED: ${failures.length} public-release check(s) failed`);
    process.exitCode = 1;
  } else {
    console.log(`PASSED: ${passes.length} public-release check groups`);
  }
}

main().catch((error) => {
  console.error(`[ERROR] ${error.stack || error.message}`);
  process.exitCode = 2;
});
