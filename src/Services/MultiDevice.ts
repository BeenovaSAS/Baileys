import { Boom } from '@hapi/boom'
import axios from 'axios'
import * as fs from 'fs'
import makeWASocket, {
	DisconnectReason,
	fetchLatestBaileysVersion,
	useSingleFileAuthState,
} from '../index'
import { URL_RESPONSE } from './constants'

// the store maintains the data of the WA connection in memory
// can be written out to a file & read from it
const clients = []
// start a connection
export const connectToWhatsApp = async(req: any, res: any) => {
	// fetch latest version of WA Web
	const { version, isLatest } = await fetchLatestBaileysVersion()

	const { id } = req.body

	let sendRes = false
	const { state, saveState } = useSingleFileAuthState(
		`../../sessions/auth_info_multi_${id}.json`
	)

	clients[id] = makeWASocket({
		version,
		printQRInTerminal: true,
		auth: state,
	})

	clients[id].ev.on('connection.update', async(update) => {
		const { connection, lastDisconnect } = update
		if(connection === 'close') {
			// reconnect if not logged out
			if(
				(lastDisconnect.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut
			) {
				connectToWhatsApp(req, res)
			} else {
				console.log('connection closed')
				try {
					fs.unlinkSync(`../../sessions/auth_info_multi_${id}.json`)
					//file removed
				} catch(err) {
					console.error('Error eliminado el archivo', id)
				}
			}
		}

		if(connection === 'open' && !sendRes) {
			sendRes = true

			const body = {
				id,
				request: req.body,
				multi_device:true,
				user: { ...clients[id].user, multi_device: true },
			}

			axios({
				method: 'POST',
				url: `${URL_RESPONSE}/whatsapp/save`,
				headers: {
					'Content-Type': 'application/json',
				},
				data: body,
			}).catch((err) => {
				console.log(err)
			})

			res.jsonp({ mensaje: 'Sesión cargada', name: 'whatsapp' })
		}

		if(update?.qr && !sendRes) {
			sendRes = true
			res.jsonp({ status: 200, qr: update.qr })
		}
	})
	// listen for when the auth credentials is updated
	clients[id].ev.on('creds.update', saveState)
}

export const sendMessage = async(req: any, res: any) => {
	const { id, phone, body } = req.body
	// send a simple text!

	const phoneDest = `${phone}@s.whatsapp.net` // the WhatsApp ID
	try {
		await clients[id].sendMessage(phoneDest, { text: body })
	} catch(err) {
		return res.jsonp({ status: 400, error: 'Error enviando el mensaje' })
	}

	return res.jsonp({ status: 200, mensaje: 'Notificación enviada' })
}

export const sendFileMessage = async(req: any, res: any) => {
	const { id, phone } = req.body
	// send a simple text!

	if(!req.file) {
		return res.status(401).jsonp({ mensaje: 'El archivo es obligatorio' })
	}

	const phoneDest = `${phone}@s.whatsapp.net` // the WhatsApp ID

	try {
		await clients[id].sendMessage(phoneDest, {
			document: { url: req.file.path },
		})
	} catch(err) {
		res.jsonp({ status: 400, error: 'Error enviando el mensaje' })
	}

	res.jsonp({ status: 200, mensaje: 'Notificación enviada' })
}

export const loadSession = async(req: any, res: any) => {
	// fetch latest version of WA Web
	const { version, isLatest } = await fetchLatestBaileysVersion()

	const { id } = req.body

	let sendRes = false

	const { state, saveState } = useSingleFileAuthState(
		`../../sessions/auth_info_multi_${id}.json`
	)

	console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

	clients[id] = makeWASocket({
		version,
		auth: state,
	})

	clients[id].ev.on('connection.update', async(update) => {
		const { connection, lastDisconnect } = update
		if(connection === 'close') {
			// reconnect if not logged out
			if(
				(lastDisconnect.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut
			) {
				loadSession(req, res)
			} else {
				console.log('connection closed')
			}
		}

		if(connection === 'open' && !sendRes) {
			sendRes = true
			res.jsonp({ mensaje: 'Sesión cargada', name: 'whatsapp' })
		}
	})
	// listen for when the auth credentials is updated
	clients[id].ev.on('creds.update', saveState)
}
