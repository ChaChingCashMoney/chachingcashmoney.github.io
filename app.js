(() => {
  // ====== VERSION (bump this when you ship changes) ======
const APP_VERSION = "1.0.3";
const RELEASE_NOTES = {
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
  const ANCHOR_STREAK_A = 18;
  const ANCHOR_SPLITCLEAR_A = 15;

  const tips = {
    autoSeries: {
      title: "Auto Series",
      body: `
        <div><b>ON:</b> If a Series A game ends at SL, the <b>next game</b> becomes <b>one Series B game only</b>, then returns to Series A.</div>
        <div class="muted" style="margin-top:8px;">Manual series selection still works if you turn this OFF.</div>`
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
    }
  };

  function seriesParams(series){
    if(series === "B"){
      return { base:10, tp:80, sl:-200, incL:6, decW:4, min:10, cap:60,
        anchorStreak:ANCHOR_STREAK_A*2, anchorSplit:ANCHOR_SPLITCLEAR_A*2, maxSplitBet:180, splitLedger:120 };
    }
    return { base:5, tp:40, sl:-100, incL:3, decW:2, min:5, cap:30,
      anchorStreak:ANCHOR_STREAK_A, anchorSplit:ANCHOR_SPLITCLEAR_A, maxSplitBet:90, splitLedger:60 };
  }

  const deepCopy = (o)=>JSON.parse(JSON.stringify(o));
  const $ = (id)=>document.getElementById(id);

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
  function load(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e){ return null; } }

  function pushUndo(){
    S.undoStack.push(deepCopy(S));
    if(S.undoStack.length > 300) S.undoStack.shift();
  }
  function undo(){
    if(!S.undoStack.length) return;
    S = S.undoStack.pop();
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
    if(S.gameType === "roulette") return won ? bet : -bet;
    if(!won) return -bet;
    if(pick === "B") return bet * (1.0 - BANKER_COMMISSION);
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
  function closeTip(){ $("tipBackdrop").style.display = "none"; }

  function showEndModal(endedBy, finalPnL){
    S.endModalOpen = true;
    S.lastEndedBy = endedBy;
    S.lastEndedPnL = finalPnL;

    const p = currentParams();
    let bankrollLine = `<div class="muted" style="margin-top:8px;">Bankroll manager is OFF.</div>`;
    if(S.bankrollOn && typeof S.bankrollCurrent === "number"){
      bankrollLine = `<div style="margin-top:8px;"><b>Bankroll:</b> ${S.bankrollCurrent.toFixed(2)} <span class="muted">(session net ${(S.bankrollCurrent - (S.bankrollStart||0)).toFixed(2)})</span></div>`;
    }

    $("endTitle").textContent = `GAME ENDED — ${endedBy}`;
    $("endBody").innerHTML = `
      <div><b>Series:</b> ${S.series} &nbsp; <span class="muted">(TP/SL ${p.tp} / ${p.sl})</span></div>
      <div style="margin-top:8px;"><b>Final Game P&L:</b> ${finalPnL.toFixed(2)}</div>
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
    S.ladderBet = p.min;
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
      S.bankrollCurrent = +(S.bankrollCurrent + S.gamePnL).toFixed(2);
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
    S.streakBet = S.ladderBet + p.base;
    S.tpHitDuringStreak = false;
    S.consecWinsSame = 0;
  }
  function exitStreakAfterLoss(){
    const p = currentParams();
    S.phase = "NORMAL";
    S.streakBet = null;
    S.ladderBet = p.anchorStreak;
    S.consecWinsSame = 0;
  }

  function enterSplit(){
    const p = currentParams();
    S.phase = "SPLIT";
    S.ledger = p.splitLedger;
    S.splitPhase = "PROBE";
    S.nextSplitBet = p.min;
    S.half1 = null; S.half2 = null;
    S.consecWinsSame = 0;
    S.streakBet = null;
    S.tpHitDuringStreak = false;
  }
  function computeSplitHalves(){
    const p = currentParams();
    let h1 = Math.ceil(S.ledger / 2);
    let h2 = S.ledger - h1;
    if(h1 > p.maxSplitBet){ h1 = p.maxSplitBet; h2 = S.ledger - h1; }
    S.half1 = h1; S.half2 = h2;
  }
  function clearSplit(){
    const p = currentParams();
    S.phase = "NORMAL";
    S.ledger = 0;
    S.splitPhase = null;
    S.nextSplitBet = null;
    S.half1 = null; S.half2 = null;
    S.ladderBet = p.anchorSplit;
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
    pushUndo();
    const outcome = S.pendingOutcome;
    if(S.endModalOpen){ return; }
    if(observeOrBet(outcome)) return;

    const p = currentParams();
    const pick = computePick();
    const neutral = isNeutral(outcome);

    let bet = 0;
    if(S.phase === "NORMAL") bet = S.ladderBet;
    else if(S.phase === "STREAK") bet = Math.round(S.streakBet);
    else if(S.phase === "SPLIT") bet = Math.round(S.nextSplitBet || p.min);

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
      S.gamePnL = +(S.gamePnL + delta).toFixed(2);
    }

    logRow({ outcome: formatOutcome(outcome), pick: pick ? formatOutcome(pick) : "—", bet, result, delta: +delta.toFixed(2), note: "" });

    if(isTrue(outcome)) S.lastTrue = outcome;
    S.pendingOutcome = null;

    if(result === "P"){ save(); render(); return; }

    if(S.phase === "NORMAL"){
      if(won){
        applyModeWin();
        if(S.mode === "SAME") S.consecWinsSame += 1;
        else S.consecWinsSame = 0;
        S.ladderBet = clamp(S.ladderBet - p.decW, p.min, p.cap);
        if(S.mode === "SAME" && S.consecWinsSame >= 2){ enterStreak(); }
      } else {
        S.consecWinsSame = 0;
        S.ladderBet = clamp(S.ladderBet + p.incL, p.min, p.cap);
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
        S.streakBet = S.streakBet + p.base;
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
          S.ledger = Math.max(0, +(S.ledger - p.min).toFixed(2));
          computeSplitHalves();
          S.splitPhase = "PAY1";
          S.nextSplitBet = S.half1;
        } else {
          S.ledger = +(S.ledger + p.min).toFixed(2);
          applyModeLoss(neutral);
          S.nextSplitBet = p.min;
        }
      }
      else if(S.splitPhase === "PAY1"){
        if(won){
          applyModeWin();
          S.ledger = Math.max(0, +(S.ledger - S.half1).toFixed(2));
          S.splitPhase = "PAY2";
          S.nextSplitBet = Math.max(0, S.half2);
        } else {
          S.ledger = +(S.ledger + S.half1).toFixed(2);
          applyModeLoss(neutral);
          S.splitPhase = "PROBE";
          S.nextSplitBet = p.min;
        }
      }
      else if(S.splitPhase === "PAY2"){
        if(won){
          applyModeWin();
          S.ledger = Math.max(0, +(S.ledger - S.half2).toFixed(2));
          if(S.ledger <= 0){ clearSplit(); }
          else { S.splitPhase = "PROBE"; S.nextSplitBet = p.min; }
        } else {
          S.ledger = +(S.ledger + S.half2).toFixed(2);
          applyModeLoss(neutral);
          S.splitPhase = "PROBE";
          S.nextSplitBet = p.min;
        }
      }
      if(checkEndOutsideStreak()) return;
    }

    save(); render();
  }

  function clearSelection(){ pushUndo(); S.pendingOutcome = null; save(); render(); }

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
      S.bankrollStart = n;
      S.bankrollCurrent = n;
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
      $("bankrollCurrent").textContent = S.bankrollCurrent.toFixed(2);
      $("bankrollNet").textContent = (S.bankrollCurrent - S.bankrollStart).toFixed(2);
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
      if(S.phase === "NORMAL") nextBet = String(S.ladderBet);
      else if(S.phase === "STREAK") nextBet = String(Math.round(S.streakBet));
      else if(S.phase === "SPLIT") nextBet = String(Math.round(S.nextSplitBet || p.min));
    }

    $("nextSide").textContent = nextSide;
    $("nextBet").textContent = nextBet;
    $("mode").textContent = S.inGame ? S.mode : "—";
    $("modeLosses").textContent = S.inGame ? String(S.modeLosses) : "—";
    $("seriesShow").textContent = S.series;
    $("gamePnL").textContent = String(S.gamePnL || 0);
    $("state").textContent = S.phase;
    $("cw").textContent = String(S.consecWinsSame);
    $("ladderBet").textContent = (S.phase === "SPLIT") ? "FROZEN" : (S.ladderBet ? String(S.ladderBet) : "—");
    $("ledger").textContent = (S.phase === "SPLIT") ? String(S.ledger) : "—";
    $("splitPhase").textContent = (S.phase === "SPLIT") ? (S.splitPhase || "—") : "—";
    $("nextSplitBet").textContent = (S.phase === "SPLIT") ? String(Math.round(S.nextSplitBet || p.min)) : "—";

    const hint = [];
    if(S.endModalOpen){
      hint.push("Game ended. Close the popup or start the next game.");
    } else if(!S.inGame){
      hint.push("No active game. Tap New Game, then stage+submit outcomes.");
    } else if(!S.observed){
      hint.push("Observation: stage+submit outcomes until TRUE outcome occurs (R/B or P/B). No bet is placed until then.");
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
  $("clearSelBtn").addEventListener("click", ()=>clearSelection());
  $("undoBtn").addEventListener("click", ()=>undo());

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
