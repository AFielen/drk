// app.js — Einstiegspunkt, State-Management, Event-Listener
"use strict";

import { $, esc, randomCode, renderQrCode, renderResultBars, renderLiveBars,
         showEndModal, hideEndModal, initHelpPopover, updateInfoBoxes,
         generateDeviceFingerprint, voteBtnCls } from './ui.js';
import { generatePdf } from './pdf-export.js';
import { createHostTransport, createVoterTransport } from './peer-mode.js';

// ===================== MODE DETECTION =====================
var params = new URLSearchParams(window.location.search);
var votePeerId = params.get("vote");
var isVoter = !!votePeerId;

if(isVoter){
    document.getElementById("view-presenter").style.display = "none";
    document.getElementById("view-voter").style.display = "";
    initVoter(votePeerId);
} else {
    initPresenter();
}

// ===================== PRESENTER =====================
function initPresenter(){
    var transport = createHostTransport();
    var sessionTitle = "";
    var voterCount = 10;
    var currentVote = null;
    var votedDevices = new Set();
    var history = [];
    var timerSecondsLeft = 0;
    var timerInterval = null;

    var sessionMode = "open";
    var tokenCodes = {};
    var generatedCodes = [];

    var el = {
        welcomeInfo: $("p-welcome-info"),
        setup: $("p-setup"), session: $("p-session"), connecting: $("p-connecting"),
        inpTitle: $("inp-title"), inpVoters: $("inp-voters"),
        btnStartSession: $("btn-start-session"), btnEndSession: $("btn-end-session"),
        lblTitle: $("lbl-title"), lblVoters: $("lbl-voters"),
        newVote: $("p-new-vote"), voteInfo: $("p-vote-info"), activeVote: $("p-active-vote"),
        result: $("p-result"), historyCard: $("p-history"),
        inpTopic: $("inp-topic"), inpDesc: $("inp-desc"),
        customOpts: $("p-custom-opts"), inpCustom: $("inp-custom"),
        btnStartVote: $("btn-start-vote"), btnCloseVote: $("btn-close-vote"),
        btnCancelVote: $("btn-cancel-vote"), btnNextVote: $("btn-next-vote"),
        lblVoteTopic: $("lbl-vote-topic"), lblVoteDesc: $("lbl-vote-desc"),
        qrCanvas: $("qr-canvas"), lblVoteUrl: $("lbl-vote-url"),
        lblConnected: $("lbl-connected"), lblConnectedLabel: $("lbl-connected-label"),
        lblCast: $("lbl-cast"), lblTotal: $("lbl-total"),
        barProgress: $("bar-progress"), liveBars: $("live-bars"),
        lblResultTopic: $("lbl-result-topic"), resultBars: $("result-bars"),
        resultNotVoted: $("result-not-voted"),
        resultSummary: $("result-summary"), historyList: $("history-list"),
        chkVoteTimer: $("chk-vote-timer"), inpVoteTimerMin: $("inp-vote-timer-min"),
        timerArea: $("p-timer-area"), lblTimer: $("lbl-timer"),
        skTokenSetup: $("sk-token-setup"), btnGenerateTokens: $("btn-generate-tokens"),
        tokenPreview: $("token-preview"), tokenList: $("token-list"),
        btnPrintTokens: $("btn-print-tokens"),
        skDeviceInfo: $("sk-device-info"), lblSkDevices: $("lbl-sk-devices"),
        btnExportPdf: $("btn-export-pdf"),
    };

    // ---- Mode selection ----
    document.querySelectorAll('input[name="session-mode"]').forEach(function(r){
        r.addEventListener("change", function(){
            sessionMode = this.value;
            document.querySelectorAll(".mode-card").forEach(function(c){c.classList.remove("active")});
            this.closest(".mode-card").classList.add("active");
            el.skTokenSetup.classList.toggle("hidden", sessionMode !== "stimmkarten");
            updateInfoBoxes(sessionMode);
        });
    });

    // ---- Info box content ----
    updateInfoBoxes(sessionMode);

    // ---- Token generation ----
    var TOKEN_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    function generateToken(){
        var code = "";
        for(var i = 0; i < 6; i++){
            if(i === 3) code += "-";
            code += TOKEN_CHARS[Math.floor(Math.random() * TOKEN_CHARS.length)];
        }
        return code;
    }

    el.btnGenerateTokens.addEventListener("click", function(){
        var count = parseInt(el.inpVoters.value, 10) || 10;
        if(count < 1) count = 1;
        var usedCodes = new Set();
        generatedCodes = [];
        tokenCodes = {};
        for(var i = 0; i < count; i++){
            var code;
            do { code = generateToken(); } while(usedCodes.has(code));
            usedCodes.add(code);
            generatedCodes.push(code);
            tokenCodes[code] = { votedInRounds: [] };
        }
        var html = "";
        generatedCodes.forEach(function(c){ html += '<span class="token-chip">' + esc(c) + '</span>'; });
        el.tokenList.innerHTML = html;
        el.tokenPreview.classList.remove("hidden");
    });

    // ---- Print tokens ----
    el.btnPrintTokens.addEventListener("click", function(){
        var area = $("print-tokens-area");
        var cardsPerPage = 12;
        var pages = Math.ceil(generatedCodes.length / cardsPerPage);
        var html = "";
        for(var p = 0; p < pages; p++){
            html += '<div class="print-page"><div class="print-grid">';
            for(var i = p * cardsPerPage; i < Math.min((p+1) * cardsPerPage, generatedCodes.length); i++){
                html += '<div class="print-card">';
                html += '<div class="pc-logo">&#10010; DRK</div>';
                html += '<div class="pc-label">Ihr Abstimmungscode:</div>';
                html += '<div class="pc-code">' + esc(generatedCodes[i]) + '</div>';
                html += '<div class="pc-footer">DRK Vereinsabstimmung</div>';
                html += '</div>';
            }
            var remainder = cardsPerPage - (generatedCodes.length - p * cardsPerPage);
            if(remainder > 0 && remainder < cardsPerPage){
                for(var j = 0; j < remainder; j++) html += '<div class="print-card" style="border:none"></div>';
            }
            html += '</div></div>';
        }
        area.innerHTML = html;
        setTimeout(function(){ window.print(); }, 100);
    });

    // ---- Help popover ----
    initHelpPopover();

    // ---- Vote type toggle ----
    document.querySelectorAll('input[name="vtype"]').forEach(function(r){
        r.addEventListener("change", function(){
            el.customOpts.classList.toggle("hidden", this.value !== "custom");
        });
    });

    // ---- Start session ----
    el.btnStartSession.addEventListener("click", function(){
        sessionTitle = el.inpTitle.value.trim();
        voterCount = parseInt(el.inpVoters.value, 10);
        sessionMode = document.querySelector('input[name="session-mode"]:checked').value;
        if(!sessionTitle){ alert("Bitte Versammlungstitel eingeben."); return; }
        if(!voterCount || voterCount < 1){ alert("Bitte gültige Anzahl eingeben."); return; }
        if(sessionMode === "stimmkarten" && generatedCodes.length === 0){
            alert("Bitte zuerst Token-Codes generieren."); return;
        }

        history = [];
        versammlungAktiv = true;
        el.lblTitle.textContent = sessionTitle;
        el.lblVoters.textContent = voterCount + " Stimmberechtigte";
        el.welcomeInfo.classList.add("hidden");
        el.setup.classList.add("hidden");
        el.session.classList.remove("hidden");
        el.connecting.classList.remove("hidden");
        el.newVote.classList.add("hidden");

        // Setup transport callbacks
        transport.onConnection(function(conn){
            updateConnectedCount();
            sendStateToConn(conn);
        });

        transport.onData(function(conn, data){
            handleHostData(conn, data);
        });

        transport.onDisconnect(function(){
            updateConnectedCount();
        });

        // Init peer connection
        transport.init({}).then(function(){
            el.connecting.classList.add("hidden");
            el.newVote.classList.remove("hidden");
            el.voteInfo.classList.remove("hidden");
        }).catch(function(err){
            el.connecting.innerHTML = '<div class="error-box">Verbindungsfehler: ' + esc(err.message || err.type || "Unbekannt") + '</div>';
        });
    });

    function handleHostData(conn, data){
        var connDeviceMap = transport.getConnDeviceMap();

        // --- STIMMKARTEN: Token validation ---
        if(data.type === "sk-validate" && currentVote && sessionMode === "stimmkarten"){
            var code = (data.code || "").toUpperCase().trim();
            if(!tokenCodes[code]){
                transport.sendTo(conn, { type:"sk-result", valid:false, reason:"invalid" });
                return;
            }
            if(tokenCodes[code].votedInRounds.indexOf(currentVote.roundId) !== -1){
                transport.sendTo(conn, { type:"sk-result", valid:false, reason:"already_used" });
                return;
            }
            transport.sendTo(conn, { type:"sk-result", valid:true, options:currentVote.options, voteType:currentVote.type, topic:currentVote.topic });
        }
        // --- STIMMKARTEN: Cast vote with token ---
        if(data.type === "sk-cast-vote" && currentVote && sessionMode === "stimmkarten"){
            var kcode = (data.code || "").toUpperCase().trim();
            if(!tokenCodes[kcode]){
                transport.sendTo(conn, { type:"sk-vote-result", success:false, reason:"invalid" });
                return;
            }
            if(tokenCodes[kcode].votedInRounds.indexOf(currentVote.roundId) !== -1){
                transport.sendTo(conn, { type:"sk-vote-result", success:false, reason:"already_used" });
                return;
            }
            if(!currentVote.options.includes(data.option)){
                transport.sendTo(conn, { type:"sk-vote-result", success:false, reason:"invalid" });
                return;
            }
            tokenCodes[kcode].votedInRounds.push(currentVote.roundId);
            currentVote.votes[data.option]++;
            currentVote.totalCast++;
            transport.sendTo(conn, { type:"sk-vote-result", success:true });
            updateLiveBars();
            if(currentVote.totalCast >= voterCount) closeVote();
        }
        // --- OPEN MODE: Cast vote ---
        if(data.type === "cast-vote" && currentVote && sessionMode === "open"){
            var lsId = data.deviceId || connDeviceMap.get(conn.peer) || conn.peer;
            var fpId = data.fingerprintId || connDeviceMap.get(conn.peer + ":fp") || null;
            if(votedDevices.has(lsId) || (fpId && votedDevices.has("fp:" + fpId))) {
                transport.sendTo(conn, { type:"already-voted" });
                return;
            }
            if(!currentVote.options.includes(data.option)) return;
            votedDevices.add(lsId);
            if(fpId) votedDevices.add("fp:" + fpId);
            currentVote.votes[data.option]++;
            currentVote.totalCast++;
            transport.sendTo(conn, { type:"vote-confirmed" });
            updateLiveBars();
            if(currentVote.totalCast >= voterCount) closeVote();
        }
    }

    function sendStateToConn(conn){
        if(currentVote){
            transport.sendTo(conn, { type:"vote-started", topic:currentVote.topic, description:currentVote.description, voteType:currentVote.type, options:currentVote.options, voteRoundId:currentVote.roundId, timerSeconds:timerSecondsLeft, mode:sessionMode });
            if(sessionMode === "open"){
                var connDeviceMap = transport.getConnDeviceMap();
                var lsId = connDeviceMap.get(conn.peer);
                var fpId = connDeviceMap.get(conn.peer + ":fp");
                if((lsId && votedDevices.has(lsId)) || (fpId && votedDevices.has("fp:" + fpId))){
                    transport.sendTo(conn, { type:"already-voted" });
                }
            }
        } else {
            transport.sendTo(conn, { type:"waiting", mode:sessionMode });
        }
    }

    function updateConnectedCount(){
        var reconnCount = transport.getDisconnectedCount();
        el.lblConnected.textContent = transport.getConnectionCount();
        var label;
        if(sessionMode === "stimmkarten"){
            label = "Stimmkarten-Geräte verbunden";
            el.skDeviceInfo.classList.remove("hidden");
            el.lblSkDevices.textContent = transport.getConnectionCount();
        } else {
            label = "Teilnehmer verbunden";
            el.skDeviceInfo.classList.add("hidden");
        }
        if(reconnCount > 0){
            label += " · <span style=\"color:#F59E0B\">" + reconnCount + " verbinden sich erneut</span>";
        }
        el.lblConnectedLabel.innerHTML = label;
    }

    // ---- PDF Export ----
    el.btnExportPdf.addEventListener("click", function(){
        if(!history.length) return;
        generatePdf(history, sessionTitle, voterCount, sessionMode);
    });

    // ---- End session ----
    var versammlungAktiv = false;

    function doEndSession(){
        stopTimer();
        if(currentVote){ closeVote(); }
        var historySnapshot = history.map(function(h){ return Object.assign({}, h); });
        var totalStimmen = 0;
        historySnapshot.forEach(function(h){ totalStimmen += h.totalCast; });
        var anzahlAbstimmungen = historySnapshot.length;
        var dankeUrl = "danke.html?votes=" + anzahlAbstimmungen + "&participants=" + voterCount + "&total=" + totalStimmen;
        transport.broadcast({ type:"redirect", url:dankeUrl });
        transport.broadcast({ type:"session-ended" });
        transport.destroy();
        currentVote = null;
        history = [];
        tokenCodes = {};
        generatedCodes = [];
        versammlungAktiv = false;
        window.location.href = dankeUrl;
    }

    el.btnEndSession.addEventListener("click", function(){
        showEndModal(history.length > 0 || !!currentVote);
    });

    $("end-modal-confirm").addEventListener("click", function(){
        hideEndModal();
        doEndSession();
    });
    $("end-modal-cancel").addEventListener("click", function(){
        hideEndModal();
    });
    $("end-modal-pdf").addEventListener("click", function(){
        if(currentVote){ closeVote(); }
        var historySnapshot = history.map(function(h){ return Object.assign({}, h); });
        if(historySnapshot.length > 0){
            generatePdf(historySnapshot, sessionTitle, voterCount, sessionMode);
        }
    });
    $("end-modal-overlay").addEventListener("click", function(e){
        if(e.target === this) hideEndModal();
    });
    document.addEventListener("keydown", function(e){
        if(e.key === "Escape" && $("end-modal-overlay").style.display === "flex"){
            hideEndModal();
        }
    });

    // ---- beforeunload warning ----
    window.addEventListener("beforeunload", function(e){
        if(versammlungAktiv){
            e.preventDefault();
            return "";
        }
    });

    // ---- Start vote ----
    el.btnStartVote.addEventListener("click", function(){
        var topic = el.inpTopic.value.trim();
        if(!topic){ alert("Bitte Thema eingeben."); return; }
        var desc = el.inpDesc.value.trim();
        var vtype = document.querySelector('input[name="vtype"]:checked').value;
        var options;

        if(vtype === "custom"){
            var raw = el.inpCustom.value.trim();
            if(!raw){ alert("Bitte Optionen eingeben."); return; }
            options = raw.split("\n").map(function(s){return s.trim()}).filter(function(s){return s.length>0});
            if(options.length < 2){ alert("Mindestens 2 Optionen nötig."); return; }
        } else {
            options = ["Ja", "Nein", "Enthaltung"];
        }

        var votes = {};
        options.forEach(function(o){ votes[o] = 0; });
        var roundId = "round-" + Date.now() + "-" + randomCode(4);
        var voteTimerOn = el.chkVoteTimer.checked;
        var voteTimerMin = parseInt(el.inpVoteTimerMin.value, 10) || 5;
        if(voteTimerMin < 1) voteTimerMin = 1;
        var voteTimerSec = voteTimerOn ? voteTimerMin * 60 : 0;
        currentVote = { topic:topic, description:desc, type:vtype, options:options, votes:votes, totalCast:0, roundId:roundId, timerEnabled:voteTimerOn, timerSeconds:voteTimerSec, startedAt:new Date() };
        votedDevices = new Set();

        transport.broadcast({ type:"vote-started", topic:topic, description:desc, voteType:vtype, options:options, voteRoundId:roundId, timerSeconds:voteTimerSec, mode:sessionMode });
        showActiveVote();
        startTimer();
    });

    // ---- Close vote ----
    el.btnCloseVote.addEventListener("click", function(){
        if(!currentVote){ return; }
        closeVote();
    });

    el.btnCancelVote.addEventListener("click", function(){
        if(!confirm("Abstimmung abbrechen?")) return;
        stopTimer();
        currentVote = null;
        transport.broadcast({ type:"vote-cancelled" });
        showNewVoteForm();
    });

    el.btnNextVote.addEventListener("click", showNewVoteForm);

    function closeVote(){
        stopTimer();
        var v = currentVote;
        var notVoted = voterCount - v.totalCast;
        var result = {
            topic:v.topic, description:v.description, type:v.type,
            options:v.options.slice(), votes:Object.assign({},v.votes),
            totalCast:v.totalCast, totalVoters:voterCount, notVoted:notVoted,
            startedAt:v.startedAt||null, closedAt:new Date()
        };
        if(v.type === "yes-no"){
            var yes = v.votes["Ja"]||0, no = v.votes["Nein"]||0;
            result.outcome = yes > no ? "accepted" : no > yes ? "rejected" : "tie";
        } else {
            var max=0, winners=[];
            Object.keys(v.votes).forEach(function(k){
                if(v.votes[k]>max){max=v.votes[k];winners=[k];}
                else if(v.votes[k]===max)winners.push(k);
            });
            result.outcome = winners.length===1 ? "custom-winner" : "tie";
            if(winners.length===1) result.winner = winners[0];
        }
        history.push(result);
        currentVote = null;
        transport.broadcast({ type:"vote-closed", result:result });
        showResult(result);
        updateHistory();
    }

    // ---- UI ----
    function showNewVoteForm(){
        el.newVote.classList.remove("hidden");
        el.voteInfo.classList.remove("hidden");
        el.activeVote.classList.add("hidden");
        el.result.classList.add("hidden");
        el.inpTopic.value = "";
        el.inpDesc.value = "";
        el.inpCustom.value = "";
        document.querySelector('input[name="vtype"][value="yes-no"]').checked = true;
        el.customOpts.classList.add("hidden");
        el.resultNotVoted.classList.add("hidden");
        currentVote = null;
    }

    // ---- Timer ----
    function startTimer(){
        stopTimer();
        if(!currentVote || !currentVote.timerEnabled) {
            timerSecondsLeft = 0;
            el.timerArea.classList.add("hidden");
            return;
        }
        timerSecondsLeft = currentVote.timerSeconds;
        el.timerArea.classList.remove("hidden");
        updateTimerDisplay();
        timerInterval = setInterval(function(){
            timerSecondsLeft--;
            if(timerSecondsLeft <= 0){
                timerSecondsLeft = 0;
                stopTimer();
                transport.broadcast({ type:"timer-update", seconds:0 });
                if(currentVote) closeVote();
                return;
            }
            updateTimerDisplay();
            if(timerSecondsLeft <= 30 || timerSecondsLeft % 5 === 0){
                transport.broadcast({ type:"timer-update", seconds:timerSecondsLeft });
            }
        }, 1000);
    }

    function stopTimer(){
        if(timerInterval){ clearInterval(timerInterval); timerInterval = null; }
    }

    function updateTimerDisplay(){
        var m = Math.floor(timerSecondsLeft / 60);
        var s = timerSecondsLeft % 60;
        var txt = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
        el.lblTimer.textContent = txt;
        el.lblTimer.className = "timer-countdown";
        if(timerSecondsLeft <= 10) el.lblTimer.classList.add("danger");
        else if(timerSecondsLeft <= 30) el.lblTimer.classList.add("warning");
    }

    function showActiveVote(){
        el.newVote.classList.add("hidden");
        el.voteInfo.classList.add("hidden");
        el.result.classList.add("hidden");
        el.activeVote.classList.remove("hidden");

        el.lblVoteTopic.textContent = currentVote.topic;
        el.lblVoteDesc.textContent = currentVote.description || "";
        el.lblTotal.textContent = voterCount;
        $("lbl-progress-label").textContent = sessionMode === "stimmkarten" ? "Codes eingelöst" : "Stimmen";

        // QR code
        var baseUrl = window.location.origin + window.location.pathname;
        var voteUrl = baseUrl + "?vote=" + transport.getPeerId();
        el.lblVoteUrl.textContent = voteUrl;
        renderQrCode(el.qrCanvas, voteUrl);

        updateLiveBars();
    }

    function updateLiveBars(){
        if(!currentVote) return;
        var cast = currentVote.totalCast;
        el.lblCast.textContent = cast;
        el.barProgress.style.width = (cast/voterCount*100) + "%";
        renderLiveBars(el.liveBars, currentVote);
    }

    function showResult(result){
        el.activeVote.classList.add("hidden");
        el.voteInfo.classList.add("hidden");
        el.result.classList.remove("hidden");
        el.lblResultTopic.textContent = result.topic;
        renderResultBars(el.resultBars, result);
        if(result.notVoted > 0){
            el.resultNotVoted.textContent = "Nicht abgestimmt: " + result.notVoted + " von " + result.totalVoters;
            el.resultNotVoted.classList.remove("hidden");
        } else {
            el.resultNotVoted.classList.add("hidden");
        }
        el.resultSummary.className = "result-summary";
        if(result.outcome==="accepted"){ el.resultSummary.textContent="Antrag ANGENOMMEN"; el.resultSummary.classList.add("accepted"); }
        else if(result.outcome==="rejected"){ el.resultSummary.textContent="Antrag ABGELEHNT"; el.resultSummary.classList.add("rejected"); }
        else if(result.outcome==="tie"){ el.resultSummary.textContent="STIMMENGLEICHHEIT"; el.resultSummary.classList.add("neutral"); }
        else { el.resultSummary.textContent="Gewinner: "+(result.winner||""); el.resultSummary.classList.add("accepted"); }
    }

    function updateHistory(){
        if(!history.length){
            el.historyList.innerHTML='<p class="empty-state">Noch keine Abstimmungen durchgeführt.</p>';
            el.btnExportPdf.style.display = "none";
            return;
        }
        var html = "";
        history.forEach(function(item,i){
            var rc,rt;
            if(item.outcome==="accepted"){rc="accepted";rt="Angenommen";}
            else if(item.outcome==="rejected"){rc="rejected";rt="Abgelehnt";}
            else if(item.outcome==="tie"){rc="neutral";rt="Gleichstand";}
            else{rc="accepted";rt=item.winner||"Gewinner";}
            var d=item.options.map(function(o){return o+": "+item.votes[o]}).join(" | ")+" (Gesamt: "+item.totalCast+"/"+item.totalVoters+(item.notVoted>0?" · Nicht abgestimmt: "+item.notVoted:"")+")";
            html+='<div class="history-item"><span class="history-topic">'+(i+1)+'. '+esc(item.topic)+'</span><span class="history-result '+rc+'">'+rt+'</span><div class="history-details">'+esc(d)+'</div></div>';
        });
        el.historyList.innerHTML = html;
        el.btnExportPdf.style.display = "";
    }
}

// ===================== VOTER =====================
function initVoter(presenterPeerId){
    var transport = createVoterTransport();
    var lsDeviceId = localStorage.getItem("drk-device-id");
    if(!lsDeviceId){
        lsDeviceId = "dev-" + randomCode(12);
        localStorage.setItem("drk-device-id", lsDeviceId);
    }
    var fingerprintId = null;
    var currentRoundId = null;

    // Clean up old voted rounds (older than 24h)
    try {
        var stored = JSON.parse(localStorage.getItem("drk-voted-rounds") || "{}");
        var now = Date.now();
        var cleaned = {};
        Object.keys(stored).forEach(function(key){
            var ts = parseInt(key.split("-")[1], 10);
            if(now - ts < 86400000) cleaned[key] = true;
        });
        localStorage.setItem("drk-voted-rounds", JSON.stringify(cleaned));
    } catch(e){}

    function hasVotedInRound(roundId){
        if(!roundId) return false;
        if(sessionStorage.getItem("drk-voted-" + roundId)) return true;
        try {
            var rounds = JSON.parse(localStorage.getItem("drk-voted-rounds") || "{}");
            if(rounds[roundId]) return true;
        } catch(e){}
        return false;
    }
    function markVoted(roundId){
        if(!roundId) return;
        try { sessionStorage.setItem("drk-voted-" + roundId, "1"); } catch(e){}
        try {
            var rounds = JSON.parse(localStorage.getItem("drk-voted-rounds") || "{}");
            rounds[roundId] = true;
            localStorage.setItem("drk-voted-rounds", JSON.stringify(rounds));
        } catch(e){}
    }
    function clearVoted(roundId){
        if(!roundId) return;
        try { sessionStorage.removeItem("drk-voted-" + roundId); } catch(e){}
        try {
            var rounds = JSON.parse(localStorage.getItem("drk-voted-rounds") || "{}");
            delete rounds[roundId];
            localStorage.setItem("drk-voted-rounds", JSON.stringify(rounds));
        } catch(e){}
    }

    var voterTimerInterval = null;
    var voterSecondsLeft = 0;
    var hasVoted = false;
    var voterMode = "open";
    var skCurrentCode = null;
    var screens = ["v-connecting","v-waiting","v-voting","v-confirmed","v-result","v-ended","v-reconnecting","v-error","v-sk-waiting","v-sk-code","v-sk-vote","v-sk-confirmed"];

    function showScreen(id){
        screens.forEach(function(s){ document.getElementById(s).style.display = s===id ? "flex" : "none"; });
    }

    // Transport callbacks
    transport.onConnected(function(){
        transport.send({ type:"register", deviceId:lsDeviceId, fingerprintId:fingerprintId });
    });

    transport.onData(function(data){
        if(data.type === "waiting"){
            voterMode = data.mode || "open";
            showScreen(voterMode === "stimmkarten" ? "v-sk-waiting" : "v-waiting");
        }
        if(data.type === "vote-started"){
            voterMode = data.mode || "open";
            currentRoundId = data.voteRoundId;
            if(voterMode === "stimmkarten"){
                hasVoted = false;
                skCurrentCode = null;
                showSkCodeEntry(data);
            } else {
                if(data.voteRoundId && hasVotedInRound(data.voteRoundId)){
                    hasVoted = true;
                    showScreen("v-confirmed");
                } else {
                    hasVoted = false;
                    showVoting(data);
                }
            }
        }
        if(data.type === "vote-confirmed"){
            markVoted(currentRoundId);
            showScreen("v-confirmed");
        }
        if(data.type === "already-voted"){
            hasVoted = true;
            markVoted(currentRoundId);
            showScreen("v-confirmed");
        }
        if(data.type === "sk-result"){
            handleSkValidation(data);
        }
        if(data.type === "sk-vote-result"){
            handleSkVoteResult(data);
        }
        if(data.type === "timer-update"){
            voterSecondsLeft = data.seconds;
            updateVoterTimer();
            updateSkTimer();
        }
        if(data.type === "vote-closed"){
            stopVoterTimer();
            if(voterMode === "stimmkarten"){
                showScreen("v-sk-waiting");
            } else {
                showVoteResult(data.result);
            }
        }
        if(data.type === "vote-cancelled"){
            stopVoterTimer();
            hasVoted = false;
            clearVoted(currentRoundId);
            currentRoundId = null;
            showScreen(voterMode === "stimmkarten" ? "v-sk-waiting" : "v-waiting");
        }
        if(data.type === "redirect" && data.url){
            transport.markSessionEnded();
            stopVoterTimer();
            window.location.href = data.url;
            return;
        }
        if(data.type === "session-ended"){
            transport.markSessionEnded();
            stopVoterTimer();
            showScreen("v-ended");
        }
    });

    transport.onReconnecting(function(attempt, maxAttempts){
        document.getElementById("v-reconn-status").textContent = "Versuch " + attempt + " von " + maxAttempts;
        showScreen("v-reconnecting");
    });

    transport.onReconnectFailed(function(){
        showScreen("v-error");
    });

    // Manual retry button
    document.getElementById("btn-reconn-retry").addEventListener("click", function(){
        transport.retryConnect();
    });

    // Visibility change: check connection when tab becomes visible
    document.addEventListener("visibilitychange", function(){
        if(document.visibilityState === "visible"){
            transport.checkConnection();
        }
    });

    // Compute fingerprint first, then connect
    generateDeviceFingerprint().then(function(fp){
        fingerprintId = fp;
    }).catch(function(){
        fingerprintId = null;
    }).then(function(){
        transport.init(presenterPeerId);
    });

    // ---- Voter Timer ----
    function startVoterTimer(seconds){
        stopVoterTimer();
        var timerEl = document.getElementById("v-timer");
        if(!seconds || seconds <= 0){
            timerEl.classList.add("hidden");
            return;
        }
        voterSecondsLeft = seconds;
        timerEl.classList.remove("hidden");
        updateVoterTimer();
        voterTimerInterval = setInterval(function(){
            voterSecondsLeft--;
            if(voterSecondsLeft <= 0){
                voterSecondsLeft = 0;
                stopVoterTimer();
            }
            updateVoterTimer();
        }, 1000);
    }

    function stopVoterTimer(){
        if(voterTimerInterval){ clearInterval(voterTimerInterval); voterTimerInterval = null; }
    }

    function updateVoterTimer(){
        var timerEl = document.getElementById("v-timer");
        var m = Math.floor(voterSecondsLeft / 60);
        var s = voterSecondsLeft % 60;
        timerEl.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
        timerEl.className = "voter-timer";
        if(voterSecondsLeft <= 0){
            timerEl.textContent = "Zeit abgelaufen!";
            timerEl.classList.add("danger");
        } else if(voterSecondsLeft <= 10){
            timerEl.classList.add("danger");
        } else if(voterSecondsLeft <= 30){
            timerEl.classList.add("warning");
        }
    }

    function showVoting(data){
        document.getElementById("v-topic").textContent = data.topic;
        var descEl = document.getElementById("v-desc");
        descEl.textContent = data.description || "";
        descEl.style.display = data.description ? "block" : "none";
        startVoterTimer(data.timerSeconds || 0);
        var container = document.getElementById("v-options");
        container.innerHTML = "";
        data.options.forEach(function(opt){
            var btn = document.createElement("button");
            btn.textContent = opt;
            btn.className = "btn-vote " + voteBtnCls(opt, data.voteType);
            btn.addEventListener("click", function(){
                if(hasVoted) return;
                hasVoted = true;
                markVoted(currentRoundId);
                transport.send({ type:"cast-vote", option:opt, deviceId:lsDeviceId, fingerprintId:fingerprintId });
                showScreen("v-confirmed");
            });
            container.appendChild(btn);
        });
        showScreen("v-voting");
    }

    function showVoteResult(result){
        var s = document.getElementById("r-summary");
        s.className = "voter-result";
        if(result.outcome==="accepted"){ s.textContent="Antrag ANGENOMMEN"; s.classList.add("accepted"); }
        else if(result.outcome==="rejected"){ s.textContent="Antrag ABGELEHNT"; s.classList.add("rejected"); }
        else if(result.outcome==="tie"){ s.textContent="STIMMENGLEICHHEIT"; s.classList.add("neutral"); }
        else { s.textContent="Gewinner: "+(result.winner||""); s.classList.add("accepted"); }

        var d = result.options.map(function(o){
            var c=result.votes[o]||0, p=result.totalCast>0?Math.round(c/result.totalCast*100):0;
            return o+": "+c+" ("+p+"%)";
        }).join(" · ");
        document.getElementById("r-detail").textContent = result.topic + " — " + d;
        showScreen("v-result");
    }

    // ===================== STIMMKARTEN VOTER FUNCTIONS =====================
    var skVoteData = null;
    var skTimerInterval = null;
    var skSecondsLeft = 0;

    function buildSkNumpad(){
        var pad = document.getElementById("vk-numpad");
        if(pad.children.length > 0) return;
        var layout = [
            "2","3","4","5","6","7","8","9",
            "A","B","C","D","E","F",
            "G","H","J","K","M","N",
            "P","Q","R","S","T","U",
            "V","W","X","Y","Z","DEL",
            "SUBMIT"
        ];
        pad.innerHTML = "";
        layout.forEach(function(k){
            var btn = document.createElement("button");
            btn.type = "button";
            if(k === "DEL"){
                btn.innerHTML = "&#9003;";
                btn.className = "key-delete";
                btn.addEventListener("click", function(){ skDeleteChar(); });
            } else if(k === "SUBMIT"){
                btn.textContent = "OK";
                btn.className = "key-submit";
                btn.style.gridColumn = "span 3";
                btn.addEventListener("click", function(){ skSubmitCode(); });
            } else {
                btn.textContent = k;
                btn.addEventListener("click", function(){ skAddChar(k); });
            }
            pad.appendChild(btn);
        });
    }

    function skAddChar(ch){
        var inp = document.getElementById("vk-code-inp");
        var val = inp.value.replace(/-/g, "");
        if(val.length >= 6) return;
        val += ch;
        if(val.length > 3) inp.value = val.substring(0,3) + "-" + val.substring(3);
        else inp.value = val;
    }

    function skDeleteChar(){
        var inp = document.getElementById("vk-code-inp");
        var val = inp.value.replace(/-/g, "");
        if(val.length > 0) val = val.substring(0, val.length - 1);
        if(val.length > 3) inp.value = val.substring(0,3) + "-" + val.substring(3);
        else inp.value = val;
    }

    function skSubmitCode(){
        var inp = document.getElementById("vk-code-inp");
        var raw = inp.value.replace(/-/g, "").toUpperCase().trim();
        if(raw.length !== 6){
            showSkMsg("Bitte vollständigen 6-stelligen Code eingeben.", "error");
            return;
        }
        var code = raw.substring(0,3) + "-" + raw.substring(3);
        skCurrentCode = code;
        transport.send({ type:"sk-validate", code:code });
    }

    function showSkCodeEntry(data){
        skVoteData = data;
        document.getElementById("vk-topic").textContent = data.topic;
        var descEl = document.getElementById("vk-desc");
        descEl.textContent = data.description || "";
        descEl.style.display = data.description ? "block" : "none";
        document.getElementById("vk-code-inp").value = "";
        document.getElementById("vk-msg").classList.add("hidden");
        buildSkNumpad();
        var codeInp = document.getElementById("vk-code-inp");
        codeInp.onkeydown = function(e){
            if(e.key === "Enter") skSubmitCode();
        };
        codeInp.oninput = function(){
            var raw = this.value.replace(/[^A-Za-z2-9]/g, "").toUpperCase().substring(0, 6);
            var filtered = "";
            for(var i = 0; i < raw.length; i++){
                if("ABCDEFGHJKMNPQRSTUVWXYZ23456789".indexOf(raw[i]) !== -1) filtered += raw[i];
            }
            if(filtered.length > 3) this.value = filtered.substring(0,3) + "-" + filtered.substring(3);
            else this.value = filtered;
        };
        startSkTimer(data.timerSeconds || 0);
        showScreen("v-sk-code");
    }

    function handleSkValidation(data){
        if(data.valid){
            document.getElementById("vk-vote-topic").textContent = data.topic;
            var container = document.getElementById("vk-options");
            container.innerHTML = "";
            data.options.forEach(function(opt){
                var btn = document.createElement("button");
                btn.textContent = opt;
                btn.className = "btn-vote " + voteBtnCls(opt, data.voteType);
                btn.addEventListener("click", function(){
                    transport.send({ type:"sk-cast-vote", code:skCurrentCode, option:opt });
                });
                container.appendChild(btn);
            });
            showScreen("v-sk-vote");
        } else {
            if(data.reason === "already_used"){
                showSkMsg("Dieser Code wurde bereits für diese Abstimmung verwendet.", "error");
            } else {
                showSkMsg("Code ungültig. Bitte prüfen Sie Ihren Code.", "error");
            }
        }
    }

    function handleSkVoteResult(data){
        if(data.success){
            showScreen("v-sk-confirmed");
            setTimeout(function(){
                if(skVoteData){
                    skCurrentCode = null;
                    showSkCodeEntry(skVoteData);
                }
            }, 3000);
        } else {
            if(skVoteData) showSkCodeEntry(skVoteData);
            if(data.reason === "already_used"){
                showSkMsg("Dieser Code wurde bereits für diese Abstimmung verwendet.", "error");
            } else {
                showSkMsg("Fehler bei der Stimmabgabe.", "error");
            }
        }
    }

    function showSkMsg(text, type){
        var msg = document.getElementById("vk-msg");
        msg.textContent = text;
        msg.className = "sk-msg " + type;
        msg.classList.remove("hidden");
        setTimeout(function(){
            msg.classList.add("hidden");
            document.getElementById("vk-code-inp").value = "";
        }, 3000);
    }

    function startSkTimer(seconds){
        stopSkTimer();
        var timerEl = document.getElementById("vk-timer");
        if(!seconds || seconds <= 0){
            timerEl.classList.add("hidden");
            return;
        }
        skSecondsLeft = seconds;
        timerEl.classList.remove("hidden");
        updateSkTimer();
        skTimerInterval = setInterval(function(){
            skSecondsLeft--;
            if(skSecondsLeft <= 0){
                skSecondsLeft = 0;
                stopSkTimer();
            }
            updateSkTimer();
        }, 1000);
    }

    function stopSkTimer(){
        if(skTimerInterval){ clearInterval(skTimerInterval); skTimerInterval = null; }
    }

    function updateSkTimer(){
        var timerEl = document.getElementById("vk-timer");
        if(!timerEl) return;
        var m = Math.floor(skSecondsLeft / 60);
        var s = skSecondsLeft % 60;
        timerEl.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
        timerEl.className = "voter-timer";
        if(skSecondsLeft <= 0){
            timerEl.textContent = "Zeit abgelaufen!";
            timerEl.classList.add("danger");
        } else if(skSecondsLeft <= 10){
            timerEl.classList.add("danger");
        } else if(skSecondsLeft <= 30){
            timerEl.classList.add("warning");
        }
    }
}