import bodyParser from 'body-parser'
import * as dotenv from 'dotenv'
import express from 'express'
import path from 'path'


dotenv.config({ path:path.join(__dirname, '../../.env') })
const app = express()

const router = express.Router()
import multer from 'multer'
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


import {
	connectToWhatsApp,
	sendFileMessage,
	sendMessage,
} from './MultiDevice'


app.post('/whatsapp/connect', connectToWhatsApp)
app.post('/whatsapp/load_session', connectToWhatsApp)
app.post('/whatsapp/sendmessage', sendMessage)
app.post('/whatsapp/sendfile', upload.single('file'), sendFileMessage)

app.listen(4013, () => {
	console.log('conectado')
})
