import bodyParser from 'body-parser'
import express from 'express'

const app = express()

const router = express.Router()
import multer from 'multer'
import path from 'path'
const storage = multer.diskStorage({
	destination(req: any, file: any, cb: any) {
		cb(null, 'uploads/')
	},
	filename(req: any, file: any, cb: any) {
		cb(null, Date.now() + path.extname(file.originalname)) // Appending extension
	},
})

const upload = multer({ dest: 'uploads/' })

app.use(bodyParser.json())

// import { conectApi, loadSession, sendFileMessage, sendMessage } from './v4'

// app.post('/whatsapp/connect', conectApi)
// app.post('/whatsapp/load_session', loadSession)
// app.post('/whatsapp/sendmessage', sendMessage)
// app.post('/whatsapp/sendfile', upload.single('file'), sendFileMessage)

import {
	connectToWhatsApp,
	loadSession,
	sendFileMessage,
	sendMessage,
} from './MultiDevice'

app.post('/md/connect', connectToWhatsApp)
app.post('/md/sendmessage', sendMessage)
app.post('/md/load_session', loadSession)
app.post('/md/sendfile', upload.single('file'), sendFileMessage)

app.listen(4013, () => {
	console.log('conectado')
})
