// peer-mode.js — PeerJS/WebRTC Transport (implements Transport-Interface)
//
// Transport-Interface:
// {
//   init(config) → Promise
//   startSession(sessionData) → Promise<sessionId>
//   castVote(voteData) → Promise
//   onVoteReceived(callback)
//   onParticipantJoined(callback)
//   onParticipantLeft(callback)
//   destroy()
// }

import { randomCode } from './ui.js';

// ===================== HOST TRANSPORT =====================

export function createHostTransport(){
    var peer = null;
    var connections = new Map();
    var connDeviceMap = new Map();
    var disconnectedPeers = new Map();
    var deviceIdToPeer = new Map();
    var connLastSeen = new Map();
    var cleanupInterval = null;

    var _onConnection = null;
    var _onData = null;
    var _onDisconnect = null;
    var _onReconnect = null;

    function setupConnection(conn){
        conn.on("open", function(){
            connections.set(conn.peer, conn);
            connLastSeen.set(conn.peer, Date.now());
            if(_onConnection) _onConnection(conn);
        });

        conn.on("data", function(data){
            connLastSeen.set(conn.peer, Date.now());

            // Heartbeat
            if(data.type === "ping"){
                try{ conn.send({ type:"pong" }); }catch(e){}
                return;
            }

            // Voter registers with persistent device ID + fingerprint
            if(data.type === "register"){
                var devId = data.deviceId;
                if(devId){
                    connDeviceMap.set(conn.peer, devId);
                    var oldPeer = deviceIdToPeer.get(devId);
                    if(oldPeer && oldPeer !== conn.peer){
                        connections.delete(oldPeer);
                        connLastSeen.delete(oldPeer);
                    }
                    deviceIdToPeer.set(devId, conn.peer);
                    disconnectedPeers.delete(devId);
                }
                if(data.fingerprintId) connDeviceMap.set(conn.peer + ":fp", data.fingerprintId);
                if(_onConnection) _onConnection(conn);
            }

            if(_onData) _onData(conn, data);
        });

        conn.on("close", function(){
            connections.delete(conn.peer);
            connLastSeen.delete(conn.peer);
            var devId = connDeviceMap.get(conn.peer);
            if(devId){
                disconnectedPeers.set(devId, { disconnectedAt: Date.now() });
            }
            if(_onDisconnect) _onDisconnect(conn);
        });
    }

    var transport = {
        init: function(config){
            return new Promise(function(resolve, reject){
                var peerIdRetries = 0;
                var maxPeerIdRetries = 3;

                function createPeer(){
                    var peerId = "drk-" + randomCode(16);
                    peer = new Peer(peerId);
                    peer.on("open", function(){
                        // Start periodic cleanup
                        cleanupInterval = setInterval(function(){
                            var now = Date.now();
                            disconnectedPeers.forEach(function(info, devId){
                                if(now - info.disconnectedAt > 60000){
                                    disconnectedPeers.delete(devId);
                                    if(_onDisconnect) _onDisconnect(null);
                                }
                            });
                        }, 15000);
                        resolve(peerId);
                    });
                    peer.on("connection", function(conn){ setupConnection(conn); });
                    peer.on("error", function(err){
                        if(err.type === "unavailable-id"){
                            peerIdRetries++;
                            if(peerIdRetries <= maxPeerIdRetries){
                                peer.destroy();
                                createPeer();
                            } else {
                                reject(new Error("Peer-ID-Kollision nach " + maxPeerIdRetries + " Versuchen."));
                            }
                        } else {
                            reject(err);
                        }
                    });
                }

                createPeer();
            });
        },

        getPeerId: function(){
            return peer ? peer.id : null;
        },

        broadcast: function(msg){
            connections.forEach(function(conn){
                try{ conn.send(msg); }catch(e){}
            });
        },

        sendTo: function(conn, msg){
            try{ conn.send(msg); }catch(e){}
        },

        getConnectionCount: function(){
            return connections.size;
        },

        getDisconnectedCount: function(){
            return disconnectedPeers.size;
        },

        getConnDeviceMap: function(){
            return connDeviceMap;
        },

        onConnection: function(cb){ _onConnection = cb; },
        onData: function(cb){ _onData = cb; },
        onDisconnect: function(cb){ _onDisconnect = cb; },

        destroy: function(){
            if(cleanupInterval){ clearInterval(cleanupInterval); cleanupInterval = null; }
            if(peer){ peer.destroy(); peer = null; }
            connections.clear();
            connDeviceMap.clear();
            disconnectedPeers.clear();
            deviceIdToPeer.clear();
            connLastSeen.clear();
        }
    };

    return transport;
}

// ===================== VOTER TRANSPORT =====================

export function createVoterTransport(){
    var peer = null;
    var conn = null;
    var presenterPeerId = null;
    var sessionEnded = false;
    var isReconnecting = false;
    var reconnAttempt = 0;
    var reconnMaxAttempts = 5;
    var reconnDelays = [0, 2000, 5000, 10000, 20000];
    var reconnTimer = null;
    var heartbeatInterval = null;

    var _onData = null;
    var _onConnected = null;
    var _onDisconnected = null;
    var _onReconnecting = null;
    var _onReconnectFailed = null;

    function startHeartbeat(){
        stopHeartbeat();
        heartbeatInterval = setInterval(function(){
            if(conn && conn.open){
                try{ conn.send({ type:"ping" }); }catch(e){}
            }
        }, 15000);
    }

    function stopHeartbeat(){
        if(heartbeatInterval){ clearInterval(heartbeatInterval); heartbeatInterval = null; }
    }

    function setupDataHandler(c){
        c.on("data", function(data){
            if(data.type === "pong") return;
            if(_onData) _onData(data);
        });
    }

    function onConnectionEstablished(){
        isReconnecting = false;
        reconnAttempt = 0;
        if(reconnTimer){ clearTimeout(reconnTimer); reconnTimer = null; }
        startHeartbeat();
        if(_onConnected) _onConnected();
    }

    function onConnectionLost(){
        stopHeartbeat();
        if(sessionEnded) return;
        conn = null;
        startReconnect();
    }

    function startReconnect(){
        if(sessionEnded || isReconnecting) return;
        isReconnecting = true;
        reconnAttempt = 0;
        attemptReconnect();
    }

    function attemptReconnect(){
        if(sessionEnded) return;
        if(reconnAttempt >= reconnMaxAttempts){
            isReconnecting = false;
            if(_onReconnectFailed) _onReconnectFailed();
            return;
        }
        var delay = reconnDelays[reconnAttempt] || 20000;
        reconnAttempt++;
        if(_onReconnecting) _onReconnecting(reconnAttempt, reconnMaxAttempts);

        reconnTimer = setTimeout(function(){
            if(sessionEnded) return;
            if(!peer || peer.destroyed){
                peer = new Peer();
                peer.on("open", function(){ doConnect(); });
                peer.on("error", function(){ attemptReconnect(); });
            } else if(peer.disconnected){
                try{
                    peer.reconnect();
                    setTimeout(function(){
                        if(peer.open) doConnect();
                        else attemptReconnect();
                    }, 2000);
                }catch(e){
                    peer = new Peer();
                    peer.on("open", function(){ doConnect(); });
                    peer.on("error", function(){ attemptReconnect(); });
                }
            } else {
                doConnect();
            }
        }, delay);
    }

    function doConnect(){
        if(sessionEnded) return;
        try{
            conn = peer.connect(presenterPeerId, { reliable:true });
            conn.on("open", function(){ onConnectionEstablished(); });
            setupDataHandler(conn);
            conn.on("close", function(){ onConnectionLost(); });
            conn.on("error", function(){
                if(!isReconnecting) onConnectionLost();
            });
            setTimeout(function(){
                if(conn && !conn.open && isReconnecting){
                    try{ conn.close(); }catch(e){}
                    attemptReconnect();
                }
            }, 8000);
        }catch(e){
            attemptReconnect();
        }
    }

    var transport = {
        init: function(targetPeerId){
            presenterPeerId = targetPeerId;
            return new Promise(function(resolve, reject){
                peer = new Peer();
                peer.on("open", function(){
                    conn = peer.connect(presenterPeerId, { reliable:true });
                    conn.on("open", function(){ onConnectionEstablished(); });
                    setupDataHandler(conn);
                    conn.on("close", function(){ onConnectionLost(); });
                    conn.on("error", function(){
                        if(!isReconnecting) onConnectionLost();
                    });
                    resolve();
                });
                peer.on("error", function(err){
                    if(sessionEnded) return;
                    if(!isReconnecting) startReconnect();
                });
            });
        },

        send: function(msg){
            if(conn && conn.open){
                try{ conn.send(msg); }catch(e){}
            }
        },

        markSessionEnded: function(){
            sessionEnded = true;
            stopHeartbeat();
            if(reconnTimer){ clearTimeout(reconnTimer); reconnTimer = null; }
        },

        retryConnect: function(){
            startReconnect();
        },

        checkConnection: function(){
            if(!conn || !conn.open){
                if(!isReconnecting) startReconnect();
            }
        },

        onData: function(cb){ _onData = cb; },
        onConnected: function(cb){ _onConnected = cb; },
        onDisconnected: function(cb){ _onDisconnected = cb; },
        onReconnecting: function(cb){ _onReconnecting = cb; },
        onReconnectFailed: function(cb){ _onReconnectFailed = cb; },

        destroy: function(){
            sessionEnded = true;
            stopHeartbeat();
            if(reconnTimer){ clearTimeout(reconnTimer); reconnTimer = null; }
            if(peer){ peer.destroy(); peer = null; }
            conn = null;
        }
    };

    return transport;
}