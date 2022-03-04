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
