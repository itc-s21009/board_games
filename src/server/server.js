const express = require('express')
const session = require('express-session')
const path = require("path");
const app = express()
const {Server} = require('socket.io')

const PORT = process.env.port ?? 8080

require('dotenv').config()

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true
}))
app.use(express.json())

const getViewPath = (pathFromPublic) => {
    return path.join(__dirname, '..', '..', 'public', ...pathFromPublic.split('/'))
}

app.get('/', (req, res) => {
    if (!req.session.name) {
        res.sendFile(getViewPath('set_name.html'))
        return
    }
    console.log(`name:${req.session.name}`)
    res.sendFile(getViewPath('index.html'))
})

app.post('/api/name', (req, res) => {
    const {name} = req.body
    if (!name) {
        return res.status(500).json({message: 'nameが必要です。'})
    }
    req.session.name = name
    return res.status(200).json({message: `名前を設定しました：${name}`})
})

app.use(express.static(path.join(__dirname, '..', '..', 'public')))

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