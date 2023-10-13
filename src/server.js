const express = require('express')
const session = require('express-session')
const path = require("path");
const app = express()
const {Server} = require('socket.io')

const PORT = process.env.port ?? 8080

require('dotenv').config()

app.use(session({
    secret: process.env.SECRET
}))

app.get('/', (req, res) => {
    if (!req.session.name) {
        res.send('名前入力が必要')
        return
    }
    console.log(`name:${req.session.name}`)
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
})

app.use(express.static(path.join(__dirname, '..', 'public')))

const server = app.listen(PORT, () => {
    console.log(`listening on ${PORT}`)
})

const io = new Server(server)
io.on('connection', (socket) => {
    console.log('user connected')
    socket.on('disconnect', () => {
        console.log('user disconnected')
    })
})