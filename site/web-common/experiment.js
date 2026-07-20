(() => {
  "use strict";

  const config = window.DIGIT_SPAN_CONFIG;
  const i18n = window.DIGIT_SPAN_I18N;
  const params = new URLSearchParams(window.location.search);
  const loopbackHost = isLoopbackHost(window.location.hostname);
  const testRequested = params.get("test") === "1";
  const testMode = testRequested && loopbackHost;
  const configuredInitialLanguage = ["ja", "en"].includes(params.get("lang")) ? params.get("lang") : "ja";
  const configuredSpokenDigitLanguage = ["ja", "en"].includes(params.get("spoken")) ? params.get("spoken") : "ja";
  const activeAudio = config?.audioSets?.[configuredSpokenDigitLanguage];
  let uiLanguage = configuredInitialLanguage;
  const screens = ["intro", "practice", "main", "done"];
  const audioCache = new Map();
  const els = {};

  const state = {
    screen: "intro",
    phase: null,
    running: false,
    currentIndex: -1,
    responseStart: null,
    firstKeyAt: null,
    trialOpenedAtUtc: null,
    participantId: "",
    sessionId: createSessionId(),
    sessionStartedAtUtc: null,
    sessionCompletedAtUtc: null,
    sessionStatus: "not_started",
    audioReady: testMode,
    preflightAudioErrorCount: 0,
    trialAudioErrorCount: 0,
    focusLossCount: 0,
    visibilityChangeCount: 0,
    trialFocusLossStart: 0,
    trialVisibilityChangeStart: 0,
    trialStartedAtUtc: null,
    trialTimingQc: null,
    responseTimeoutId: null,
    responseDeadlineAt: null,
    results: [],
    downloaded: false,
    runToken: 0,
    testAudioFailureMessage: null,
    languageLocked: false,
    audioStatusKey: testMode ? "status.testAudio" : "status.audioInitial",
    audioStatusValues: {},
    audioStatusState: testMode ? "ok" : "neutral",
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    try {
      bindElements();
      applyLanguage();
      validateConfig();
      validateLaunchParameters();
      attachEvents();
      renderProtocolText();
      showScreen("intro");
      updateIntroState();
      exposeTestHooks();
    } catch (error) {
      showFatalError(error);
    }
  }

  function validateConfig() {
    if (!config) {
      throw new Error(t("error.missingConfig"));
    }
    if (!i18n || typeof i18n.text !== "function" || typeof i18n.translateDocument !== "function") {
      throw new Error("DIGIT_SPAN_I18N was not loaded.");
    }
    if (!["forward", "backward"].includes(config.mode)) {
      throw new Error(t("error.invalidMode"));
    }
    const requiredVersions = [
      "releaseVersion",
      "schemaVersion",
      "protocolVersion",
      "taskVersion",
      "practiceSetVersion",
      "trialSetVersion",
      "timingVersion",
    ];
    const missingVersions = requiredVersions.filter((key) => typeof config[key] !== "string" || config[key].length === 0);
    if (missingVersions.length > 0) {
      throw new Error(t("error.missingVersions", { keys: missingVersions.join(", ") }));
    }
    const expectedAudioVersions = {
      ja: "ja-digits-aligned-wav-v3",
      en: "en-us-digits-aligned-wav-v1",
    };
    ["ja", "en"].forEach((language) => {
      const audioSet = config.audioSets?.[language];
      if (
        audioSet?.audioSetVersion !== expectedAudioVersions[language]
        || audioSet?.spokenDigitLanguage !== language
        || typeof audioSet?.digitsDir !== "string"
        || typeof audioSet?.digitExtension !== "string"
        || typeof audioSet?.beep !== "string"
      ) {
        throw new Error(t("error.audioConfig"));
      }
    });
    if (!activeAudio) {
      throw new Error(t("error.audioConfig"));
    }
    if (!Array.isArray(config.practiceTrials) || config.practiceTrials.length !== 3) {
      throw new Error(t("error.practiceCount"));
    }
    if (!Array.isArray(config.mainTrials) || config.mainTrials.length !== 21) {
      throw new Error(t("error.mainCount"));
    }
    const allTrials = [...config.practiceTrials, ...config.mainTrials];
    if (allTrials.some((digits) => !/^\d{3,9}$/.test(digits))) {
      throw new Error(t("error.trialDigits"));
    }
    for (let level = 3; level <= 9; level += 1) {
      if (config.mainTrials.filter((digits) => digits.length === level).length !== 3) {
        throw new Error(t("error.levelCount", { level }));
      }
    }
    const requiredTimings = [
      "preDigitsMs",
      "digitSoaMs",
      "lastDigitToBeepMs",
      "responseUnlockAfterBeepMs",
      "practiceFeedbackMs",
      "mainNextTrialDelayMs",
      "audioCheckGapMs",
    ];
    const invalidTimings = requiredTimings.filter((key) => !Number.isFinite(config.timing?.[key]) || config.timing[key] < 0);
    if (invalidTimings.length > 0 || config.timing.digitSoaMs === 0 || config.timing.lastDigitToBeepMs === 0) {
      throw new Error(t("error.invalidTiming", { keys: invalidTimings.join(", ") }));
    }
    if (config.timing.responseUnlockAfterBeepMs !== 0) {
      throw new Error(t("error.unlockTiming"));
    }
    if (config.mode === "forward" && (
      typeof config.nextMode?.path !== "string"
      || typeof config.nextMode?.taskVersion !== "string"
    )) {
      throw new Error(t("error.nextConfig"));
    }
  }

  function validateLaunchParameters() {
    const versionParams = {
      release: config.releaseVersion,
      protocol: config.protocolVersion,
      task: config.taskVersion,
      audio: activeAudio.audioSetVersion,
      timing: config.timingVersion,
    };
    const allowed = new Set([...Object.keys(versionParams), "lang", "spoken", "test"]);
    const unknown = [...new Set([...params.keys()].filter((key) => !allowed.has(key)))];
    if (unknown.length > 0) {
      throw new Error(t("error.queryUnknown", { keys: unknown.join(", ") }));
    }
    for (const key of allowed) {
      if (params.getAll(key).length > 1) {
        throw new Error(t("error.queryDuplicate", { key }));
      }
    }
    if (window.location.hash) {
      throw new Error(t("error.fragment"));
    }
    if (params.has("lang") && !["ja", "en"].includes(params.get("lang"))) {
      throw new Error(t("error.queryLanguage"));
    }
    if (params.has("spoken") && !["ja", "en"].includes(params.get("spoken"))) {
      throw new Error(t("error.querySpokenLanguage"));
    }
    if (params.has("test") && params.get("test") !== "1") {
      throw new Error(t("error.queryTest"));
    }
    if (params.has("test") && !loopbackHost) {
      throw new Error(t("error.publicTest"));
    }
    const requiredPublicKeys = [...Object.keys(versionParams), "lang", "spoken"];
    if (!loopbackHost) {
      const missing = requiredPublicKeys.filter((key) => !params.has(key));
      if (missing.length > 0) {
        throw new Error(t("error.queryMissing", { keys: missing.join(", ") }));
      }
    }
    Object.entries(versionParams).forEach(([key, expected]) => {
      if (params.has(key) && params.get(key) !== expected) {
        throw new Error(t("error.queryMismatch", { key }));
      }
    });
  }

  function bindElements() {
    const ids = [
      "app-shell",
      "fatal-error",
      "test-mode-badge",
      "language-switcher",
      "language-label",
      "language-ja",
      "language-en",
      "spoken-language-note",
      "fullscreen-toggle",
      "participant-id",
      "participant-id-help",
      "audio-check",
      "audio-confirm",
      "audio-status",
      "intro-start",
      "practice-start",
      "practice-status",
      "practice-progress",
      "practice-input",
      "practice-submit",
      "main-start",
      "main-status",
      "main-progress",
      "main-input",
      "main-submit",
      "completion-summary",
      "download-results",
      "download-status",
      "next-mode",
      "next-mode-help",
      "restart",
      "protocol-version",
    ];
    ids.forEach((id) => {
      els[toCamel(id)] = document.getElementById(id);
    });
    screens.forEach((name) => {
      els[`screen${capitalize(name)}`] = document.getElementById(`screen-${name}`);
    });
    const missing = Object.entries(els).filter(([, value]) => !value).map(([key]) => key);
    if (missing.length > 0) {
      throw new Error(t("error.missingElements", { keys: missing.join(", ") }));
    }
  }

  function attachEvents() {
    els.participantId.addEventListener("input", handleParticipantInput);
    els.languageJa.addEventListener("click", () => setLanguage("ja"));
    els.languageEn.addEventListener("click", () => setLanguage("en"));
    els.audioCheck.addEventListener("click", checkAudio);
    els.audioConfirm.addEventListener("click", confirmAudio);
    els.introStart.addEventListener("click", enterPractice);
    els.practiceStart.addEventListener("click", () => beginPhase("practice"));
    els.mainStart.addEventListener("click", () => beginPhase("main"));
    els.practiceSubmit.addEventListener("click", handleSubmit);
    els.mainSubmit.addEventListener("click", handleSubmit);
    els.practiceInput.addEventListener("input", handleResponseInput);
    els.mainInput.addEventListener("input", handleResponseInput);
    els.practiceInput.addEventListener("keydown", handleResponseKeydown);
    els.mainInput.addEventListener("keydown", handleResponseKeydown);
    els.practiceInput.addEventListener("paste", preventPaste);
    els.mainInput.addEventListener("paste", preventPaste);
    els.downloadResults.addEventListener("click", downloadResults);
    els.restart.addEventListener("click", restartAll);
    els.fullscreenToggle.addEventListener("click", toggleFullscreen);
    document.addEventListener("keydown", handleGlobalKeydown);
    document.addEventListener("fullscreenchange", updateFullscreenButton);
    document.addEventListener("visibilitychange", trackVisibilityChange);
    window.addEventListener("blur", trackFocusLoss);
    window.addEventListener("beforeunload", warnBeforeUnload);
  }

  function renderProtocolText() {
    document.body.dataset.mode = config.mode;
    document.body.dataset.testMode = testMode ? "true" : "false";
    document.body.dataset.uiLanguage = uiLanguage;
    document.body.dataset.spokenDigitLanguage = configuredSpokenDigitLanguage;
    els.protocolVersion.textContent = `${config.releaseVersion} / ${config.protocolVersion} / ${config.taskVersion} / ${config.trialSetVersion} / ${activeAudio.audioSetVersion}`;
    els.participantId.maxLength = testMode ? 32 : 17;
    els.practiceInput.maxLength = 9;
    els.mainInput.maxLength = 9;
    els.testModeBadge.hidden = !testMode;
    if (testMode) {
      setAudioStatus("status.testAudio", {}, "ok");
      els.audioConfirm.hidden = true;
      els.audioConfirm.disabled = true;
    }
    configureNextModeLink(false);
    updateLanguageControls();
  }

  function t(key, values = {}) {
    return i18n?.text ? i18n.text(uiLanguage, key, values) : key;
  }

  function applyLanguage() {
    if (i18n?.translateDocument) i18n.translateDocument(uiLanguage);
    document.body.dataset.uiLanguage = uiLanguage;
    els.spokenLanguageNote.textContent = t("common.spokenNote", {
      language: t(`common.spokenLanguage.${configuredSpokenDigitLanguage}`),
    });
    updateFullscreenButton();
    updateLanguageControls();
    if (els.audioStatus) renderAudioStatus();
    if (els.participantId) updateIntroState();
    if (state.screen === "practice" && !state.languageLocked) {
      els.practiceStatus.textContent = t("status.practiceReady");
      els.practiceProgress.textContent = t("status.practiceProgress", { current: 0, total: config.practiceTrials.length });
    }
  }

  function setLanguage(language) {
    if (state.languageLocked || !["ja", "en"].includes(language) || language === uiLanguage) return;
    uiLanguage = language;
    updateLanguageQuery(language);
    applyLanguage();
  }

  function updateLanguageQuery(language) {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("lang", language);
    window.history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
  }

  function updateLanguageControls() {
    if (!els.languageJa || !els.languageEn) return;
    [els.languageJa, els.languageEn].forEach((button) => {
      const selected = button.dataset.language === uiLanguage;
      button.setAttribute("aria-pressed", selected ? "true" : "false");
      button.disabled = state.languageLocked;
      button.title = state.languageLocked ? t("language.locked") : "";
    });
  }

  function setAudioStatus(key, values = {}, status = "neutral") {
    state.audioStatusKey = key;
    state.audioStatusValues = values;
    state.audioStatusState = status;
    renderAudioStatus();
  }

  function renderAudioStatus() {
    if (!els.audioStatus) return;
    els.audioStatus.textContent = t(state.audioStatusKey, state.audioStatusValues);
    els.audioStatus.dataset.state = state.audioStatusState;
  }

  function handleParticipantInput() {
    const normalized = normalizeParticipantId(els.participantId.value);
    if (els.participantId.value !== normalized) {
      els.participantId.value = normalized;
    }
    state.participantId = normalized;
    updateIntroState();
  }

  function normalizeParticipantId(value) {
    const normalized = value.normalize("NFKC").replace(/\s+/g, "");
    return testMode ? normalized.slice(0, 32) : normalized.toUpperCase().slice(0, 17);
  }

  function participantIdIsValid(value) {
    return testMode
      ? /^[A-Za-z][A-Za-z0-9_-]{1,31}$/.test(value)
      : /^PVLT-[A-F0-9]{12}$/.test(value);
  }

  function updateIntroState() {
    const hasValue = state.participantId.length > 0;
    const valid = participantIdIsValid(state.participantId);
    if (!hasValue) {
      els.participantIdHelp.textContent = t("status.idEmpty");
      els.participantIdHelp.dataset.state = "neutral";
    } else if (!valid) {
      els.participantIdHelp.textContent = testMode
        ? t("status.idInvalidTest")
        : t("status.idInvalidProduction");
      els.participantIdHelp.dataset.state = "error";
    } else {
      els.participantIdHelp.textContent = t("status.idOk");
      els.participantIdHelp.dataset.state = "ok";
    }
    els.introStart.disabled = !(valid && state.audioReady);
  }

  async function checkAudio() {
    if (!testMode) {
      state.audioReady = false;
      els.audioConfirm.hidden = true;
      els.audioConfirm.disabled = true;
      updateIntroState();
    }
    els.audioCheck.disabled = true;
    setAudioStatus("status.audioLoading");
    try {
      await warmupAudio();
      await playAudio(digitSrc("2"));
      await wait(config.timing.audioCheckGapMs);
      await playAudio(activeAudio.beep);
      if (testMode) {
        state.audioReady = true;
        setAudioStatus("status.testAudio", {}, "ok");
      } else {
        state.audioReady = false;
        els.audioConfirm.hidden = false;
        els.audioConfirm.disabled = false;
        setAudioStatus("status.audioPrompt");
        els.audioConfirm.focus({ preventScroll: true });
      }
    } catch (error) {
      state.audioReady = testMode;
      state.preflightAudioErrorCount += 1;
      els.audioConfirm.hidden = true;
      els.audioConfirm.disabled = true;
      setAudioStatus("status.audioError", { message: error.message }, "error");
    } finally {
      els.audioCheck.disabled = false;
      updateIntroState();
    }
  }

  function confirmAudio() {
    if (testMode || els.audioConfirm.disabled) return;
    state.audioReady = true;
    els.audioConfirm.disabled = true;
    setAudioStatus("status.audioConfirmed", {}, "ok");
    updateIntroState();
    els.introStart.focus({ preventScroll: true });
  }

  function enterPractice() {
    if (!participantIdIsValid(state.participantId) || !state.audioReady) return;
    state.sessionStartedAtUtc = new Date().toISOString();
    state.sessionStatus = "in_progress";
    showScreen("practice");
    els.practiceStatus.textContent = t("status.practiceReady");
    els.practiceProgress.textContent = t("status.practiceProgress", { current: 0, total: config.practiceTrials.length });
    setPhaseStartButton("practice", true);
    els.practiceStart.focus({ preventScroll: true });
  }

  async function beginPhase(phase) {
    if (state.running) return;
    const completedPracticeRows = state.results.filter((row) => row.phase === "practice" && row.validTrial === 1 && row.trialStatus === "complete");
    if (phase === "main" && completedPracticeRows.length !== config.practiceTrials.length) {
      showFatalError(new Error(t("error.practiceIncomplete")));
      return;
    }
    state.languageLocked = true;
    updateLanguageControls();
    state.phase = phase;
    state.running = true;
    state.currentIndex = -1;
    state.responseStart = null;
    state.firstKeyAt = null;
    clearResponseDeadline();
    state.runToken += 1;
    setPhaseStartButton(phase, false);
    resetResponseControls();
    await nextTrial(state.runToken);
  }

  async function nextTrial(token) {
    if (!state.running || token !== state.runToken) return;
    state.currentIndex += 1;
    const trials = currentTrials();
    if (state.currentIndex >= trials.length) {
      finishPhase();
      return;
    }

    resetResponseControls();
    updateProgress();
    updateStatus(t("status.presenting"), state.phase);
    state.trialFocusLossStart = state.focusLossCount;
    state.trialVisibilityChangeStart = state.visibilityChangeCount;
    state.trialStartedAtUtc = new Date().toISOString();
    state.trialOpenedAtUtc = null;
    state.trialTimingQc = null;
    try {
      await wait(config.timing.preDigitsMs);
      if (!state.running || token !== state.runToken) return;
      state.trialTimingQc = await playDigitsAndBeep(trials[state.currentIndex]);
    } catch (error) {
      endSessionForTrialAudioError(error);
      return;
    }
    if (!state.running || token !== state.runToken) return;

    const input = currentInput();
    state.responseStart = performance.now();
    state.firstKeyAt = null;
    state.trialOpenedAtUtc = new Date().toISOString();
    input.disabled = false;
    input.value = "";
    input.focus({ preventScroll: true });
    updateSubmitState();
    scheduleResponseDeadline(trials[state.currentIndex], token);
    updateStatus(t(config.mode === "backward" ? "status.respondBackward" : "status.respondForward"), state.phase);
  }

  function currentTrials() {
    return state.phase === "practice" ? config.practiceTrials : config.mainTrials;
  }

  function currentInput() {
    return state.phase === "practice" ? els.practiceInput : els.mainInput;
  }

  function currentSubmit() {
    return state.phase === "practice" ? els.practiceSubmit : els.mainSubmit;
  }

  function handleResponseInput(event) {
    const normalized = normalizeDigits(event.currentTarget.value);
    if (event.currentTarget.value !== normalized) {
      event.currentTarget.value = normalized;
    }
    if (normalized.length > 0 && state.responseStart !== null && state.firstKeyAt === null) {
      state.firstKeyAt = performance.now();
    }
    updateSubmitState();
  }

  function normalizeDigits(value) {
    return value.normalize("NFKC").replace(/[^0-9]/g, "").slice(0, 9);
  }

  function updateSubmitState() {
    const submit = currentSubmit();
    const input = currentInput();
    if (!submit || !input) return;
    submit.disabled = !(state.running && state.responseStart !== null && /^\d+$/.test(input.value));
  }

  function handleResponseKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (!currentSubmit().disabled) handleSubmit();
    }
  }

  function preventPaste(event) {
    event.preventDefault();
    updateStatus(t("status.pasteBlocked"), state.phase);
  }

  function handleSubmit() {
    const deadlinePassed = state.responseDeadlineAt !== null && performance.now() >= state.responseDeadlineAt;
    finalizeResponse(deadlinePassed ? "timeout" : "manual");
  }

  function handleResponseTimeout(token) {
    if (token !== state.runToken) return;
    finalizeResponse("timeout");
  }

  function finalizeResponse(submitMethod) {
    if (!state.running || state.responseStart === null) return;
    const input = currentInput();
    const response = normalizeDigits(input.value);
    const resolvedSubmitMethod = submitMethod === "manual"
      && state.responseDeadlineAt !== null
      && performance.now() >= state.responseDeadlineAt
      ? "timeout"
      : submitMethod;
    const timedOut = resolvedSubmitMethod === "timeout";
    if (!timedOut && !response) return;

    const target = currentTrials()[state.currentIndex];
    const expected = expectedFor(target);
    const submittedAtUtc = new Date().toISOString();
    const deadlineMs = responseDeadlineMs(target.length);
    const rtMs = timedOut ? deadlineMs : Math.max(0, Math.round(performance.now() - state.responseStart));
    const firstKeyRtMs = state.firstKeyAt === null
      ? null
      : Math.max(0, Math.round(state.firstKeyAt - state.responseStart));
    const typingDurationMs = firstKeyRtMs === null ? null : Math.max(0, rtMs - firstKeyRtMs);
    const correct = response === expected;
    const trialQuality = captureTrialQuality();
    clearResponseDeadline();
    state.results.push({
      phase: state.phase,
      trial: state.currentIndex + 1,
      level: target.length,
      target,
      expected,
      response,
      correct,
      rtMs,
      firstKeyRtMs,
      typingDurationMs,
      responseDeadlineMs: deadlineMs,
      submitMethod: resolvedSubmitMethod,
      timedOut,
      trialStatus: "complete",
      validTrial: 1,
      trialStartedAtUtc: state.trialStartedAtUtc,
      trialOpenedAtUtc: state.trialOpenedAtUtc,
      submittedAtUtc,
      trialFocusLossCount: trialQuality.focusLossCount,
      trialVisibilityChangeCount: trialQuality.visibilityChangeCount,
      maxAbsDigitSoaDeviationMs: state.trialTimingQc?.maxAbsDigitSoaDeviationMs ?? null,
      lastDigitToBeepDeviationMs: state.trialTimingQc?.lastDigitToBeepDeviationMs ?? null,
      technicalErrorMessage: "",
    });

    state.responseStart = null;
    state.firstKeyAt = null;
    input.disabled = true;
    currentSubmit().disabled = true;
    if (state.phase === "practice") {
      const feedback = correct ? t("status.practiceCorrect") : t("status.practiceExpected", { expected });
      updateStatus(feedback, "practice");
    } else {
      updateStatus(t("status.recorded"), "main");
    }
    const token = state.runToken;
    const delayMs = state.phase === "practice"
      ? config.timing.practiceFeedbackMs
      : config.timing.mainNextTrialDelayMs;
    window.setTimeout(() => nextTrial(token), effectiveDelay(delayMs));
  }

  function scheduleResponseDeadline(target, token) {
    clearResponseDeadline();
    const deadlineMs = responseDeadlineMs(target.length);
    state.responseDeadlineAt = state.responseStart + deadlineMs;
    state.responseTimeoutId = window.setTimeout(() => handleResponseTimeout(token), deadlineMs);
  }

  function clearResponseDeadline() {
    if (state.responseTimeoutId !== null) {
      window.clearTimeout(state.responseTimeoutId);
      state.responseTimeoutId = null;
    }
    state.responseDeadlineAt = null;
  }

  function responseDeadlineMs(level) {
    return 2000 * (level + 1);
  }

  function captureTrialQuality() {
    return {
      focusLossCount: Math.max(0, state.focusLossCount - state.trialFocusLossStart),
      visibilityChangeCount: Math.max(0, state.visibilityChangeCount - state.trialVisibilityChangeStart),
    };
  }

  function endSessionForTrialAudioError(error) {
    clearResponseDeadline();
    state.runToken += 1;
    state.running = false;
    state.responseStart = null;
    state.firstKeyAt = null;
    state.trialAudioErrorCount += 1;
    state.sessionStatus = "technical_error";
    state.sessionCompletedAtUtc = new Date().toISOString();
    const target = currentTrials()[state.currentIndex];
    const trialQuality = captureTrialQuality();
    state.results.push({
      phase: state.phase,
      trial: state.currentIndex + 1,
      level: target.length,
      target,
      expected: expectedFor(target),
      response: "",
      correct: null,
      rtMs: null,
      firstKeyRtMs: null,
      typingDurationMs: null,
      responseDeadlineMs: responseDeadlineMs(target.length),
      submitMethod: "",
      timedOut: false,
      trialStatus: "technical_error",
      validTrial: 0,
      trialStartedAtUtc: state.trialStartedAtUtc,
      trialOpenedAtUtc: null,
      submittedAtUtc: null,
      trialFocusLossCount: trialQuality.focusLossCount,
      trialVisibilityChangeCount: trialQuality.visibilityChangeCount,
      maxAbsDigitSoaDeviationMs: null,
      lastDigitToBeepDeviationMs: null,
      technicalErrorMessage: error.message,
    });
    resetResponseControls();
    showScreen("done");
    els.completionSummary.textContent = t("status.technicalEnd");
    els.downloadResults.disabled = false;
    els.downloadResults.focus({ preventScroll: true });
    showFatalError(new Error(t("error.trialAudio", { message: error.message })));
  }

  function finishPhase() {
    clearResponseDeadline();
    state.running = false;
    state.responseStart = null;
    state.firstKeyAt = null;
    resetResponseControls();
    if (state.phase === "practice") {
      showScreen("main");
      els.mainProgress.textContent = t("status.mainProgress", { current: 0, total: config.mainTrials.length });
      els.mainStatus.textContent = t("status.mainReady");
      setPhaseStartButton("main", true);
      els.mainStart.focus({ preventScroll: true });
      return;
    }

    state.sessionCompletedAtUtc = new Date().toISOString();
    state.sessionStatus = "completed";
    showScreen("done");
    const mainRows = state.results.filter((row) => row.phase === "main" && row.validTrial === 1 && row.trialStatus === "complete");
    els.completionSummary.textContent = t("status.completed", { count: mainRows.length });
    els.downloadResults.disabled = mainRows.length !== config.mainTrials.length;
    els.downloadResults.focus({ preventScroll: true });
  }

  function updateProgress() {
    const total = currentTrials().length;
    const text = t(state.phase === "practice" ? "status.practiceProgress" : "status.mainProgress", {
      current: state.currentIndex + 1,
      total,
    });
    if (state.phase === "practice") els.practiceProgress.textContent = text;
    else els.mainProgress.textContent = text;
  }

  function resetResponseControls() {
    [els.practiceInput, els.mainInput].forEach((input) => {
      input.value = "";
      input.disabled = true;
    });
    els.practiceSubmit.disabled = true;
    els.mainSubmit.disabled = true;
  }

  function setPhaseStartButton(phase, enabled) {
    const button = phase === "practice" ? els.practiceStart : els.mainStart;
    button.disabled = !enabled;
    button.hidden = !enabled;
  }

  async function warmupAudio() {
    if (testMode) return;
    const sources = Array.from({ length: 10 }, (_, digit) => digitSrc(String(digit)));
    sources.push(activeAudio.beep);
    await Promise.all(sources.map(ensureAudioCached));
  }

  function digitSrc(digit) {
    return `${activeAudio.digitsDir}/${digit}${activeAudio.digitExtension}`;
  }

  function ensureAudioCached(src) {
    if (testMode) return Promise.resolve(null);
    if (audioCache.has(src)) return Promise.resolve(audioCache.get(src));
    return new Promise((resolve, reject) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      const timeoutId = window.setTimeout(() => finish(new Error(t("error.loadTimeout", { src }))), 15000);
      const cleanup = () => {
        window.clearTimeout(timeoutId);
        audio.removeEventListener("canplaythrough", onReady);
        audio.removeEventListener("error", onError);
      };
      const finish = (error) => {
        cleanup();
        if (error) reject(error);
        else {
          audioCache.set(src, audio);
          resolve(audio);
        }
      };
      const onReady = () => finish(null);
      const onError = () => finish(new Error(t("error.loadAudio", { src })));
      audio.addEventListener("canplaythrough", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.load();
    });
  }

  async function playAudio(src, onPlaybackStart = null) {
    if (testMode && state.testAudioFailureMessage) {
      const message = state.testAudioFailureMessage;
      state.testAudioFailureMessage = null;
      throw new Error(message);
    }
    if (testMode) {
      if (onPlaybackStart) onPlaybackStart(performance.now());
      await wait(1);
      return;
    }
    const audio = audioCache.get(src) || await ensureAudioCached(src);
    audio.currentTime = 0;
    await new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => finish(new Error(t("error.playTimeout", { src }))), 15000);
      const cleanup = () => {
        window.clearTimeout(timeoutId);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
      };
      const finish = (error) => {
        cleanup();
        if (error) reject(error);
        else resolve();
      };
      const onEnded = () => finish(null);
      const onError = () => finish(new Error(t("error.playAudio", { src })));
      audio.addEventListener("ended", onEnded, { once: true });
      audio.addEventListener("error", onError, { once: true });
      Promise.resolve(audio.play())
        .then(() => {
          if (onPlaybackStart) onPlaybackStart(performance.now());
        })
        .catch((error) => finish(error));
    });
  }

  async function playDigitsAndBeep(digits) {
    let previousOnsetAt = null;
    const digitOnsets = [];
    for (let index = 0; index < digits.length; index += 1) {
      if (previousOnsetAt !== null) {
        await waitFromOnset(previousOnsetAt, config.timing.digitSoaMs);
      }
      let currentOnsetAt = null;
      const playbackRequestedAt = performance.now();
      await playAudio(digitSrc(digits[index]), (onsetAt) => {
        currentOnsetAt = onsetAt;
      });
      previousOnsetAt = currentOnsetAt ?? playbackRequestedAt;
      digitOnsets.push(previousOnsetAt);
    }
    await waitFromOnset(previousOnsetAt, config.timing.lastDigitToBeepMs);
    let beepOnsetAt = null;
    const beepRequestedAt = performance.now();
    await playAudio(activeAudio.beep, (onsetAt) => {
      beepOnsetAt = onsetAt;
    });
    beepOnsetAt ??= beepRequestedAt;
    const digitSoaDeviations = digitOnsets.slice(1).map((onsetAt, index) => (
      Math.abs((onsetAt - digitOnsets[index]) - config.timing.digitSoaMs)
    ));
    return {
      maxAbsDigitSoaDeviationMs: roundTiming(Math.max(0, ...digitSoaDeviations)),
      lastDigitToBeepDeviationMs: roundTiming((beepOnsetAt - digitOnsets.at(-1)) - config.timing.lastDigitToBeepMs),
    };
  }

  function roundTiming(value) {
    return Math.round(value * 10) / 10;
  }

  async function waitFromOnset(onsetAt, intervalMs) {
    const elapsedMs = performance.now() - onsetAt;
    await wait(Math.max(0, intervalMs - elapsedMs));
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, effectiveDelay(ms)));
  }

  function effectiveDelay(ms) {
    return testMode ? Math.min(ms, 2) : ms;
  }

  function downloadResults() {
    if (state.results.length === 0) return;
    const csv = buildCsv();
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const timestamp = (state.sessionCompletedAtUtc || new Date().toISOString()).replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    anchor.href = url;
    anchor.download = `digitspan_${config.mode}_${state.participantId}_${timestamp}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    state.downloaded = true;
    els.downloadStatus.textContent = t("status.csvSaved");
    els.downloadStatus.dataset.state = "ok";
    const completeMainRows = state.results.filter((row) => (
      row.phase === "main" && row.validTrial === 1 && row.trialStatus === "complete"
    ));
    if (config.mode === "forward" && state.sessionStatus === "completed" && completeMainRows.length === config.mainTrials.length) {
      configureNextModeLink(true);
    }
  }

  function configureNextModeLink(enabled) {
    const isForward = config?.mode === "forward";
    els.nextMode.hidden = !isForward;
    els.nextModeHelp.hidden = !isForward;
    if (!isForward) return;
    els.nextMode.classList.toggle("disabled", !enabled);
    els.nextMode.setAttribute("aria-disabled", enabled ? "false" : "true");
    if (!enabled) {
      els.nextMode.removeAttribute("href");
      els.nextModeHelp.textContent = t("common.nextBackwardHelp");
      return;
    }
    const nextParams = new URLSearchParams({
      release: config.releaseVersion,
      protocol: config.protocolVersion,
      task: config.nextMode.taskVersion,
      audio: activeAudio.audioSetVersion,
      timing: config.timingVersion,
      lang: uiLanguage,
      spoken: configuredSpokenDigitLanguage,
    });
    if (testMode) nextParams.set("test", "1");
    els.nextMode.href = `${config.nextMode.path}?${nextParams.toString()}`;
    els.nextModeHelp.textContent = t("status.nextEnabled");
  }

  function buildCsv() {
    const headers = [
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
    const rows = state.results.map((result) => ({
      release_version: config.releaseVersion,
      schema_version: config.schemaVersion,
      protocol_version: config.protocolVersion,
      task_version: config.taskVersion,
      practice_set_version: config.practiceSetVersion,
      trial_set_version: config.trialSetVersion,
      audio_set_version: activeAudio.audioSetVersion,
      timing_version: config.timingVersion,
      configured_initial_language: configuredInitialLanguage,
      ui_language: uiLanguage,
      spoken_digit_language: configuredSpokenDigitLanguage,
      participant_id: state.participantId,
      session_id: state.sessionId,
      session_started_at_utc: state.sessionStartedAtUtc,
      session_completed_at_utc: state.sessionCompletedAtUtc,
      session_status: state.sessionStatus,
      mode: config.mode,
      phase: result.phase,
      trial: result.trial,
      trial_status: result.trialStatus,
      valid_trial: result.validTrial,
      level: result.level,
      target: result.target,
      expected: result.expected,
      response: result.response,
      correct: result.correct === null ? "" : result.correct ? 1 : 0,
      rt_ms: result.rtMs,
      first_key_rt_ms: result.firstKeyRtMs,
      typing_duration_ms: result.typingDurationMs,
      response_deadline_ms: result.responseDeadlineMs,
      submit_method: result.submitMethod,
      timed_out: result.timedOut ? 1 : 0,
      trial_started_at_utc: result.trialStartedAtUtc,
      trial_opened_at_utc: result.trialOpenedAtUtc,
      submitted_at_utc: result.submittedAtUtc,
      pre_digits_ms: config.timing.preDigitsMs,
      digit_soa_ms: config.timing.digitSoaMs,
      last_digit_to_beep_ms: config.timing.lastDigitToBeepMs,
      response_unlock_after_beep_ms: config.timing.responseUnlockAfterBeepMs,
      practice_feedback_ms: config.timing.practiceFeedbackMs,
      main_next_trial_delay_ms: config.timing.mainNextTrialDelayMs,
      audio_check_gap_ms: config.timing.audioCheckGapMs,
      max_abs_digit_soa_deviation_ms: result.maxAbsDigitSoaDeviationMs,
      last_digit_to_beep_deviation_ms: result.lastDigitToBeepDeviationMs,
      session_focus_loss_count: state.focusLossCount,
      session_visibility_change_count: state.visibilityChangeCount,
      trial_focus_loss_count: result.trialFocusLossCount,
      trial_visibility_change_count: result.trialVisibilityChangeCount,
      preflight_audio_error_count: state.preflightAudioErrorCount,
      trial_audio_error_count: state.trialAudioErrorCount,
      technical_error_message: result.technicalErrorMessage,
      test_mode: testMode ? 1 : 0,
    }));
    return [headers, ...rows.map((row) => headers.map((header) => row[header]))]
      .map((row) => row.map(csvEscape).join(","))
      .join("\r\n");
  }

  function csvEscape(value) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function restartAll() {
    if (state.results.length > 0 && !state.downloaded) {
      const confirmed = window.confirm(t("confirm.unsaved"));
      if (!confirmed) return;
    }
    clearResponseDeadline();
    state.runToken += 1;
    state.screen = "intro";
    state.phase = null;
    state.running = false;
    state.currentIndex = -1;
    state.responseStart = null;
    state.firstKeyAt = null;
    state.trialOpenedAtUtc = null;
    state.participantId = "";
    state.sessionId = createSessionId();
    state.sessionStartedAtUtc = null;
    state.sessionCompletedAtUtc = null;
    state.sessionStatus = "not_started";
    state.audioReady = testMode;
    state.preflightAudioErrorCount = 0;
    state.trialAudioErrorCount = 0;
    state.focusLossCount = 0;
    state.visibilityChangeCount = 0;
    state.trialFocusLossStart = 0;
    state.trialVisibilityChangeStart = 0;
    state.trialStartedAtUtc = null;
    state.trialTimingQc = null;
    state.results = [];
    state.downloaded = false;
    state.languageLocked = false;
    uiLanguage = configuredInitialLanguage;
    updateLanguageQuery(uiLanguage);
    state.testAudioFailureMessage = null;
    els.participantId.value = "";
    els.audioCheck.disabled = false;
    els.audioConfirm.hidden = true;
    els.audioConfirm.disabled = true;
    setAudioStatus(testMode ? "status.testAudio" : "status.audioInitial", {}, testMode ? "ok" : "neutral");
    els.completionSummary.textContent = "";
    els.downloadResults.disabled = true;
    els.downloadStatus.textContent = "";
    els.fatalError.hidden = true;
    els.fatalError.textContent = "";
    els.practiceProgress.textContent = t("status.practiceProgress", { current: 0, total: config.practiceTrials.length });
    els.mainProgress.textContent = t("status.mainProgress", { current: 0, total: config.mainTrials.length });
    els.practiceStatus.textContent = t("status.ready");
    els.mainStatus.textContent = t("status.ready");
    configureNextModeLink(false);
    applyLanguage();
    updateLanguageControls();
    setPhaseStartButton("practice", true);
    setPhaseStartButton("main", true);
    resetResponseControls();
    showScreen("intro");
    updateIntroState();
    els.participantId.focus({ preventScroll: true });
  }

  function showScreen(name) {
    state.screen = name;
    screens.forEach((screenName) => {
      const element = els[`screen${capitalize(screenName)}`];
      const visible = screenName === name;
      element.hidden = !visible;
      element.setAttribute("aria-hidden", visible ? "false" : "true");
    });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function updateStatus(text, phase) {
    if (phase === "practice") els.practiceStatus.textContent = text;
    else if (phase === "main") els.mainStatus.textContent = text;
  }

  function trackVisibilityChange() {
    if (sessionIsActive() && document.hidden) state.visibilityChangeCount += 1;
  }

  function trackFocusLoss() {
    if (sessionIsActive()) state.focusLossCount += 1;
  }

  function sessionIsActive() {
    return state.sessionStartedAtUtc !== null && state.sessionCompletedAtUtc === null;
  }

  function warnBeforeUnload(event) {
    if (sessionIsActive() || (state.results.length > 0 && !state.downloaded)) {
      event.preventDefault();
      event.returnValue = "";
    }
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      updateStatus(t("error.fullscreen", { message: error.message }), state.phase);
    }
  }

  function updateFullscreenButton() {
    if (!els.fullscreenToggle) return;
    els.fullscreenToggle.textContent = t(document.fullscreenElement ? "common.fullscreenExit" : "common.fullscreenEnter");
  }

  function handleGlobalKeydown(event) {
    if (event.key.toLowerCase() !== "f" || event.metaKey || event.ctrlKey || event.altKey) return;
    if (["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
    event.preventDefault();
    toggleFullscreen();
  }

  function exposeTestHooks() {
    window.render_game_to_text = () => JSON.stringify({
      coordinate_system: "DOM application; no spatial playfield",
      mode: config.mode,
      screen: state.screen,
      phase: state.phase,
      running: state.running,
      trial: state.currentIndex + 1,
      total_trials: state.phase ? currentTrials().length : 0,
      input_enabled: state.phase ? !currentInput().disabled : false,
      results_count: state.results.length,
      audio_ready: state.audioReady,
      session_status: state.sessionStatus,
      preflight_audio_error_count: state.preflightAudioErrorCount,
      trial_audio_error_count: state.trialAudioErrorCount,
      timing_qc: state.trialTimingQc,
      downloaded: state.downloaded,
      test_mode: testMode,
      release_version: config.releaseVersion,
      configured_initial_language: configuredInitialLanguage,
      ui_language: uiLanguage,
      spoken_digit_language: configuredSpokenDigitLanguage,
      audio_set_version: activeAudio.audioSetVersion,
      language_locked: state.languageLocked,
      next_mode_enabled: config.mode === "forward" && els.nextMode.getAttribute("aria-disabled") === "false",
      expected: testMode && state.running && state.currentIndex >= 0
        ? expectedFor(currentTrials()[state.currentIndex])
        : undefined,
    });
    window.advanceTime = (ms) => wait(Math.max(0, Number(ms) || 0));
    if (testMode) {
      window.__digitSpanTest = {
        state: () => JSON.parse(window.render_game_to_text()),
        expected: () => state.running && state.currentIndex >= 0 ? expectedFor(currentTrials()[state.currentIndex]) : null,
        csv: buildCsv,
        timeout: () => handleResponseTimeout(state.runToken),
        failNextAudio: (message = t("error.testAudio")) => {
          state.testAudioFailureMessage = String(message);
        },
      };
    }
  }

  function expectedFor(target) {
    return config.mode === "backward" ? [...target].reverse().join("") : target;
  }

  function showFatalError(error) {
    console.error(error);
    if (!els.fatalError) {
      window.alert(error.message);
      return;
    }
    els.fatalError.hidden = false;
    els.fatalError.textContent = t("error.prefix", { message: error.message });
    if (els.appShell) els.appShell.setAttribute("aria-busy", "false");
  }

  function createSessionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `ds-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function isLoopbackHost(hostname) {
    return hostname === "localhost"
      || hostname === "127.0.0.1"
      || hostname === "::1"
      || hostname === "[::1]";
  }

  function toCamel(value) {
    return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  function capitalize(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
})();
