import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useSingleFileAuthState,
} from "../index";

// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const clients = [];
// start a connection
export const connectToWhatsApp = async (req: any, res: any) => {
  // fetch latest version of WA Web
  const { version, isLatest } = await fetchLatestBaileysVersion();

  const { id } = req.body;

  const { state, saveState } = useSingleFileAuthState(
    `../../sessions/auth_info_multi_${id}.json`
  );

  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

  clients[id] = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
  });

  clients[id].ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      // reconnect if not logged out
      if (
        (lastDisconnect.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut
      ) {
        connectToWhatsApp(req, res);
      } else {
        console.log("connection closed");
      }
    }

    if (connection === "open") {
      console.log("Connection Open");
    }

    // if (update?.qr) {
    //   res.jsonp({ status: 200, qr: update.qr });
    // }
  });
  // listen for when the auth credentials is updated
  clients[id].ev.on("creds.update", saveState);
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
