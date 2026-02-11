// ui.js — DOM-Manipulation, Modals, QR-Code, Ergebnis-Darstellung, Timer

export function $(id){ return document.getElementById(id); }

export function esc(s){
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
}

export function barCls(opt, type){
    if(type==="yes-no"){ if(opt==="Ja")return"ja"; if(opt==="Nein")return"nein"; return"enthaltung"; }
    return "custom";
}

export function randomCode(len){
    var c="abcdefghijklmnopqrstuvwxyz0123456789", r="";
    if(window.crypto && window.crypto.getRandomValues){
        var arr = new Uint8Array(len);
        window.crypto.getRandomValues(arr);
        for(var i=0;i<len;i++) r+=c[arr[i]%c.length];
    } else {
        for(var i=0;i<len;i++) r+=c[Math.floor(Math.random()*c.length)];
    }
    return r;
}

// ---- QR Code Rendering ----
export function renderQrCode(canvas, url){
    try {
        var qr = qrcode(0, 'M');
        qr.addData(url);
        qr.make();
        var modules = qr.getModuleCount();
        var size = 220;
        var cellSize = size / modules;
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#e30613';
        for(var row = 0; row < modules; row++){
            for(var col = 0; col < modules; col++){
                if(qr.isDark(row, col)){
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize + 0.5, cellSize + 0.5);
                }
            }
        }
    } catch(e) {
        canvas.style.display = "none";
    }
}

// ---- Timer Display ----
export function formatTimerTime(sec){
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

export function updateTimerClasses(el, secondsLeft){
    el.className = el.className.replace(/ ?(warning|danger)/g, "");
    if(secondsLeft <= 10) el.classList.add("danger");
    else if(secondsLeft <= 30) el.classList.add("warning");
}

// ---- Presenter Result Display ----
export function renderResultBars(container, result){
    var html = "";
    result.options.forEach(function(opt){
        var count = result.votes[opt]||0;
        var pct = result.totalCast>0 ? (count/result.totalCast*100) : 0;
        html += '<div class="result-bar-group"><div class="result-bar-label"><span>'+esc(opt)+'</span><span>'+count+' ('+Math.round(pct)+'%)</span></div><div class="result-bar-track"><div class="result-bar-fill '+barCls(opt,result.type)+'" style="width:'+pct+'%"></div></div></div>';
    });
    container.innerHTML = html;
}

export function renderLiveBars(container, currentVote){
    if(!currentVote) return;
    var cast = currentVote.totalCast;
    var html = "";
    currentVote.options.forEach(function(opt){
        var count = currentVote.votes[opt]||0;
        var pct = cast > 0 ? (count/cast*100) : 0;
        html += '<div class="live-bar-group"><div class="live-bar-label"><span>'+esc(opt)+'</span><span>'+count+'</span></div><div class="live-bar-track"><div class="live-bar-fill '+barCls(opt,currentVote.type)+'" style="width:'+pct+'%"></div></div></div>';
    });
    container.innerHTML = html;
}

// ---- End Session Modal ----
export function showEndModal(hasHistory){
    var overlay = $("end-modal-overlay");
    var pdfHint = $("end-modal-pdf-hint");
    var pdfBtn = $("end-modal-pdf");
    pdfHint.style.display = hasHistory ? "" : "none";
    pdfBtn.style.display = hasHistory ? "" : "none";
    overlay.style.display = "flex";
}

export function hideEndModal(){
    $("end-modal-overlay").style.display = "none";
}

// ---- Help Popover ----
export function initHelpPopover(){
    var btn = $("help-mode-btn"), pop = $("help-mode-pop"), cls = $("help-mode-close");
    btn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        pop.classList.toggle("open");
    });
    cls.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        pop.classList.remove("open");
    });
    pop.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
    });
    document.addEventListener("click", function(e){
        if(!pop.contains(e.target) && e.target !== btn) pop.classList.remove("open");
    });
}

// ---- Info Box Content ----
export function updateInfoBoxes(sessionMode){
    var wc = $("welcome-info-content");
    var vc = $("vote-info-content");
    if(sessionMode === "stimmkarten"){
        wc.innerHTML = '<h3>Willkommen beim digitalen Abstimmungssystem</h3>'
            + '<p>Mit diesem Tool können Sie Abstimmungen in Ihrer Versammlung im Stimmkarten-Modus durchführen. So funktioniert es:</p>'
            + '<ul>'
            + '<li>Richten Sie unten Ihre Versammlung ein und wählen Sie den <strong>Stimmkarten-Modus</strong>.</li>'
            + '<li>Generieren Sie <strong>Token-Codes</strong> für alle Stimmberechtigten und drucken Sie diese aus.</li>'
            + '<li>Verteilen Sie die ausgedruckten Codes an die Mitglieder.</li>'
            + '<li>Verbinden Sie ein oder mehrere <strong>Abstimmungsgeräte</strong> (Tablets/Smartphones) per QR-Code.</li>'
            + '<li>Die Mitglieder geben ihren Code am Gerät ein und stimmen ab – das Gerät wird danach automatisch für die nächste Person zurückgesetzt.</li>'
            + '</ul>'
            + '<p style="margin-top:.5rem">Jeder Code kann pro Abstimmungsrunde <strong>nur einmal</strong> verwendet werden. Alle Stimmen bleiben <strong>anonym</strong> – es ist nicht nachvollziehbar, welcher Code wie abgestimmt hat.</p>';
        vc.innerHTML = '<h3>So funktioniert die Abstimmung (Stimmkarten-Modus)</h3>'
            + '<ul>'
            + '<li>Geben Sie oben das <strong>Thema</strong> und optional eine Beschreibung ein.</li>'
            + '<li>Wählen Sie die <strong>Abstimmungsart</strong>: Ja/Nein/Enthaltung oder eigene Optionen.</li>'
            + '<li>Optional: Aktivieren Sie ein <strong>Zeitlimit</strong> – nach Ablauf wird die Abstimmung automatisch geschlossen.</li>'
            + '<li>Nach dem Start erscheint auf den Stimmkarten-Geräten die <strong>Code-Eingabe</strong>. Die Mitglieder geben ihren Token-Code ein und stimmen ab.</li>'
            + '<li>Der Fortschritt zeigt an, wie viele <strong>Codes eingelöst</strong> wurden.</li>'
            + '<li>Sie können die Abstimmung jederzeit manuell schließen oder warten, bis alle abgestimmt haben bzw. das Zeitlimit abläuft.</li>'
            + '</ul>'
            + '<p style="margin-top:.5rem">Jeder Token-Code ist pro Runde <strong>einmalig</strong> verwendbar. In der nächsten Abstimmungsrunde kann derselbe Code erneut genutzt werden.</p>';
    } else {
        wc.innerHTML = '<h3>Willkommen beim digitalen Abstimmungssystem</h3>'
            + '<p>Mit diesem Tool können Sie Abstimmungen in Ihrer Versammlung schnell und einfach digital durchführen. So funktioniert es:</p>'
            + '<ul>'
            + '<li>Richten Sie unten Ihre Versammlung ein und starten Sie diese.</li>'
            + '<li>Für jede Abstimmung wird ein <strong>QR-Code</strong> auf dem Bildschirm angezeigt.</li>'
            + '<li>Die Mitglieder scannen den QR-Code mit dem Smartphone und stimmen direkt ab.</li>'
            + '<li>Das Ergebnis erscheint in <strong>Echtzeit</strong> auf dem Bildschirm.</li>'
            + '</ul>'
            + '<p style="margin-top:.5rem">Alle Stimmen werden <strong>vollständig anonym</strong> abgegeben. Es werden keine persönlichen Daten gespeichert und keine Stimme kann einer Person zugeordnet werden. Die Kommunikation läuft direkt zwischen den Geräten – ohne Server, ohne Datenbank.</p>';
        vc.innerHTML = '<h3>So funktioniert die Abstimmung</h3>'
            + '<ul>'
            + '<li>Geben Sie oben das <strong>Thema</strong> und optional eine Beschreibung ein.</li>'
            + '<li>Wählen Sie die <strong>Abstimmungsart</strong>: Ja/Nein/Enthaltung oder eigene Optionen.</li>'
            + '<li>Optional: Aktivieren Sie ein <strong>Zeitlimit</strong> – nach Ablauf wird die Abstimmung automatisch geschlossen.</li>'
            + '<li>Nach dem Start erscheint ein <strong>QR-Code</strong> auf dem Bildschirm. Die Mitglieder scannen diesen mit dem Smartphone und geben ihre Stimme ab.</li>'
            + '<li>Die Ergebnisse werden <strong>live</strong> auf dem Bildschirm aktualisiert.</li>'
            + '<li>Sie können die Abstimmung jederzeit manuell schließen oder warten, bis alle abgestimmt haben bzw. das Zeitlimit abläuft.</li>'
            + '</ul>'
            + '<p style="margin-top:.5rem">Jede Stimme ist <strong>anonym</strong> – es ist nicht erkennbar, wer wie abgestimmt hat. Jedes Gerät kann pro Abstimmungsrunde nur einmal abstimmen.</p>';
    }
}

// ---- Browser Fingerprint ----
export function generateDeviceFingerprint(){
    return new Promise(function(resolve){
        var signals = [];

        // 1. Screen properties
        signals.push("scr:" + screen.width + "x" + screen.height + "x" + screen.availHeight + "x" + screen.colorDepth);
        signals.push("dpr:" + (window.devicePixelRatio || 1));

        // 2. Hardware signals
        signals.push("cores:" + (navigator.hardwareConcurrency || "?"));
        signals.push("mem:" + (navigator.deviceMemory || "?"));

        // 3. Browser/platform signals
        signals.push("lang:" + (navigator.language || ""));
        signals.push("langs:" + (navigator.languages ? navigator.languages.join(",") : ""));
        signals.push("tz:" + (Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : ""));
        signals.push("touch:" + (navigator.maxTouchPoints || 0));
        signals.push("plat:" + (navigator.platform || ""));

        // 4. Canvas fingerprint
        try {
            var cv = document.createElement("canvas");
            cv.width = 280; cv.height = 60;
            var cx = cv.getContext("2d");
            cx.fillStyle = "#f0e68c";
            cx.fillRect(0, 0, 280, 60);
            cx.fillStyle = "#c82124";
            cx.font = "18px Arial";
            cx.fillText("DRK Fingerprint Test 2026!", 2, 20);
            cx.fillStyle = "rgba(0,120,255,0.6)";
            cx.font = "bold 14px Times New Roman";
            cx.fillText("Canvas FP \ud83d\ude00", 4, 45);
            cx.strokeStyle = "#2a4d8f";
            cx.beginPath();
            cx.arc(200, 30, 20, 0, Math.PI * 2);
            cx.stroke();
            signals.push("canvas:" + cv.toDataURL());
        } catch(e){
            signals.push("canvas:err");
        }

        // 5. WebGL renderer
        try {
            var gl = document.createElement("canvas").getContext("webgl");
            if(gl){
                var dbg = gl.getExtension("WEBGL_debug_renderer_info");
                if(dbg){
                    signals.push("glv:" + gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL));
                    signals.push("glr:" + gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
                } else {
                    signals.push("glv:" + gl.getParameter(gl.VENDOR));
                    signals.push("glr:" + gl.getParameter(gl.RENDERER));
                }
            } else {
                signals.push("gl:none");
            }
        } catch(e){
            signals.push("gl:err");
        }

        // 6. Font detection
        try {
            var testFonts = ["Arial","Verdana","Times New Roman","Courier New","Georgia",
                "Palatino","Garamond","Comic Sans MS","Impact","Lucida Console",
                "Tahoma","Trebuchet MS","Arial Black","Helvetica","Futura",
                "Calibri","Cambria","Consolas","Segoe UI","Roboto"];
            var span = document.createElement("span");
            span.style.cssText = "position:absolute;left:-9999px;font-size:72px;visibility:hidden";
            span.textContent = "mmmmmmmmmmlli";
            document.body.appendChild(span);
            span.style.fontFamily = "monospace";
            var baseW = span.offsetWidth;
            var baseH = span.offsetHeight;
            var fontBits = "";
            testFonts.forEach(function(f){
                span.style.fontFamily = '"' + f + '", monospace';
                fontBits += (span.offsetWidth !== baseW || span.offsetHeight !== baseH) ? "1" : "0";
            });
            document.body.removeChild(span);
            signals.push("fonts:" + fontBits);
        } catch(e){
            signals.push("fonts:err");
        }

        // 7. Audio fingerprint (no audible sound - gain = 0)
        var audioReady = new Promise(function(res){
            try {
                var actx = new (window.AudioContext || window.webkitAudioContext)();
                var osc = actx.createOscillator();
                osc.type = "triangle";
                osc.frequency.value = 10000;
                var comp = actx.createDynamicsCompressor();
                comp.threshold.value = -50;
                comp.knee.value = 40;
                comp.ratio.value = 12;
                comp.attack.value = 0;
                comp.release.value = 0.25;
                var gain = actx.createGain();
                gain.gain.value = 0; // silent
                var analyser = actx.createAnalyser();
                analyser.fftSize = 256;
                osc.connect(comp);
                comp.connect(analyser);
                analyser.connect(gain);
                gain.connect(actx.destination);
                osc.start(0);
                setTimeout(function(){
                    var data = new Float32Array(analyser.frequencyBinCount);
                    analyser.getFloatFrequencyData(data);
                    var sum = 0;
                    for(var i = 0; i < data.length; i++) sum += Math.abs(data[i]);
                    signals.push("audio:" + sum.toFixed(4));
                    osc.stop();
                    actx.close();
                    res();
                }, 100);
            } catch(e){
                signals.push("audio:err");
                res();
            }
        });

        audioReady.then(function(){
            // Hash all signals with SHA-256
            var raw = signals.join("|");
            var encoder = new TextEncoder();
            var data = encoder.encode(raw);
            crypto.subtle.digest("SHA-256", data).then(function(buf){
                var arr = new Uint8Array(buf);
                var hex = "";
                for(var i = 0; i < arr.length; i++){
                    hex += ("0" + arr[i].toString(16)).slice(-2);
                }
                resolve(hex);
            }).catch(function(){
                // Fallback: simple hash if crypto.subtle unavailable (http)
                var hash = 0;
                for(var i = 0; i < raw.length; i++){
                    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
                    hash |= 0;
                }
                resolve("fallback-" + Math.abs(hash).toString(36));
            });
        });
    });
}

// ---- Voter Button Class ----
export function voteBtnCls(opt, type){
    if(type==="yes-no"){ if(opt==="Ja")return"ja"; if(opt==="Nein")return"nein"; return"enthaltung"; }
    return "custom";
}