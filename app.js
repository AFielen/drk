(function () {
    "use strict";

    // --- State ---
    let session = null;
    let currentVote = null;
    let history = [];

    // --- DOM Elements ---
    const el = {
        sessionSetup: document.getElementById("session-setup"),
        meetingTitle: document.getElementById("meeting-title"),
        voterCount: document.getElementById("voter-count"),
        startSessionBtn: document.getElementById("start-session-btn"),

        activeSession: document.getElementById("active-session"),
        sessionTitle: document.getElementById("session-title"),
        voterBadge: document.getElementById("voter-badge"),
        endSessionBtn: document.getElementById("end-session-btn"),

        newVoteSection: document.getElementById("new-vote-section"),
        voteTopic: document.getElementById("vote-topic"),
        voteDescription: document.getElementById("vote-description"),
        customOptionsSection: document.getElementById("custom-options"),
        customOptionsInput: document.getElementById("custom-options-input"),
        startVoteBtn: document.getElementById("start-vote-btn"),

        activeVote: document.getElementById("active-vote"),
        activeVoteTopic: document.getElementById("active-vote-topic"),
        activeVoteDescription: document.getElementById("active-vote-description"),
        votesCast: document.getElementById("votes-cast"),
        votesTotal: document.getElementById("votes-total"),
        voteProgressBar: document.getElementById("vote-progress-bar"),
        voteButtons: document.getElementById("vote-buttons"),
        closeVoteBtn: document.getElementById("close-vote-btn"),
        cancelVoteBtn: document.getElementById("cancel-vote-btn"),

        voteResult: document.getElementById("vote-result"),
        resultTopic: document.getElementById("result-topic"),
        resultBars: document.getElementById("result-bars"),
        resultSummary: document.getElementById("result-summary"),
        nextVoteBtn: document.getElementById("next-vote-btn"),

        historySection: document.getElementById("history-section"),
        historyList: document.getElementById("history-list"),
    };

    // --- Vote type radio buttons ---
    const voteTypeRadios = document.querySelectorAll('input[name="vote-type"]');
    voteTypeRadios.forEach(function (radio) {
        radio.addEventListener("change", function () {
            if (this.value === "custom") {
                el.customOptionsSection.classList.remove("hidden");
            } else {
                el.customOptionsSection.classList.add("hidden");
            }
        });
    });

    // --- Session Management ---
    el.startSessionBtn.addEventListener("click", function () {
        var title = el.meetingTitle.value.trim();
        var voters = parseInt(el.voterCount.value, 10);

        if (!title) {
            alert("Bitte geben Sie einen Sitzungstitel ein.");
            return;
        }
        if (!voters || voters < 1) {
            alert("Bitte geben Sie eine gültige Anzahl an Stimmberechtigten ein.");
            return;
        }

        session = {
            title: title,
            voters: voters,
        };
        history = [];

        el.sessionTitle.textContent = title;
        el.voterBadge.textContent = voters + " Stimmberechtigte";

        el.sessionSetup.classList.add("hidden");
        el.activeSession.classList.remove("hidden");
        showNewVoteForm();
    });

    el.endSessionBtn.addEventListener("click", function () {
        if (!confirm("Sitzung wirklich beenden? Alle Daten gehen verloren.")) {
            return;
        }
        session = null;
        currentVote = null;
        history = [];

        el.activeSession.classList.add("hidden");
        el.sessionSetup.classList.remove("hidden");
        el.meetingTitle.value = "";
        el.voterCount.value = "10";
        updateHistoryDisplay();
    });

    // --- Vote Creation ---
    el.startVoteBtn.addEventListener("click", function () {
        var topic = el.voteTopic.value.trim();
        if (!topic) {
            alert("Bitte geben Sie ein Abstimmungsthema ein.");
            return;
        }

        var description = el.voteDescription.value.trim();
        var voteType = document.querySelector('input[name="vote-type"]:checked').value;
        var options;

        if (voteType === "yes-no") {
            options = ["Ja", "Nein", "Enthaltung"];
        } else {
            var raw = el.customOptionsInput.value.trim();
            if (!raw) {
                alert("Bitte geben Sie mindestens zwei Optionen ein.");
                return;
            }
            options = raw
                .split("\n")
                .map(function (s) { return s.trim(); })
                .filter(function (s) { return s.length > 0; });
            if (options.length < 2) {
                alert("Bitte geben Sie mindestens zwei Optionen ein.");
                return;
            }
        }

        currentVote = {
            topic: topic,
            description: description,
            type: voteType,
            options: options,
            votes: {},
            totalCast: 0,
        };

        // Initialize vote counts
        options.forEach(function (opt) {
            currentVote.votes[opt] = 0;
        });

        showActiveVote();
    });

    // --- Voting ---
    function castVote(option) {
        if (!currentVote || currentVote.totalCast >= session.voters) return;

        currentVote.votes[option]++;
        currentVote.totalCast++;
        updateVoteProgress();

        if (currentVote.totalCast >= session.voters) {
            closeVote();
        }
    }

    el.closeVoteBtn.addEventListener("click", function () {
        if (currentVote.totalCast === 0) {
            alert("Es wurde noch keine Stimme abgegeben.");
            return;
        }
        closeVote();
    });

    el.cancelVoteBtn.addEventListener("click", function () {
        if (!confirm("Abstimmung wirklich abbrechen?")) return;
        currentVote = null;
        showNewVoteForm();
    });

    el.nextVoteBtn.addEventListener("click", function () {
        showNewVoteForm();
    });

    // --- Close vote and show results ---
    function closeVote() {
        var result = buildResult();
        history.push(result);
        showResult(result);
        updateHistoryDisplay();
        currentVote = null;
    }

    function buildResult() {
        var topic = currentVote.topic;
        var votes = Object.assign({}, currentVote.votes);
        var totalCast = currentVote.totalCast;
        var type = currentVote.type;
        var outcome;

        if (type === "yes-no") {
            var yes = votes["Ja"] || 0;
            var no = votes["Nein"] || 0;
            if (yes > no) {
                outcome = "accepted";
            } else if (no > yes) {
                outcome = "rejected";
            } else {
                outcome = "tie";
            }
        } else {
            // Find winner among custom options
            var max = 0;
            var winners = [];
            Object.keys(votes).forEach(function (key) {
                if (votes[key] > max) {
                    max = votes[key];
                    winners = [key];
                } else if (votes[key] === max) {
                    winners.push(key);
                }
            });
            outcome = winners.length === 1 ? "custom-winner" : "tie";
        }

        return {
            topic: topic,
            description: currentVote.description,
            type: type,
            options: currentVote.options.slice(),
            votes: votes,
            totalCast: totalCast,
            totalVoters: session.voters,
            outcome: outcome,
        };
    }

    // --- UI Updates ---
    function showNewVoteForm() {
        el.newVoteSection.classList.remove("hidden");
        el.activeVote.classList.add("hidden");
        el.voteResult.classList.add("hidden");
        el.voteTopic.value = "";
        el.voteDescription.value = "";
        el.customOptionsInput.value = "";
        document.querySelector('input[name="vote-type"][value="yes-no"]').checked = true;
        el.customOptionsSection.classList.add("hidden");
    }

    function showActiveVote() {
        el.newVoteSection.classList.add("hidden");
        el.voteResult.classList.add("hidden");
        el.activeVote.classList.remove("hidden");

        el.activeVoteTopic.textContent = currentVote.topic;
        if (currentVote.description) {
            el.activeVoteDescription.textContent = currentVote.description;
            el.activeVoteDescription.classList.remove("hidden");
        } else {
            el.activeVoteDescription.classList.add("hidden");
        }

        el.votesTotal.textContent = session.voters;
        updateVoteProgress();

        // Create vote buttons
        el.voteButtons.innerHTML = "";
        currentVote.options.forEach(function (option) {
            var btn = document.createElement("button");
            btn.textContent = option;
            btn.className = "btn btn-vote";

            if (currentVote.type === "yes-no") {
                if (option === "Ja") btn.classList.add("yes");
                else if (option === "Nein") btn.classList.add("no");
                else btn.classList.add("abstain");
            } else {
                btn.classList.add("custom-option");
            }

            btn.addEventListener("click", function () {
                castVote(option);
            });
            el.voteButtons.appendChild(btn);
        });
    }

    function updateVoteProgress() {
        var cast = currentVote.totalCast;
        var total = session.voters;
        el.votesCast.textContent = cast;
        var pct = total > 0 ? (cast / total) * 100 : 0;
        el.voteProgressBar.style.width = pct + "%";
    }

    function showResult(result) {
        el.activeVote.classList.add("hidden");
        el.voteResult.classList.remove("hidden");

        el.resultTopic.textContent = result.topic;

        // Build result bars
        el.resultBars.innerHTML = "";
        var maxVotes = Math.max.apply(null, result.options.map(function (o) { return result.votes[o]; }));

        result.options.forEach(function (option) {
            var count = result.votes[option];
            var pct = result.totalCast > 0 ? (count / result.totalCast) * 100 : 0;

            var group = document.createElement("div");
            group.className = "result-bar-group";

            var label = document.createElement("div");
            label.className = "result-bar-label";
            label.innerHTML =
                "<span>" + escapeHtml(option) + "</span>" +
                "<span>" + count + " (" + Math.round(pct) + "%)</span>";

            var track = document.createElement("div");
            track.className = "result-bar-track";

            var fill = document.createElement("div");
            fill.className = "result-bar-fill";

            if (result.type === "yes-no") {
                if (option === "Ja") fill.classList.add("yes");
                else if (option === "Nein") fill.classList.add("no");
                else fill.classList.add("abstain");
            } else {
                fill.classList.add("custom");
            }

            // Animate bar width
            fill.style.width = "0%";
            track.appendChild(fill);
            group.appendChild(label);
            group.appendChild(track);
            el.resultBars.appendChild(group);

            requestAnimationFrame(function () {
                fill.style.width = pct + "%";
            });
        });

        // Summary text
        el.resultSummary.className = "result-summary";
        if (result.outcome === "accepted") {
            el.resultSummary.textContent = "Antrag ANGENOMMEN";
            el.resultSummary.classList.add("accepted");
        } else if (result.outcome === "rejected") {
            el.resultSummary.textContent = "Antrag ABGELEHNT";
            el.resultSummary.classList.add("rejected");
        } else if (result.outcome === "tie") {
            el.resultSummary.textContent = "STIMMENGLEICHHEIT";
            el.resultSummary.classList.add("neutral");
        } else {
            // custom winner
            var winner = "";
            var max = 0;
            Object.keys(result.votes).forEach(function (key) {
                if (result.votes[key] > max) {
                    max = result.votes[key];
                    winner = key;
                }
            });
            el.resultSummary.textContent = "Gewinner: " + winner;
            el.resultSummary.classList.add("accepted");
        }
    }

    function updateHistoryDisplay() {
        if (history.length === 0) {
            el.historyList.innerHTML = '<p class="empty-state">Noch keine Abstimmungen durchgeführt.</p>';
            return;
        }

        el.historyList.innerHTML = "";
        history.forEach(function (item, index) {
            var div = document.createElement("div");
            div.className = "history-item";

            var topicSpan = document.createElement("span");
            topicSpan.className = "history-item-topic";
            topicSpan.textContent = (index + 1) + ". " + item.topic;

            var resultSpan = document.createElement("span");
            resultSpan.className = "history-item-result";

            if (item.outcome === "accepted") {
                resultSpan.textContent = "Angenommen";
                resultSpan.classList.add("accepted");
            } else if (item.outcome === "rejected") {
                resultSpan.textContent = "Abgelehnt";
                resultSpan.classList.add("rejected");
            } else if (item.outcome === "tie") {
                resultSpan.textContent = "Gleichstand";
                resultSpan.classList.add("neutral");
            } else {
                var winner = "";
                var max = 0;
                Object.keys(item.votes).forEach(function (key) {
                    if (item.votes[key] > max) {
                        max = item.votes[key];
                        winner = key;
                    }
                });
                resultSpan.textContent = winner;
                resultSpan.classList.add("accepted");
            }

            var details = document.createElement("div");
            details.className = "history-item-details";
            var parts = item.options.map(function (o) {
                return o + ": " + item.votes[o];
            });
            details.textContent = parts.join(" | ") + " (Gesamt: " + item.totalCast + "/" + item.totalVoters + ")";

            div.appendChild(topicSpan);
            div.appendChild(resultSpan);
            div.appendChild(details);
            el.historyList.appendChild(div);
        });
    }

    function escapeHtml(str) {
        var div = document.createElement("div");
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }
})();
