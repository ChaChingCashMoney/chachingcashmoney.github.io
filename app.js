(() => {
  // ====== VERSION (bump this when you ship changes) ======
  const APP_VERSION = "2.1.7";
  const RELEASE_NOTES = {
    "2.1.7": [
      "Added responsible-play disclaimers to Learn Strategy and Quick Help.",
      "Clarified that the app does not modify game odds and outcomes remain subject to house edge."
    ],
    "2.1.6": [
      "Fixed Clear selection button in the Play screen.",
      "Enhanced mobile layout to reduce accidental taps."
    ],
    "2.1.5": [
      "Refined Learn Strategy section for improved clarity and structured tone.",
      "Updated Quick Help panel for clearer live-session guidance.",
      "Improved overall in-app documentation and messaging consistency."
    ],
    "2.1.4": [
      "Refined streak phase reset behavior for smoother transition back to NORMAL.",
      "Improved bet stability following streak loss to reduce volatility spikes.",
      "Minor internal consistency improvements."
    ],
    "2.1.3": [
      "Optimized undo system to prevent performance slowdowns during extended sessions.",
      "Reduced memory usage by eliminating full log cloning in undo snapshots.",
      "Improved submit performance and responsiveness.",
      "General performance and stability improvements."
    ],
    "2.1.2": [
      "Improved submit handling to prevent rare freeze conditions during extended sessions.",
      "Refined cap-to-split trigger logic for consistent activation on true cap losses.",
      "Hardened state transitions across NORMAL, STREAK, and SPLIT phases.",
      "Improved undo stack behavior for greater session stability.",
      "General engine stability improvements and internal cleanup."
    ],
    "2.1.1": [
      "Converted entire betting engine to a strict whole-dollar system.",
      "Removed all cent-based calculations to eliminate decimal drift.",
      "Standardized integer-safe calculations across ladder, streak, split, and bankroll logic.",
      "Updated Banker commission handling to use correct whole-dollar rounding.",
      "Improved consistency of displayed and logged values."
    ],
    "2.1.0": [
      "Simplified Setup flow to reduce cognitive load and improve onboarding.",
      "Removed redundant Setup preview panel for cleaner configuration experience.",
      "Refined toggle system: all Setup checkboxes converted to iOS-style On/Off switches.",
      "Standardized info ('i') button alignment across Setup options.",
      "Improved desktop dropdown readability (fixed white-on-white option issue).",
      "Enhanced mobile layout: top bar now scrolls naturally with page.",
      "Improved iPhone safe-area handling (notch compatibility).",
      "Daily Session Discipline modal upgraded: now enforces acknowledgment after viewing Strategy.",
      "Refined Discipline targets with Tier 1 ($5 base) and Tier 2 Exclusive ($10 base) clarity.",
      "Further visual polish to Next Side and Next Bet display styling.",
      "General UI cleanup and structural simplification."
    ],
    "2.0.2": [
      "Updated Play tab messaging shown before a game begins."
    ],
    "2.0.1": [
      "Added full in-app Changelog viewer (Help → View Changelog).",
      "Changelog automatically renders from RELEASE_NOTES in app.js.",
      "Current version visually marked within history.",
      "Improved transparency and release documentation."
    ],
    "2.0.0": [
      "Major UI overhaul: new Classic Casino felt theme.",
      "Split app into Play / Setup / Log tab views.",
      "Added sticky Game HUD with live bankroll + PnL display.",
      "Removed footer rules wall; added dedicated Help modal.",
      "Improved mobile usability and layout clarity.",
      "Log view redesigned with mobile-friendly card layout.",
      "Outcome buttons now color-coded (Red/Black/Green, Player/Banker/Tie).",
      "General UI polish and structural cleanup."
    ],
    "1.0.4": [
      "Added 'Learn Strategy' button in top bar.",
      "Added full APP Strategy modal with detailed rule reference.",
      "Added copy-to-clipboard for strategy text.",
      "UI stability improvements."
    ],
    "1.0.3": [
      "Fixed localStorage quota crash (undo history no longer persisted).",
      "Added log size safeguard to prevent storage overflow.",
      "Improved overall session stability.",
      "UI polish and stability improvements."
    ],
    "1.0.2": [
      "Update banner pipeline verified (Refresh applies the new version).",
      "Improved offline update reliability with cache bump workflow."
    ],
    "1.0.1": [
      "Version badge added.",
      "Install button enabled on supported devices."
    ],
    "1.0.0": [
      "Initial PWA release: installable + offline support.",
      "APP Tracker core functionality (log, CSV export, bankroll manager)."
    ]
  };

  // Expose release data for UI (changelog modal)
  window.APP_VERSION = APP_VERSION;
  window.APP_RELEASE_NOTES = RELEASE_NOTES;

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function showWhatsNew(version){
    const backdrop = document.getElementById("whatsNewBackdrop");
    const title = document.getElementById("whatsNewTitle");
    const body = document.getElementById("whatsNewBody");
    const notes = RELEASE_NOTES[version] || ["Bug fixes and improvements."];

    if (!backdrop || !title || !body) return;

    title.textContent = `What’s New in v${version}`;
    body.innerHTML = `
      <ul style="margin:0; padding-left:18px;">
        ${notes.map(n => `<li style="margin:6px 0;">${escapeHtml(n)}</li>`).join("")}
      </ul>
    `;

    backdrop.style.display = "flex";
  }

  function closeWhatsNew(){
    const backdrop = document.getElementById("whatsNewBackdrop");
    if (backdrop) backdrop.style.display = "none";
    localStorage.setItem("last_seen_version", APP_VERSION);
  }

  // Wire close actions
  (() => {
    const closeBtn = document.getElementById("whatsNewCloseBtn");
    const backdrop = document.getElementById("whatsNewBackdrop");

    if (closeBtn) closeBtn.addEventListener("click", closeWhatsNew);
    if (backdrop) backdrop.addEventListener("click", (e) => {
      if (e.target && e.target.id === "whatsNewBackdrop") closeWhatsNew();
    });

    // Show once per version...
    const lastSeen = localStorage.getItem("last_seen_version");
    if (lastSeen !== APP_VERSION) {
      showWhatsNew(APP_VERSION);
    }
  })();

  // Put version in UI
  const vb = document.getElementById("versionBadge");
  const vbf = document.getElementById("versionBadgeFooter");
  if (vb) vb.textContent = APP_VERSION;
  if (vbf) vbf.textContent = APP_VERSION;

  // ====== INSTALL BUTTON (Chrome/Android) ======
  const installBtn = document.getElementById("installBtn");
  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = "inline-block";
  });

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch {}
      deferredPrompt = null;
      installBtn.style.display = "none";
    });
  }

  // ====== AUTO-UPDATE BANNER (for new deployments) ======
  const updateBar = document.getElementById("updateBar");
  const refreshBtn = document.getElementById("refreshBtn");
  const dismissUpdateBtn = document.getElementById("dismissUpdateBtn");

  let swReg = null;
  const showUpdateBar = () => { if (updateBar) updateBar.style.display = "flex"; };
  const hideUpdateBar = () => { if (updateBar) updateBar.style.display = "none"; };

  if (dismissUpdateBtn) dismissUpdateBtn.addEventListener("click", hideUpdateBar);

  // ====== SERVICE WORKER REGISTRATION ======
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        swReg = await navigator.serviceWorker.register("/service-worker.js");

        // If there is already a waiting worker, show the banner right away
        if (swReg.waiting) showUpdateBar();

        // If a new SW is found, watch it and show banner when it's installed
        swReg.addEventListener("updatefound", () => {
          const newWorker = swReg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // When installed: if there is an existing controller, it's an update (not first install)
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              showUpdateBar();
            }
          });
        });

        // When user clicks Refresh, tell waiting SW to activate
        if (refreshBtn) {
          refreshBtn.addEventListener("click", () => {
            if (!swReg) return;
            if (swReg.waiting) {
              swReg.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          });
        }

        // When the new SW takes control, reload to get the new assets
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

      } catch (e) {
        console.warn("Service worker registration failed:", e);
      }
    });
  }

  // ====== YOUR APP LOGIC (moved from inline) ======
  const STORAGE_KEY = "app_tracker_v3";

  const BANKER_COMMISSION = 0.05;
  const ANCHOR_STREAK_A = 15;
  const ANCHOR_SPLITCLEAR_A = 15;

  const tips = {
    autoSeries: {
      title: "Auto Tier",
      body: `
        <div><b>ON:</b> If a Tier 1 game ends at SL, the <b>next game</b> becomes <b>one Tier 2 game only</b>, then returns to Tier 1.</div>
        <div class="muted" style="margin-top:8px;">Manual tier selection still works if you turn this OFF.</div>`
    },
    carryMode: {
      title: "Carry Mode",
      body: `
        <div><b>OFF (default):</b> Every new game starts in your selected Start Mode (SAME/OPP).</div>
        <div style="margin-top:8px;"><b>ON:</b> The next game starts in the same mode you ended the previous game in.</div>`
    },
    bankroll: {
      title: "Bankroll Manager",
      body: `
        <div>Enter Starting Bankroll and press <b>Apply</b>.</div>
        <div style="margin-top:8px;">When a game ends (TP or SL), bankroll updates by that game’s final PnL.</div>
        <div class="muted" style="margin-top:8px;">Bankroll values are not included in CSV export (by design).</div>`
    },
    advancedPlay: {
      title: "Advanced Play Stats",
      body: `
        <div>When enabled, the Play screen shows additional live data:</div>
        <ul style="margin:8px 0 0; padding-left:18px;">
          <li>Mode Losses</li>
          <li>Consecutive Wins (SAME)</li>
          <li>Ladder Bet</li>
          <li>Split Ledger / Phase / Next Split Bet</li>
        </ul>
        <div class="muted" style="margin-top:8px;">
          These are hidden by default for a cleaner live-table view.
        </div>`
    },
    series: {
      title: "Tier Structure",
      body: `
        <div><b>Tier 1:</b> $5 base unit</div>
        <div class="muted" style="margin-top:6px;">
          Target: +$40 • Stop: -$100 • Cap: $30
        </div>

        <div style="margin-top:12px;"><b>Tier 2:</b> $10 base unit</div>
        <div class="muted" style="margin-top:6px;">
          Target: +$80 • Stop: -$200 • Cap: $60
        </div>

        <div style="margin-top:12px;">
          Auto Tier: If Tier 1 hits SL, exactly one Tier 2 game is triggered.
        </div>
      `
    },
  };

  function seriesParams(series){
    if(series === "B"){
      return {
        base:10, tp:80, sl:-200, incL:6, decW:4, min:10, cap:60,
        anchorStreak:ANCHOR_STREAK_A*2, anchorSplit:ANCHOR_SPLITCLEAR_A*2,
        maxSplitBet:180, splitLedger:120
      };
    }
    return {
      base:5, tp:40, sl:-100, incL:3, decW:2, min:5, cap:30,
      anchorStreak:ANCHOR_STREAK_A, anchorSplit:ANCHOR_SPLITCLEAR_A,
      maxSplitBet:90, splitLedger:60
    };
  }

  const deepCopy = (o)=>JSON.parse(JSON.stringify(o));
  const $ = (id)=>document.getElementById(id);

  // Whole-dollar system helper (force integer state everywhere)
  function toInt(n){
    return Math.round(Number(n) || 0);
  }

  const defaultState = () => ({
    sessionId: Date.now(),
    log: [],
    undoStack: [],

    gameType: "roulette",
    series: "A",
    startMode: "SAME",
    autoSeries: true,
    carryMode: false,
    pendingOneB: false,

    bankrollOn: false,
    bankrollStart: null,
    bankrollCurrent: null,

    inGame: false,
    observed: false,
    gameNo: 0,
    lastTrue: null,
    mode: "SAME",
    modeLosses: 0,
    consecWinsSame: 0,

    phase: "NORMAL",
    ladderBet: 5,
    streakBet: null,
    tpHitDuringStreak: false,

    ledger: 0,
    splitPhase: null,
    nextSplitBet: null,
    half1: null,
    half2: null,

    gamePnL: 0,
    pendingOutcome: null,

    endModalOpen: false,
    lastEndedBy: null,
    lastEndedPnL: null
  });

  let S = load() || defaultState();
  S.undoStack = []; // never restore undo history from storage

  // Sanitize legacy decimal values (whole-dollar system)
  S.gamePnL = toInt(S.gamePnL || 0);
  if (typeof S.bankrollCurrent === "number") S.bankrollCurrent = toInt(S.bankrollCurrent);
  if (typeof S.bankrollStart === "number") S.bankrollStart = toInt(S.bankrollStart);
  if (typeof S.ledger === "number") S.ledger = toInt(S.ledger);
  if (typeof S.nextSplitBet === "number") S.nextSplitBet = toInt(S.nextSplitBet);
  if (typeof S.streakBet === "number") S.streakBet = toInt(S.streakBet);

  function save(){
    const MAX_LOG_TO_STORE = 5000;

    const trimmedLog = (S.log && S.log.length > MAX_LOG_TO_STORE)
      ? S.log.slice(-MAX_LOG_TO_STORE)
      : S.log;

    const toStore = {
      ...S,
      log: trimmedLog,
      undoStack: [] // never persist undo history
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  }

  function load(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); }
    catch(e){ return null; }
  }

function pushUndo(){
  // Store a snapshot WITHOUT the growing log to prevent freezes.
  // We only need log length because we only append to the log.
  const snap = deepCopy({
    ...S,
    log: null,        // exclude log from snapshot (biggest performance win)
    undoStack: []     // never snapshot undo history
  });

  S.undoStack.push({ snap, logLen: (S.log ? S.log.length : 0) });
  if(S.undoStack.length > 300) S.undoStack.shift();
}

function undo(){
  const item = S.undoStack.pop();
  if(!item) return;

  const { snap, logLen } = item;

  // Keep current log reference, then truncate it back to what it was.
  const currentLog = S.log || [];
  S = snap;

  S.log = currentLog;
  S.log.length = logLen;

  // Always keep undoStack as an in-memory-only stack
  S.undoStack = S.undoStack || [];

  save(); render();
}

  function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }
  function currentParams(){ return seriesParams(S.series); }

  function isNeutral(outcome){
    return (S.gameType === "roulette") ? (outcome === "G") : (outcome === "T");
  }

  function isTrue(outcome){
    return (S.gameType === "roulette")
      ? (outcome === "R" || outcome === "B")
      : (outcome === "P" || outcome === "B");
  }

  function oppositeOf(out){
    return (S.gameType === "roulette") ? (out === "R" ? "B" : "R") : (out === "P" ? "B" : "P");
  }

  function computePick(){
    if(!S.lastTrue) return null;
    return (S.mode === "SAME") ? S.lastTrue : oppositeOf(S.lastTrue);
  }

  function formatOutcome(x){
    if(!x) return "—";
    if(S.gameType === "roulette"){
      return x === "R" ? "RED" : x === "B" ? "BLACK" : "GREEN";
    }
    return x === "P" ? "PLAYER" : x === "B" ? "BANKER" : "TIE";
  }

  function settleProfit(bet, won, pick){
    // Whole-dollar system only

    if (S.gameType === "roulette") {
      return won ? bet : -bet;
    }

    if (!won) {
      return -bet;
    }

    // Baccarat Banker commission (5%) rounded UP to whole dollars
    if (pick === "B") {
      const commission = Math.ceil(bet * BANKER_COMMISSION);
      return bet - commission;
    }

    return bet;
  }

  function logRow({ outcome, pick, bet, result, delta, note }){
    const idx = S.log.length + 1;
    S.log.push({
      idx,
      ts: new Date().toISOString(),
      gameNo: S.gameNo,
      series: S.series,
      gameType: S.gameType,
      outcome, pick, bet, result, delta,
      gamePnL: S.gamePnL,
      mode: S.mode,
      modeLosses: S.modeLosses,
      phase: S.phase,
      ledger: S.ledger,
      splitPhase: S.splitPhase,
      nextSplitBet: S.nextSplitBet,
      ladderBet: S.ladderBet,
      consecWinsSame: S.consecWinsSame,
      note: note || ""
    });
  }

  function showTip(which){
    $("tipTitle").textContent = tips[which]?.title || "Info";
    $("tipBody").innerHTML = tips[which]?.body || "";
    $("tipBackdrop").style.display = "flex";
  }

  function closeTip(){
    $("tipBackdrop").style.display = "none";
  }

  function showEndModal(endedBy, finalPnL){
    S.endModalOpen = true;
    S.lastEndedBy = endedBy;
    S.lastEndedPnL = finalPnL;

    const p = currentParams();
    let bankrollLine = `<div class="muted" style="margin-top:8px;">Bankroll manager is OFF.</div>`;

    if(S.bankrollOn && typeof S.bankrollCurrent === "number"){
      const net = toInt(S.bankrollCurrent - (S.bankrollStart || 0));
      bankrollLine = `<div style="margin-top:8px;"><b>Bankroll:</b> ${toInt(S.bankrollCurrent)} <span class="muted">(session net ${net})</span></div>`;
    }

    $("endTitle").textContent = `GAME ENDED — ${endedBy}`;
    $("endBody").innerHTML = `
      <div><b>Series:</b> ${S.series} &nbsp; <span class="muted">(TP/SL ${p.tp} / ${p.sl})</span></div>
      <div style="margin-top:8px;"><b>Final Game P&L:</b> ${toInt(finalPnL)}</div>
      ${bankrollLine}
    `;
    $("endBackdrop").style.display = "flex";
    save(); render();
  }

  function closeEndModal(){
    S.endModalOpen = false;
    $("endBackdrop").style.display = "none";
    save(); render();
  }

  function maybeAutoSeriesAfterGame(endedBy){
    if(!S.autoSeries) return;
    if(S.series === "A" && endedBy === "SL"){
      S.pendingOneB = true;
    } else if(S.series === "B"){
      S.series = "A";
      S.pendingOneB = false;
    }
  }

  function startNewGame(){
    pushUndo();
    if(S.autoSeries && S.pendingOneB) S.series = "B";
    const p = currentParams();

    S.inGame = true;
    S.observed = false;
    S.gameNo += 1;

    S.lastTrue = null;

    if(S.carryMode && S.gameNo > 1){
      S.mode = S.mode || S.startMode;
    } else {
      S.mode = S.startMode;
    }
    S.modeLosses = 0;
    S.consecWinsSame = 0;

    S.phase = "NORMAL";
    S.ladderBet = toInt(p.min); // integer
    S.streakBet = null;
    S.tpHitDuringStreak = false;

    S.ledger = 0;
    S.splitPhase = null;
    S.nextSplitBet = null;
    S.half1 = null;
    S.half2 = null;

    S.gamePnL = 0;
    S.pendingOutcome = null;

    save(); render();
  }

  function endGame(endedBy){
    if(S.bankrollOn && typeof S.bankrollCurrent === "number"){
      S.bankrollCurrent = toInt(S.bankrollCurrent + S.gamePnL);
    }
    S.inGame = false;
    S.observed = false;
    maybeAutoSeriesAfterGame(endedBy);
    S.pendingOutcome = null;
    showEndModal(endedBy, S.gamePnL);
  }

  function applyModeWin(){ S.modeLosses = 0; }

  function applyModeLoss(neutralLoss){
    if(neutralLoss) return;
    S.modeLosses += 1;
    if(S.mode === "SAME"){
      if(S.modeLosses >= 2){ S.mode = "OPP"; S.modeLosses = 0; S.consecWinsSame = 0; }
    } else {
      if(S.modeLosses >= 1){ S.mode = "SAME"; S.modeLosses = 0; S.consecWinsSame = 0; }
    }
  }

  function enterStreak(){
    const p = currentParams();
    S.phase = "STREAK";
    S.streakBet = toInt(toInt(S.ladderBet) + p.base);
    S.tpHitDuringStreak = false;
    S.consecWinsSame = 0;
  }

  function exitStreakAfterLoss(){
    const p = currentParams();
    S.phase = "NORMAL";
    S.streakBet = null;
    S.ladderBet = toInt(p.anchorStreak);
    S.consecWinsSame = 0;
  }

  function enterSplit(){
    const p = currentParams();
    S.phase = "SPLIT";
    S.ledger = toInt(p.splitLedger);
    S.splitPhase = "PROBE";
    S.nextSplitBet = toInt(p.min);
    S.half1 = null; S.half2 = null;
    S.consecWinsSame = 0;
    S.streakBet = null;
    S.tpHitDuringStreak = false;
  }

  function computeSplitHalves(){
    const p = currentParams();

    // Ensure ledger is always whole dollars
    S.ledger = toInt(S.ledger);

    let h1 = Math.ceil(S.ledger / 2);
    let h2 = S.ledger - h1;

    if(h1 > p.maxSplitBet){
      h1 = p.maxSplitBet;
      h2 = S.ledger - h1;
    }

    // Ensure halves are integers
    S.half1 = toInt(h1);
    S.half2 = toInt(h2);
  }

  function clearSplit(){
    const p = currentParams();
    S.phase = "NORMAL";
    S.ledger = 0;
    S.splitPhase = null;
    S.nextSplitBet = null;
    S.half1 = null; S.half2 = null;
    S.ladderBet = toInt(p.anchorSplit);
    S.consecWinsSame = 0;
    S.streakBet = null;
    S.tpHitDuringStreak = false;
  }

  function checkEndOutsideStreak(){
    const p = currentParams();
    if(S.gamePnL >= p.tp){ endGame("TP"); return true; }
    if(S.gamePnL <= p.sl){ endGame("SL"); return true; }
    return false;
  }

  function outcomeButtons(){
    return (S.gameType === "roulette")
      ? [{k:"R",t:"RED",c:"good"},{k:"B",t:"BLACK",c:"good"},{k:"G",t:"GREEN (0/00)",c:"neutral"}]
      : [{k:"P",t:"PLAYER",c:"good"},{k:"B",t:"BANKER",c:"good"},{k:"T",t:"TIE",c:"neutral"}];
  }

  function renderButtons(){
    const root = $("buttons");
    root.innerHTML = "";
    for(const b of outcomeButtons()){
      const el = document.createElement("button");
      el.className = `btn ${b.c}`;
      el.textContent = b.t;
      el.onclick = () => { S.pendingOutcome = b.k; save(); render(); };
      root.appendChild(el);
    }
  }

  function observeOrBet(outcome){
    if(!S.inGame) startNewGame();

    if(!S.observed){
      if(isTrue(outcome)){
        S.lastTrue = outcome;
        S.observed = true;
        logRow({ outcome: formatOutcome(outcome), pick:"—", bet:0, result:"OBS", delta:0, note:"Observation set lastTrue" });
      } else {
        logRow({ outcome: formatOutcome(outcome), pick:"—", bet:0, result:"OBS", delta:0, note:"Observation (neutral)" });
      }
      S.pendingOutcome = null;
      save(); render();
      return true;
    }
    return false;
  }

function submitPending(){
  if(!S.pendingOutcome) return;

  const outcome = S.pendingOutcome;

  // If modal is open, don't accept submissions
  if(S.endModalOpen){ return; }

  // Observation can consume the outcome (and it already logs + saves)
  if(observeOrBet(outcome)) return;

  // Only now do we snapshot for undo (this is a real state-changing submit)
  pushUndo();

  const p = currentParams();
  const pick = computePick();
  const neutral = isNeutral(outcome);

  // Ensure bets are always whole dollars
  let bet = 0;
  if(S.phase === "NORMAL") bet = toInt(S.ladderBet);
  else if(S.phase === "STREAK") bet = toInt(S.streakBet);
  else if(S.phase === "SPLIT") bet = toInt(S.nextSplitBet || p.min);

  let result = "L";
  let won = false;

  if(S.gameType === "baccarat" && outcome === "T"){
    result = "P";
    bet = 0;
  } else if(S.gameType === "roulette" && outcome === "G"){
    result = "L";
    won = false;
  } else {
    won = (outcome === pick);
    result = won ? "W" : "L";
  }

  let delta = 0;
  if(result !== "P" && bet > 0){
    delta = settleProfit(bet, won, pick);
    S.gamePnL = toInt(S.gamePnL + delta);
  }

  logRow({
    outcome: formatOutcome(outcome),
    pick: pick ? formatOutcome(pick) : "—",
    bet,
    result,
    delta: toInt(delta),
    note: ""
  });

  if(isTrue(outcome)) S.lastTrue = outcome;
  S.pendingOutcome = null;

  if(result === "P"){ save(); render(); return; }

  // ===== PHASE LOGIC (integer-safe) =====
  if(S.phase === "NORMAL"){
    if(won){
      applyModeWin();
      if(S.mode === "SAME") S.consecWinsSame += 1;
      else S.consecWinsSame = 0;

      S.ladderBet = toInt(clamp(toInt(S.ladderBet) - p.decW, p.min, p.cap));

      if(S.mode === "SAME" && S.consecWinsSame >= 2){ enterStreak(); }
    } else {
      S.consecWinsSame = 0;

      S.ladderBet = toInt(clamp(toInt(S.ladderBet) + p.incL, p.min, p.cap));

      applyModeLoss(neutral);

      const atCap = (bet === p.cap);
      if(atCap){
        if(!neutral){ enterSplit(); }
        else if(S.gameType === "roulette" && outcome === "G"){ enterSplit(); }
      }
    }
    if(checkEndOutsideStreak()) return;
  }
  else if(S.phase === "STREAK"){
    if(won){
      applyModeWin();
      S.streakBet = toInt(toInt(S.streakBet) + p.base);
      if(S.gamePnL >= p.tp) S.tpHitDuringStreak = true;
    } else {
      applyModeLoss(neutral);
      const tpReached = S.tpHitDuringStreak || (S.gamePnL >= p.tp);
      exitStreakAfterLoss();
      if(tpReached){ endGame("TP"); return; }
    }
    if(S.gamePnL <= p.sl){ endGame("SL"); return; }
  }
  else if(S.phase === "SPLIT"){
    if(S.splitPhase === "PROBE"){
      if(won){
        applyModeWin();

        S.ledger = Math.max(0, toInt(toInt(S.ledger) - p.min));

        computeSplitHalves();
        S.splitPhase = "PAY1";
        S.nextSplitBet = toInt(S.half1);
      } else {
        S.ledger = toInt(toInt(S.ledger) + p.min);

        applyModeLoss(neutral);
        S.nextSplitBet = toInt(p.min);
      }
    }
    else if(S.splitPhase === "PAY1"){
      if(won){
        applyModeWin();

        S.ledger = Math.max(0, toInt(toInt(S.ledger) - S.half1));

        S.splitPhase = "PAY2";
        S.nextSplitBet = Math.max(0, toInt(S.half2));
      } else {
        S.ledger = toInt(toInt(S.ledger) + S.half1);

        applyModeLoss(neutral);
        S.splitPhase = "PROBE";
        S.nextSplitBet = toInt(p.min);
      }
    }
    else if(S.splitPhase === "PAY2"){
      if(won){
        applyModeWin();

        S.ledger = Math.max(0, toInt(toInt(S.ledger) - S.half2));

        if(S.ledger <= 0){
          clearSplit();
        } else {
          S.splitPhase = "PROBE";
          S.nextSplitBet = toInt(p.min);
        }
      } else {
        S.ledger = toInt(toInt(S.ledger) + S.half2);

        applyModeLoss(neutral);
        S.splitPhase = "PROBE";
        S.nextSplitBet = toInt(p.min);
      }
    }

    if(checkEndOutsideStreak()) return;
  }

  save(); render();
}
  
  function clearSelection(){
  if (S.endModalOpen) return;

  S.pendingOutcome = null;
  save();
  render();
}

  function exportCSV(){
    const cols = ["idx","ts","gameNo","series","gameType","outcome","pick","bet","result","delta","gamePnL",
      "mode","modeLosses","phase","ledger","splitPhase","nextSplitBet","ladderBet","consecWinsSame","note"];
    const lines = [cols.join(",")];
    for(const r of S.log){
      const row = cols.map(c=>{
        let v = (r[c] ?? "");
        v = String(v).replaceAll('"','""');
        if(v.includes(",") || v.includes("\n")) v = `"${v}"`;
        return v;
      }).join(",");
      lines.push(row);
    }
    const blob = new Blob([lines.join("\n")], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `APP_session_${S.sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyBankroll(){
    pushUndo();
    const on = $("bankrollOn").checked;
    S.bankrollOn = on;

    const startStr = $("bankrollStart").value.trim();
    if(startStr.length){
      const n = Number(startStr);
      if(!Number.isFinite(n)){ alert("Starting bankroll must be a number."); return; }

      // Whole-dollar system: bankroll values stored as integers
      const whole = toInt(n);
      S.bankrollStart = whole;
      S.bankrollCurrent = whole;

      // Keep the input clean visually too
      $("bankrollStart").value = String(whole);
    } else {
      if(S.bankrollStart == null){
        S.bankrollStart = null;
        S.bankrollCurrent = null;
      }
    }

    save(); render();
  }

  function newEvening(){
    pushUndo();
    const keep = {
      gameType:S.gameType, series:S.series, startMode:S.startMode, autoSeries:S.autoSeries, carryMode:S.carryMode, pendingOneB:S.pendingOneB,
      bankrollOn:S.bankrollOn, bankrollStart:S.bankrollStart, bankrollCurrent:S.bankrollCurrent
    };
    S = defaultState();
    S.sessionId = Date.now();
    Object.assign(S, keep);
    save(); render();
  }

  function resetSession(){
    if(!confirm("Reset session and delete log + undo history?")) return;
    S = defaultState();
    save(); render();
  }

  function renderLog(){
    $("logCount").textContent = String(S.log.length);
    $("gameNo").textContent = String(S.gameNo);

    const body = $("logBody");
    body.innerHTML = "";
    const last = S.log.slice(-250).reverse();
    for(const r of last){
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.idx}</td>
        <td>${r.gameNo}</td>
        <td>${r.series}</td>
        <td>${r.gameType}</td>
        <td>${r.outcome}</td>
        <td>${r.pick}</td>
        <td class="right">${r.bet}</td>
        <td>${r.result}</td>
        <td class="right">${r.delta}</td>
        <td class="right">${r.gamePnL}</td>
        <td>${r.mode}</td>
        <td>${r.phase}</td>
        <td class="right">${r.ledger || 0}</td>
        <td>${r.note || ""}</td>
      `;
      body.appendChild(tr);
    }
  }

  function render(){
    $("gameType").value = S.gameType;
    $("series").value = S.series;
    $("startMode").value = S.startMode;
    $("autoSeries").checked = !!S.autoSeries;
    $("carryMode").checked = !!S.carryMode;

    $("bankrollOn").checked = !!S.bankrollOn;
    $("bankrollStart").value = (S.bankrollStart == null) ? "" : String(S.bankrollStart);

    const p = currentParams();

    if(S.bankrollOn && typeof S.bankrollCurrent === "number" && typeof S.bankrollStart === "number"){
      $("bankrollCurrent").textContent = String(toInt(S.bankrollCurrent));
      $("bankrollNet").textContent = String(toInt(S.bankrollCurrent - S.bankrollStart));
    } else {
      $("bankrollCurrent").textContent = "—";
      $("bankrollNet").textContent = "—";
    }

    renderButtons();

    $("selectedOutcome").textContent = S.pendingOutcome ? formatOutcome(S.pendingOutcome) : "—";
    $("submitSelBtn").disabled = !S.pendingOutcome || S.endModalOpen;
    $("clearSelBtn").disabled = !S.pendingOutcome || S.endModalOpen;

    let nextSide = "—";
    let nextBet = "—";
    if(!S.inGame){
      nextSide = "—"; nextBet = "—";
    } else if(!S.observed){
      nextSide = "OBS"; nextBet = "OBS";
    } else {
      const pick = computePick();
      nextSide = formatOutcome(pick);
      if(S.phase === "NORMAL") nextBet = String(toInt(S.ladderBet));
      else if(S.phase === "STREAK") nextBet = String(toInt(S.streakBet));
      else if(S.phase === "SPLIT") nextBet = String(toInt(S.nextSplitBet || p.min));
    }

    $("nextSide").textContent = nextSide;
    $("nextBet").textContent = nextBet;
    $("mode").textContent = S.inGame ? S.mode : "—";
    $("modeLosses").textContent = S.inGame ? String(S.modeLosses) : "—";
    $("seriesShow").textContent = S.series;
    $("gamePnL").textContent = String(toInt(S.gamePnL || 0));
    $("state").textContent = S.phase;
    $("cw").textContent = String(S.consecWinsSame);
    $("ladderBet").textContent = (S.phase === "SPLIT") ? "FROZEN" : (S.ladderBet ? String(toInt(S.ladderBet)) : "—");
    $("ledger").textContent = (S.phase === "SPLIT") ? String(toInt(S.ledger)) : "—";
    $("splitPhase").textContent = (S.phase === "SPLIT") ? (S.splitPhase || "—") : "—";
    $("nextSplitBet").textContent = (S.phase === "SPLIT") ? String(toInt(S.nextSplitBet || p.min)) : "—";

    const hint = [];
    if(S.endModalOpen){
      hint.push("Game ended. Close the popup or start the next game.");
    } else if(!S.inGame){
      hint.push("No game started. Go to Setup and tap “Start Game” to begin.");
    } else if(!S.observed){
      hint.push("Observation Phase: Select the side of the previous spin/hand and press Submit to begin.");
    } else {
      hint.push(`Series ${S.series} TP/SL: ${p.tp} / ${p.sl}.`);
      if(S.phase === "STREAK") hint.push("STREAK: press +base each win; TP ends when streak loses.");
      if(S.phase === "SPLIT") hint.push("SPLIT: probe min → half-pay → remainder; tie push repeats same split bet.");
      if(S.autoSeries && S.pendingOneB) hint.push("Auto Series armed: next game will be Series B (one game).");
    }
    $("hint").textContent = hint.join(" ");

    $("endBackdrop").style.display = S.endModalOpen ? "flex" : "none";
    renderLog();
  }

  // wiring
  $("gameType").addEventListener("change", (e)=>{ pushUndo(); S.gameType = e.target.value; S.pendingOutcome=null; save(); render(); });
  $("series").addEventListener("change", (e)=>{ pushUndo(); S.series = e.target.value; save(); render(); });
  $("startMode").addEventListener("change", (e)=>{ pushUndo(); S.startMode = e.target.value; save(); render(); });

  $("autoSeries").addEventListener("change", (e)=>{ pushUndo(); S.autoSeries = e.target.checked; save(); render(); });
  $("carryMode").addEventListener("change", (e)=>{ pushUndo(); S.carryMode = e.target.checked; save(); render(); });

  $("applyBankrollBtn").addEventListener("click", ()=>applyBankroll());
  $("bankrollOn").addEventListener("change", ()=>applyBankroll());

  $("newGameBtn").addEventListener("click", ()=>startNewGame());
  $("newEveningBtn").addEventListener("click", ()=>newEvening());
  $("resetSessionBtn").addEventListener("click", ()=>resetSession());

  $("exportCsvBtn").addEventListener("click", ()=>exportCSV());

  $("submitSelBtn").addEventListener("click", ()=>submitPending());
  $("undoBtn").addEventListener("click", ()=>undo());
  $("clearSelBtn").addEventListener("click", ()=>clearSelection());

  document.querySelectorAll(".infoBtn").forEach(btn=>{
    btn.addEventListener("click", (e)=>showTip(e.currentTarget.getAttribute("data-tip")));
  });
  $("tipCloseBtn").addEventListener("click", ()=>closeTip());
  $("tipBackdrop").addEventListener("click", (e)=>{ if(e.target.id==="tipBackdrop") closeTip(); });

  $("closeEndBtn").addEventListener("click", ()=>closeEndModal());
  $("nextGameFromModalBtn").addEventListener("click", ()=>{ closeEndModal(); startNewGame(); });
  $("endBackdrop").addEventListener("click", (e)=>{ if(e.target.id==="endBackdrop") closeEndModal(); });

  // init
  save();
  render();
})();
