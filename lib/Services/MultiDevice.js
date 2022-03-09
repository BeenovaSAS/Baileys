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
exports.sendFileMessage = exports.sendMessage = exports.connectToWhatsApp = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const index_1 = __importStar(require("../index"));
const endpoints_config_1 = __importDefault(require("./endpoints.config"));
// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const clients = [];
const conectionStatus = [];
// start a connection
const connectToWhatsApp = async (req, res) => {
    // fetch latest version of WA Web
    const { version } = await (0, index_1.fetchLatestBaileysVersion)();
    const { id, multiDevice } = req.body;
    if (conectionStatus[id]) {
        return res.jsonp({ mensaje: 'Sesión cargada', name: 'whatsapp' });
    }
    let sendRes = false;
    if (multiDevice) {
        const { state, saveState } = (0, index_1.useSingleFileAuthState)(`../../sessions/auth_info_multi_${id}.json`);
        clients[id] = (0, index_1.default)({
            version,
            printQRInTerminal: true,
            auth: state,
        });
        clients[id].ev.on('creds.update', saveState);
    }
    else {
        const { state, saveState } = (0, index_1.useSingleFileLegacyAuthState)(`../../sessions/auth_info_legacy_${id}.json`);
        clients[id] = (0, index_1.makeWALegacySocket)({
            version,
            printQRInTerminal: true,
            auth: state,
        });
        clients[id].ev.on('creds.update', saveState);
    }
    clients[id].ev.on('connection.update', async (update) => {
        var _a, _b, _c, _d;
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            conectionStatus[id] = false;
            console.log('Status code .....', (_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode);
            switch ((_d = (_c = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _c === void 0 ? void 0 : _c.output) === null || _d === void 0 ? void 0 : _d.statusCode) {
                case index_1.DisconnectReason.restartRequired:
                    (0, exports.connectToWhatsApp)(req, res);
                    break;
                case index_1.DisconnectReason.timedOut:
                    return res.status(400).jsonp({ mensaje: 'Tiempo de espera agotado', name: 'whatsapp' });
                    break;
                case index_1.DisconnectReason.loggedOut:
                    console.log('Eliminando el archivo');
                    await closeSession(id, multiDevice);
                    break;
                case index_1.DisconnectReason.multideviceMismatch:
                    (0, axios_1.default)({
                        method: 'POST',
                        url: `${endpoints_config_1.default.URL_RESPONSE}/whatsapp/retry`,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        data: {
                            id
                        }
                    }).catch((err) => {
                        console.log(err);
                    });
                    break;
                default:
                    break;
            }
        }
        if (connection === 'open') {
            conectionStatus[id] = true;
            const body = {
                id,
                request: req.body,
                multi_device: multiDevice,
                user: { ...clients[id].user, multi_device: multiDevice },
            };
            (0, axios_1.default)({
                method: 'POST',
                url: `${endpoints_config_1.default.URL_RESPONSE}/whatsapp/save`,
                headers: {
                    'Content-Type': 'application/json',
                },
                data: body,
            }).catch((err) => {
                console.log(err);
            });
            if (!sendRes) {
                sendRes = true;
                res.jsonp({ mensaje: 'Sesión cargada', name: 'whatsapp' });
            }
        }
        if ((update === null || update === void 0 ? void 0 : update.qr) && !sendRes) {
            sendRes = true;
            res.jsonp({ status: 200, qr: update.qr });
        }
    });
    // listen for when the auth credentials is updated
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
        return res.jsonp({ status: 400, error: 'Error enviando el mensaje' });
    }
    return res.jsonp({ status: 200, mensaje: 'Notificación enviada' });
};
exports.sendMessage = sendMessage;
const sendFileMessage = async (req, res) => {
    const { id, phone } = req.body;
    if (!req.file) {
        return res.status(401).jsonp({ mensaje: 'El archivo es obligatorio' });
    }
    const phoneDest = `${phone}@s.whatsapp.net`; // the WhatsApp ID
    try {
        await clients[id].sendMessage(phoneDest, {
            document: { url: req.file.path, fileName: 'Formula' },
        });
    }
    catch (err) {
        return res.jsonp({ status: 400, error: 'Error enviando el mensaje' });
    }
    return res.jsonp({ status: 200, mensaje: 'Notificación enviada' });
};
exports.sendFileMessage = sendFileMessage;
const closeSession = async (id, multiDevice) => {
    try {
        fs.unlinkSync(`../../sessions/auth_info_${multiDevice ? 'multi' : 'legacy'}_${id}.json`);
        //file removed
    }
    catch (err) {
        console.error('Error eliminado el archivo', id);
    }
};
