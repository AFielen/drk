const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const QRCode = require("qrcode");

const PORT = process.env.PORT || 3000;

// --------------- State ---------------
const sessions = new Map();
const sseClients = new Map();

// --------------- Helpers ---------------
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "localhost";
}

function generateCode() {
    return crypto.randomBytes(3).toString("hex");
}

function broadcast(code, event, data) {
    const clients = sseClients.get(code);
    if (!clients) return;
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
        client.write(msg);
    }
}

function parseBody(req) {
    return new Promise((resolve) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                resolve({});
            }
        });
    });
}

function sendJSON(res, status, data) {
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(data));
}

function serveFile(res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end("Nicht gefunden");
            return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data);
    });
}

// --------------- Server ---------------
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = url.pathname;
    const method = req.method;

    // CORS preflight
    if (method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        });
        res.end();
        return;
    }

    // ---- Pages ----
    if (method === "GET" && p === "/") {
        serveFile(res, path.join(__dirname, "presenter.html"));
        return;
    }

    if (method === "GET" && /^\/vote\/[a-f0-9]+$/.test(p)) {
        serveFile(res, path.join(__dirname, "voter.html"));
        return;
    }

    // ---- API: Create session ----
    if (method === "POST" && p === "/api/session") {
        const body = await parseBody(req);
        const code = generateCode();
        sessions.set(code, {
            title: body.title || "Sitzung",
            voters: parseInt(body.voters) || 10,
            currentVote: null,
            history: [],
            votedIds: new Set(),
        });
        sseClients.set(code, new Set());
        sendJSON(res, 200, { code, ip: getLocalIP(), port: PORT });
        return;
    }

    // ---- API: Get session ----
    const mSession = p.match(/^\/api\/session\/([a-f0-9]+)$/);
    if (method === "GET" && mSession) {
        const s = sessions.get(mSession[1]);
        if (!s) return sendJSON(res, 404, { error: "Session nicht gefunden" });
        sendJSON(res, 200, {
            title: s.title,
            voters: s.voters,
            currentVote: s.currentVote
                ? {
                      topic: s.currentVote.topic,
                      description: s.currentVote.description,
                      type: s.currentVote.type,
                      options: s.currentVote.options,
                      totalCast: s.currentVote.totalCast,
                  }
                : null,
            historyCount: s.history.length,
        });
        return;
    }

    // ---- API: Start vote ----
    const mVote = p.match(/^\/api\/vote\/([a-f0-9]+)$/);
    if (method === "POST" && mVote) {
        const s = sessions.get(mVote[1]);
        if (!s) return sendJSON(res, 404, { error: "Session nicht gefunden" });
        const body = await parseBody(req);

        const options =
            body.type === "custom" && Array.isArray(body.options)
                ? body.options
                : ["Ja", "Nein", "Enthaltung"];

        const votes = {};
        options.forEach((o) => (votes[o] = 0));

        s.currentVote = {
            topic: body.topic || "Abstimmung",
            description: body.description || "",
            type: body.type || "yes-no",
            options,
            votes,
            totalCast: 0,
        };
        s.votedIds = new Set();

        broadcast(mVote[1], "vote-started", {
            topic: s.currentVote.topic,
            description: s.currentVote.description,
            type: s.currentVote.type,
            options,
        });

        sendJSON(res, 200, { ok: true });
        return;
    }

    // ---- API: Cast vote ----
    const mCast = p.match(/^\/api\/cast\/([a-f0-9]+)$/);
    if (method === "POST" && mCast) {
        const s = sessions.get(mCast[1]);
        if (!s) return sendJSON(res, 404, { error: "Session nicht gefunden" });
        if (!s.currentVote)
            return sendJSON(res, 400, { error: "Keine aktive Abstimmung" });

        const body = await parseBody(req);
        if (!body.voterId || !body.option)
            return sendJSON(res, 400, { error: "Ungueltige Anfrage" });
        if (s.votedIds.has(body.voterId))
            return sendJSON(res, 400, { error: "Bereits abgestimmt" });
        if (!s.currentVote.options.includes(body.option))
            return sendJSON(res, 400, { error: "Ungueltige Option" });

        s.votedIds.add(body.voterId);
        s.currentVote.votes[body.option]++;
        s.currentVote.totalCast++;

        broadcast(mCast[1], "vote-update", {
            totalCast: s.currentVote.totalCast,
            votes: s.currentVote.votes,
        });

        sendJSON(res, 200, { ok: true });
        return;
    }

    // ---- API: Close vote ----
    const mClose = p.match(/^\/api\/close\/([a-f0-9]+)$/);
    if (method === "POST" && mClose) {
        const s = sessions.get(mClose[1]);
        if (!s || !s.currentVote)
            return sendJSON(res, 400, { error: "Keine aktive Abstimmung" });

        const v = s.currentVote;
        const result = {
            topic: v.topic,
            description: v.description,
            type: v.type,
            options: v.options,
            votes: { ...v.votes },
            totalCast: v.totalCast,
            totalVoters: s.voters,
        };

        if (v.type === "yes-no") {
            const yes = v.votes["Ja"] || 0;
            const no = v.votes["Nein"] || 0;
            result.outcome =
                yes > no ? "accepted" : no > yes ? "rejected" : "tie";
        } else {
            let max = 0;
            let winners = [];
            for (const [key, val] of Object.entries(v.votes)) {
                if (val > max) {
                    max = val;
                    winners = [key];
                } else if (val === max) {
                    winners.push(key);
                }
            }
            result.outcome = winners.length === 1 ? "custom-winner" : "tie";
            if (winners.length === 1) result.winner = winners[0];
        }

        s.history.push(result);
        s.currentVote = null;

        broadcast(mClose[1], "vote-closed", result);
        sendJSON(res, 200, result);
        return;
    }

    // ---- API: End session ----
    const mEnd = p.match(/^\/api\/end\/([a-f0-9]+)$/);
    if (method === "POST" && mEnd) {
        broadcast(mEnd[1], "session-ended", {});
        sessions.delete(mEnd[1]);
        const clients = sseClients.get(mEnd[1]);
        if (clients) {
            for (const c of clients) c.end();
        }
        sseClients.delete(mEnd[1]);
        sendJSON(res, 200, { ok: true });
        return;
    }

    // ---- API: QR code as SVG ----
    const mQR = p.match(/^\/api\/qr\/([a-f0-9]+)$/);
    if (method === "GET" && mQR) {
        const code = mQR[1];
        const ip = getLocalIP();
        const voteURL = `http://${ip}:${PORT}/vote/${code}`;
        try {
            const svg = await QRCode.toString(voteURL, {
                type: "svg",
                width: 300,
                margin: 2,
                color: { dark: "#e30613", light: "#ffffff" },
            });
            res.writeHead(200, {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "no-cache",
            });
            res.end(svg);
        } catch {
            res.writeHead(500);
            res.end("QR generation failed");
        }
        return;
    }

    // ---- SSE ----
    const mSSE = p.match(/^\/api\/events\/([a-f0-9]+)$/);
    if (method === "GET" && mSSE) {
        const code = mSSE[1];
        if (!sessions.has(code)) {
            res.writeHead(404);
            res.end("Session nicht gefunden");
            return;
        }

        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
        });
        res.write("event: connected\ndata: {}\n\n");

        if (!sseClients.has(code)) sseClients.set(code, new Set());
        sseClients.get(code).add(res);

        req.on("close", () => {
            const clients = sseClients.get(code);
            if (clients) clients.delete(res);
        });
        return;
    }

    // ---- 404 ----
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Nicht gefunden");
});

const ip = getLocalIP();
server.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("  ╔══════════════════════════════════════════╗");
    console.log("  ║       DRK Vereinsabstimmung Server       ║");
    console.log("  ╠══════════════════════════════════════════╣");
    console.log(`  ║  Lokal:     http://localhost:${PORT}        ║`);
    console.log(`  ║  Netzwerk:  http://${ip}:${PORT}    ║`);
    console.log("  ╚══════════════════════════════════════════╝");
    console.log("");
});
