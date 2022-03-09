"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSession = exports.sendFileMessage = exports.sendMessage = exports.connectToWhatsApp = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const index_1 = require("../index");
const Utils_1 = require("../Utils");
const constants_1 = require("./constants");
// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const clients = [];
// start a connection
const connectToWhatsApp = async (req, res) => {
    // fetch latest version of WA Web
    const { version, isLatest } = await (0, index_1.fetchLatestBaileysVersion)();
    const { id } = req.body;
    let sendRes = false;
    const { state, saveState } = (0, Utils_1.useSingleFileLegacyAuthState)(`../../sessions/auth_info_${id}.json`);
    clients[id] = (0, index_1.makeWALegacySocket)({
        version,
        printQRInTerminal: true,
        auth: state,
    });
    clients[id].ev.on("connection.update", async (update) => {
        var _a, _b;
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            // reconnect if not logged out
            if (((_b = (_a = lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !==
                index_1.DisconnectReason.loggedOut) {
                (0, exports.connectToWhatsApp)(req, res);
            }
            else {
                console.log("connection closed");
                try {
                    fs.unlinkSync(`../../sessions/auth_info_multi_${id}.json`);
                    //file removed
                }
                catch (err) {
                    console.error("Error eliminado el archivo", id);
                }
            }
        }
        if (connection === "open" && !sendRes) {
            sendRes = true;
            const body = {
                id,
                request: req.body,
                user: { ...clients[id].user, legacy: false },
            };
            (0, axios_1.default)({
                method: "POST",
                url: `${constants_1.URL_RESPONSE}/whatsapp/save`,
                headers: {
                    "Content-Type": "application/json",
                },
                data: body,
            }).catch((err) => {
                console.log(err);
            });
            res.jsonp({ mensaje: "Sesión cargada", name: "whatsapp" });
        }
        if ((update === null || update === void 0 ? void 0 : update.qr) && !sendRes) {
            sendRes = true;
            res.jsonp({ status: 200, qr: update.qr });
        }
    });
    // listen for when the auth credentials is updated
    clients[id].ev.on("creds.update", saveState);
};
exports.connectToWhatsApp = connectToWhatsApp;
const sendMessage = async (req, res) => {
    const { id, phone, body } = req.body;
    // send a simple text!
    const phoneDest = `${phone}@s.whatsapp.net`; // the WhatsApp ID
    try {
        await clients[id].sendMessage(phoneDest, { text: body });
    }
    catch (err) {
        return res.jsonp({ status: 400, error: "Error enviando el mensaje" });
    }
    return res.jsonp({ status: 200, mensaje: "Notificación enviada" });
};
exports.sendMessage = sendMessage;
const sendFileMessage = async (req, res) => {
    const { id, phone } = req.body;
    // send a simple text!
    if (!req.file) {
        return res.status(401).jsonp({ mensaje: "El archivo es obligatorio" });
    }
    const phoneDest = `${phone}@s.whatsapp.net`; // the WhatsApp ID
    try {
        await clients[id].sendMessage(phoneDest, {
            document: { url: req.file.path },
        });
    }
    catch (err) {
        res.jsonp({ status: 400, error: "Error enviando el mensaje" });
    }
    res.jsonp({ status: 200, mensaje: "Notificación enviada" });
};
exports.sendFileMessage = sendFileMessage;
const loadSession = async (req, res) => {
    // fetch latest version of WA Web
    const { version, isLatest } = await (0, index_1.fetchLatestBaileysVersion)();
    const { id } = req.body;
    let sendRes = false;
    const { state, saveState } = (0, Utils_1.useSingleFileLegacyAuthState)(`../../sessions/auth_info_${id}.json`);
    console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);
    clients[id] = (0, index_1.makeWALegacySocket)({
        version,
        auth: state,
    });
    clients[id].ev.on("connection.update", async (update) => {
        var _a, _b;
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            // reconnect if not logged out
            if (((_b = (_a = lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !==
                index_1.DisconnectReason.loggedOut) {
                (0, exports.loadSession)(req, res);
            }
            else {
                console.log("connection closed");
            }
        }
        if (connection === "open" && !sendRes) {
            sendRes = true;
            res.jsonp({ mensaje: "Sesión cargada", name: "whatsapp" });
        }
    });
    // listen for when the auth credentials is updated
    clients[id].ev.on("creds.update", saveState);
};
exports.loadSession = loadSession;
