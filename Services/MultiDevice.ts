import { Boom } from "@hapi/boom";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useSingleFileAuthState,
} from "../src";

// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it

const { state, saveState } = useSingleFileAuthState("./auth_info_multi.json");

// start a connection
const startSock = async () => {
  // fetch latest version of WA Web
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    // implement to handle retries
    getMessage: async (key) => {
      return {
        conversation: "hello",
      };
    },
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      // reconnect if not logged out
      if (
        (lastDisconnect.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut
      ) {
        startSock();
      } else {
        console.log("connection closed");
      }
    }

    if (connection === "open") {
      await sock.sendMessage("573135519620@s.whatsapp.net", {
        text: "Hola!",
      });
    }

    console.log("connection update", update);
  });
  // listen for when the auth credentials is updated
  sock.ev.on("creds.update", saveState);

  return sock;
};

startSock();
