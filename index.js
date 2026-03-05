const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const nodes7 = require("nodes7");
const conn = new nodes7();

/* ================= WEB CONFIG ================= */

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");

server.listen(3000, () => {
    console.log("Web server running at http://localhost:3000");
});

app.get("/", (req, res) => res.render("home"));

/* ================= PLC CONFIG ================= */

const PLC_CONFIG = {
    port: 102,
    host: "192.168.0.2",
    rack: 0,
    slot: 1,
    timeout: 3000
};

const TAGS = {
    HMI1: 'DB1,REAL0',
    HMI2: 'DB1,REAL4',
    HMI3: 'DB1,REAL8',
    HMI4: 'DB1,REAL12',
    HMI5: 'DB1,REAL16'
};

const SCAN_INTERVAL = 1000;
const RECONNECT_DELAY = 5000;
const WATCHDOG_LIMIT = 5;

/* ================= STATE ================= */

let connecting = false;
let connected = false;
let lastHeartbeat = null;
let heartbeatLost = 0;

/* ================= CONNECT PLC ================= */

function connectPLC() {

    if (connecting || connected) return;

    connecting = true;
    console.log("Connecting PLC...");

    conn.initiateConnection(PLC_CONFIG, (err) => {

        connecting = false;

        if (err) {
            console.log("PLC connect fail:", err);
            return setTimeout(connectPLC, RECONNECT_DELAY);
        }

        console.log("PLC connected");
        connected = true;

        conn.setTranslationCB(tag => TAGS[tag]);
        conn.addItems(Object.keys(TAGS));

        scanLoop();
    });
}

/* ================= SCAN LOOP ================= */

function scanLoop() {

    if (!connected) return;

    conn.readAllItems((err, values) => {

        if (err) {
            console.log("PLC read error:", err);
            connected = false;
            return setTimeout(connectPLC, RECONNECT_DELAY);
        }

        processPLC(values);
        setTimeout(scanLoop, SCAN_INTERVAL);
    });
}

/* ================= PROCESS DATA ================= */

function processPLC(values) {

    // Watchdog heartbeat
    if (values.heartbeat === lastHeartbeat) {
        heartbeatLost++;
    } else {
        heartbeatLost = 0;
    }

    lastHeartbeat = values.heartbeat;

    if (heartbeatLost > WATCHDOG_LIMIT) {
        console.log("PLC heartbeat lost → reconnect");
        connected = false;
        conn.dropConnection();
        return setTimeout(connectPLC, RECONNECT_DELAY);
    }

    // Gửi realtime lên web
    io.emit("plcData", values);
}

/* ================= SOCKET CLIENT ================= */

io.on("connection", socket => {
    console.log("Browser connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Browser disconnected:", socket.id);
    });
});

/* ================= ERROR GUARD ================= */

process.on('uncaughtException', err => {
    console.log("UNCAUGHT:", err);
});

process.on('unhandledRejection', err => {
    console.log("PROMISE:", err);
});

/* ================= START ================= */

connectPLC();