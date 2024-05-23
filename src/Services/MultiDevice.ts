import axios from "axios";
import * as fs from "fs";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";

import endpoint from "./endpoints.config";

// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const clients: any[] = [];

const conectionStatus: boolean[] = [];
// start a connection

export const connectToWhatsApp = async (req: any, res: any) => {
  // fetch latest version of WA Web
  const { version } = await fetchLatestBaileysVersion();
  const { id } = req.body;
  if (conectionStatus[id]) {
    return res.jsonp({ mensaje: "Sesión cargada", name: "whatsapp" });
  }
  let sendRes = false;
  const { state, saveCreds } = await useMultiFileAuthState(
    `../../sessions/auth_info_multi_${id}`
  );
  clients[id] = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    version,
  });

  clients[id].ev.on("creds.update", saveCreds);
  clients[id].ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      conectionStatus[id] = false;
      console.log(
        "Status code .....",
        (lastDisconnect?.error as Boom)?.output?.statusCode
      );
      switch ((lastDisconnect?.error as Boom)?.output?.statusCode) {
        case DisconnectReason.restartRequired:
          connectToWhatsApp(req, res);
          break;
        case DisconnectReason.timedOut:
          return res
            .status(400)
            .jsonp({ mensaje: "Tiempo de espera agotado", name: "whatsapp" });
          break;
        case DisconnectReason.loggedOut:
          console.log("Eliminando el archivo");
          await closeSession(id);
          connectToWhatsApp(req, res);
          break;
        case DisconnectReason.multideviceMismatch:
          axios({
            method: "POST",
            url: `${endpoint.URL_RESPONSE}/whatsapp/retry`,
            headers: {
              "Content-Type": "application/json",
            },
            data: {
              id,
            },
          }).catch((err) => {
            console.log(err);
          });
          break;
        case 405:
          console.log("🐛", "Conection error");
          await closeSession(id);
          connectToWhatsApp(req, res);
          break;

        default:
          console.log(
            "🐸 DEFAULT ERROR",
            (lastDisconnect?.error as Boom)?.output?.statusCode
          );
          break;
      }
    }
    if (connection === "open") {
      conectionStatus[id] = true;
      console.log(clients[id]);
      const body = {
        id,
        request: req.body,
        multi_device: true,
        user: { ...clients[id], multi_device: true },
      };
      axios({
        method: "POST",
        url: `${endpoint.URL_RESPONSE}/whatsapp/save`,
        headers: {
          "Content-Type": "application/json",
        },
        data: body,
      }).catch((err) => {
        console.log(err);
      });
      if (!sendRes) {
        sendRes = true;
        try {
          res.jsonp({ mensaje: "Sesión cargada", name: "whatsapp" });
        } catch (error) {}
      }
    }
    if (update?.qr && !sendRes) {
      sendRes = true;
      try {
        res.jsonp({ status: 200, qr: update.qr });
      } catch (error) {}
    }
  });
  // listen for when the auth credentials is updated
};

export const sendMessage = async (req: any, res: any) => {
  const { id, phone, body } = req.body;
  // send a simple text!

  const phoneDest = `${phone}@s.whatsapp.net`; // the WhatsApp ID
  try {
    await clients[id].sendMessage(phoneDest, { text: body });
  } catch (err) {
    return res.jsonp({ status: 400, error: "Error enviando el mensaje" });
  }

  return res.jsonp({ status: 200, mensaje: "Notificación enviada" });
};

export const sendFileMessage = async (req: any, res: any) => {
  const { id, phone } = req.body;

  if (!req.file) {
    return res.status(401).jsonp({ mensaje: "El archivo es obligatorio" });
  }

  const phoneDest = `${phone}@s.whatsapp.net`; // the WhatsApp ID

  try {
    await clients[id].sendMessage(phoneDest, {
      mimetype: "application/pdf",
      fileName: "formula",
      document: {
        url: req.file.path,
      },
    });
  } catch (err) {
    return res.jsonp({ status: 400, error: "Error enviando el mensaje" });
  }

  return res.jsonp({ status: 200, mensaje: "Notificación enviada" });
};

const closeSession = async (id) => {
  try {
    fs.rmSync(`../../sessions/auth_info_multi_${id}`, {
      recursive: true,
      force: true,
    });
    ``;
    //file removed
  } catch (err) {
    console.error("Error eliminado el archivo", id);
  }
};
