import express from "express";
import bodyParser from "body-parser";

const app = express();

const router = express.Router();
import path from "path";
import multer from "multer";
const storage = multer.diskStorage({
  destination(req: any, file: any, cb: any) {
    cb(null, "uploads/");
  },
  filename(req: any, file: any, cb: any) {
    cb(null, Date.now() + path.extname(file.originalname)); // Appending extension
  },
});

const upload = multer({ dest: "uploads/" });

app.use(bodyParser.json());

// import { conectApi, loadSession, sendFileMessage, sendMessage } from './v4'

// app.post('/whatsapp/connect', conectApi)
// app.post('/whatsapp/load_session', loadSession)
// app.post('/whatsapp/sendmessage', sendMessage)
// app.post('/whatsapp/sendfile', upload.single('file'), sendFileMessage)

import {
  connectToWhatsApp,
  sendMessage,
  loadSession,
  sendFileMessage,
} from "./MultiDevice";

app.post("/whatsapp/connect", connectToWhatsApp);
app.post("/whatsapp/sendmessage", sendMessage);
app.post("/whatsapp/load_session", loadSession);
app.post("/whatsapp/sendfile", upload.single("file"), sendFileMessage);

app.listen(4013, () => {
  console.log("conectado");
});
