(() => {
  "use strict";

  const versions = Object.freeze({
    release: "digitspan-pages-1.1.0",
    protocol: "digitspan-research-3.2.0",
    forward: "digitspan-forward-web-3.2.0",
    backward: "digitspan-backward-web-3.2.0",
    audioSets: Object.freeze({
      ja: "ja-digits-aligned-wav-v3",
      en: "en-us-digits-aligned-wav-v1",
    }),
    timing: "fixed-soa-deadline-v1",
  });

  const messages = {
    ja: {
      "common.brand": "Digit Span",
      "common.spokenAudio": "読み上げ音声は研究者が指定した{language}です。表示言語を切り替えても音声は変わりません。",
      "common.audioLanguage.ja": "日本語",
      "common.audioLanguage.en": "英語",
      "participant.documentTitle": "Digit Span 参加者ページ",
      "participant.eyebrow": "参加者用",
      "participant.title": "Digit Span",
      "participant.lead": "音声で提示される数字を記憶し、順唱、続いて逆唱に回答します。",
      "participant.beforeTitle": "開始前の確認",
      "participant.stepConsent": "研究担当者から研究説明を受け、所定の同意手続きを完了してください。",
      "participant.stepId": "研究担当者から発行された匿名ID（PVLT-＋12桁）を準備してください。氏名や学籍番号は入力しません。",
      "participant.stepAudio": "静かな場所でヘッドホンまたは固定したスピーカーを使用し、通知を閉じてください。",
      "participant.stepOrder": "順唱のCSVを保存してから逆唱へ進み、各CSVを研究担当者の指示どおりに提出してください。",
      "participant.confirm": "研究説明・同意手続きを完了し、匿名IDを準備しました。",
      "participant.start": "順唱を開始",
      "participant.startHelp": "確認欄を選ぶと開始できます。",
      "participant.ready": "準備ができました。順唱を開始できます。",
      "participant.privacyTitle": "データと公開配信について",
      "participant.privacy": "課題アプリは回答や参加者IDを送信せず、結果CSVをこの端末へ保存します。GitHub Pagesなどの配信事業者には、ページ取得時の通常の通信情報が記録される場合があります。",
      "participant.noIdUrl": "参加者IDをURL、ブックマーク、画面共有、公開Issueへ記載しないでください。",
      "participant.versionSummary": "固定バージョンを確認",
      "participant.researcherLink": "研究者用ページ",
      "researcher.documentTitle": "Digit Span 研究者用ページ",
      "researcher.eyebrow": "研究者用・公開ユーティリティ",
      "researcher.title": "参加者リンクの作成",
      "researcher.lead": "参加者画面の開始言語と読み上げ音声を個別に選び、確定済みのプロトコル・課題・タイミングを固定したリンクを作成します。",
      "researcher.warningTitle": "このページは認証された管理画面ではありません",
      "researcher.warning": "GitHub Pages上では誰でも閲覧できます。秘密、パスワード、参加者ID、回答、個別の研究情報を入力・掲載しないでください。リンクは署名付きでも一回限りでもありません。",
      "researcher.linkTitle": "固定参加者リンク",
      "researcher.startLanguage": "参加者画面の開始言語",
      "researcher.spokenLanguage": "数字の読み上げ音声",
      "researcher.spokenHelp": "音声条件は参加者側で変更できず、順唱から逆唱にも引き継がれます。",
      "researcher.audioVersion": "選択中の音声セット",
      "researcher.linkLabel": "参加者用URL（匿名IDは含みません）",
      "researcher.copy": "URLをコピー",
      "researcher.open": "参加者画面を別タブで開く",
      "researcher.copied": "URLをコピーしました。",
      "researcher.copyFailed": "自動コピーできませんでした。URL欄を選択して手動でコピーしてください。",
      "researcher.idReminder": "匿名IDはリンクへ追加せず、課題画面で本人に入力してもらいます。",
      "researcher.lockedTitle": "変更できない研究仕様",
      "researcher.lockedLead": "音声言語以外の試行数、刺激列、提示間隔、回答期限、採点、順唱→逆唱の順序は、このページから変更できません。",
      "researcher.operationsTitle": "実施時の責任範囲",
      "researcher.operationConsent": "研究説明・同意・撤回・連絡先は、承認済みの研究手続きで別途管理します。",
      "researcher.operationCsv": "順唱と逆唱のCSVをそれぞれ保存し、承認済みの制限領域へ移動します。Pagesは結果を受信しません。",
      "researcher.operationExposure": "公開静的サイトでは刺激列と音声を隠せないため、事前曝露は運用上管理します。",
      "researcher.operationAudioRights": "2026-07-20に、固定音声 ja-digits-aligned-wav-v3、en-us-digits-aligned-wav-v1、beep.wav の公開が承認されました。公開時はタグ内容を照合し、手動確認ゲートを実行します。このプロジェクト承認は第三者の法的保証ではありません。"
    },
    en: {
      "common.brand": "Digit Span",
      "common.spokenAudio": "The researcher selected {language} for the spoken digits. Changing the interface language does not change the audio.",
      "common.audioLanguage.ja": "Japanese",
      "common.audioLanguage.en": "English",
      "participant.documentTitle": "Digit Span participant page",
      "participant.eyebrow": "Participant page",
      "participant.title": "Digit Span",
      "participant.lead": "Remember spoken digit sequences and complete forward span followed by backward span.",
      "participant.beforeTitle": "Before you begin",
      "participant.stepConsent": "Receive the study information from the researcher and complete the approved consent procedure.",
      "participant.stepId": "Have the anonymous ID issued by the researcher ready (PVLT- plus 12 characters). Do not enter a name or student number.",
      "participant.stepAudio": "Use headphones or a fixed speaker in a quiet place and close notifications.",
      "participant.stepOrder": "Save the forward CSV before continuing to backward span, then return both files as instructed by the researcher.",
      "participant.confirm": "I completed the study-information and consent procedure and have my anonymous ID ready.",
      "participant.start": "Start forward span",
      "participant.startHelp": "Select the confirmation box to continue.",
      "participant.ready": "Ready. You may start forward span.",
      "participant.privacyTitle": "Data and public hosting",
      "participant.privacy": "The task app does not transmit responses or the participant ID; it saves a results CSV on this device. GitHub Pages or another hosting provider may record ordinary request metadata when pages are retrieved.",
      "participant.noIdUrl": "Never put a participant ID in a URL, bookmark, screen share, or public issue.",
      "participant.versionSummary": "View locked versions",
      "participant.researcherLink": "Researcher page",
      "researcher.documentTitle": "Digit Span researcher page",
      "researcher.eyebrow": "Public researcher utility",
      "researcher.title": "Create a participant link",
      "researcher.lead": "Choose the participant's starting interface language and spoken-digit language independently. The approved protocol, tasks, and timing are fixed in the link.",
      "researcher.warningTitle": "This is not an authenticated administration page",
      "researcher.warning": "Anyone can view this page on GitHub Pages. Do not enter or publish secrets, passwords, participant IDs, responses, or confidential study information. Links are neither signed nor single-use.",
      "researcher.linkTitle": "Version-locked participant link",
      "researcher.startLanguage": "Participant's starting interface language",
      "researcher.spokenLanguage": "Spoken-digit language",
      "researcher.spokenHelp": "The participant cannot change the audio condition, and it carries from forward to backward span.",
      "researcher.audioVersion": "Selected audio set",
      "researcher.linkLabel": "Participant URL (contains no anonymous ID)",
      "researcher.copy": "Copy URL",
      "researcher.open": "Open participant page in a new tab",
      "researcher.copied": "URL copied.",
      "researcher.copyFailed": "Automatic copy failed. Select the URL field and copy it manually.",
      "researcher.idReminder": "Do not add the anonymous ID to the link; the participant enters it inside the task.",
      "researcher.lockedTitle": "Locked research specification",
      "researcher.lockedLead": "Apart from the audio language, trial counts, sequences, presentation timing, deadlines, scoring, and forward-to-backward order cannot be changed here.",
      "researcher.operationsTitle": "Research operations remain separate",
      "researcher.operationConsent": "Manage study information, consent, withdrawal, and contact details through the approved study procedure.",
      "researcher.operationCsv": "Save forward and backward CSVs separately and move them to the approved restricted area. Pages does not receive results.",
      "researcher.operationExposure": "A public static site cannot hide sequences or audio; manage advance exposure procedurally.",
      "researcher.operationAudioRights": "Publication of the frozen ja-digits-aligned-wav-v3, en-us-digits-aligned-wav-v1, and beep.wav assets was approved on 2026-07-20. Match the tag to this scope and use the manual confirmation gate for deployment. Project approval is not a third-party legal warranty."
    }
  };

  const params = new URLSearchParams(window.location.search);
  let language = ["ja", "en"].includes(params.get("lang")) ? params.get("lang") : "ja";
  const configuredSpokenLanguage = ["ja", "en"].includes(params.get("spoken")) ? params.get("spoken") : "ja";
  const script = [...document.scripts].find((item) => /(?:^|\/)assets\/site\.js(?:$|\?)/.test(item.src));
  const siteBase = new URL("../", script ? script.src : document.baseURI);

  function t(key, values = {}) {
    const template = messages[language][key] ?? messages.ja[key] ?? key;
    return template.replace(/\{([A-Za-z0-9_.]+)\}/g, (match, name) => (
      Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
    ));
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-site-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.siteI18n);
    });
    document.querySelectorAll("[data-site-language]").forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.siteLanguage === language ? "true" : "false");
    });
    const spokenAudio = document.getElementById("selected-spoken-audio");
    if (spokenAudio) {
      spokenAudio.textContent = t("common.spokenAudio", {
        language: t(`common.audioLanguage.${configuredSpokenLanguage}`),
      });
    }
    updateParticipantState();
  }

  function setLanguage(nextLanguage) {
    if (!["ja", "en"].includes(nextLanguage)) return;
    language = nextLanguage;
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("lang", language);
    window.history.replaceState(null, "", `${window.location.pathname}?${nextParams.toString()}`);
    applyLanguage();
  }

  function taskUrl(mode, initialLanguage, spokenLanguage) {
    const task = mode === "forward" ? versions.forward : versions.backward;
    const audio = versions.audioSets[spokenLanguage];
    const query = new URLSearchParams({
      release: versions.release,
      protocol: versions.protocol,
      task,
      audio,
      timing: versions.timing,
      lang: initialLanguage,
      spoken: spokenLanguage,
    });
    return `${new URL(`web-${mode}/`, siteBase).href}?${query.toString()}`;
  }

  function updateVersions() {
    const spokenSelect = document.getElementById("spoken-language");
    const selectedSpokenLanguage = ["ja", "en"].includes(spokenSelect?.value)
      ? spokenSelect.value
      : configuredSpokenLanguage;
    document.querySelectorAll("[data-site-version]").forEach((element) => {
      element.textContent = element.dataset.siteVersion === "audio"
        ? versions.audioSets[selectedSpokenLanguage]
        : versions[element.dataset.siteVersion] || "";
    });
  }

  function updateParticipantState() {
    const checkbox = document.getElementById("readiness-confirm");
    const start = document.getElementById("start-forward");
    const help = document.getElementById("start-help");
    if (!checkbox || !start || !help) return;
    const ready = checkbox.checked;
    start.href = taskUrl("forward", language, configuredSpokenLanguage);
    start.classList.toggle("is-disabled", !ready);
    start.setAttribute("aria-disabled", ready ? "false" : "true");
    help.textContent = t(ready ? "participant.ready" : "participant.startHelp");
  }

  function updateResearcherLink() {
    const select = document.getElementById("start-language");
    const spokenSelect = document.getElementById("spoken-language");
    const field = document.getElementById("participant-link");
    const open = document.getElementById("open-participant-link");
    if (!select || !spokenSelect || !field || !open) return;
    const url = taskUrl("forward", select.value, spokenSelect.value);
    field.value = url;
    open.href = url;
    updateVersions();
  }

  async function copyResearcherLink() {
    const field = document.getElementById("participant-link");
    const status = document.getElementById("copy-status");
    if (!field || !status) return;
    try {
      await navigator.clipboard.writeText(field.value);
      status.textContent = t("researcher.copied");
      status.dataset.state = "ok";
    } catch {
      field.focus();
      field.select();
      status.textContent = t("researcher.copyFailed");
      status.dataset.state = "error";
    }
  }

  document.querySelectorAll("[data-site-language]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.siteLanguage));
  });
  document.getElementById("readiness-confirm")?.addEventListener("change", updateParticipantState);
  document.getElementById("start-forward")?.addEventListener("click", (event) => {
    if (event.currentTarget.getAttribute("aria-disabled") === "true") event.preventDefault();
  });
  document.getElementById("start-language")?.addEventListener("change", updateResearcherLink);
  document.getElementById("spoken-language")?.addEventListener("change", updateResearcherLink);
  document.getElementById("copy-link")?.addEventListener("click", copyResearcherLink);

  updateVersions();
  updateResearcherLink();
  applyLanguage();
})();
