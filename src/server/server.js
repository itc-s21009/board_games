const express = require('express')
const session = require('express-session')
const path = require("path");
const app = express()
const {Server} = require('socket.io')
const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()

const PORT = process.env.port ?? 8080

require('dotenv').config()

app.use(session({
    store: new (require('connect-pg-simple')(session))({
        createTableIfMissing: true,
        conString: process.env.DATABASE_URL
    }),
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
    res.sendFile(getViewPath('index.html'))
})

const nameRouter = require('./api/name')
const sessionRouter = require('./api/session')

app.use('/api/name', nameRouter)
app.use('/api/session', sessionRouter)

app.use(express.static(path.join(__dirname, '..', '..', 'public')))

const server = app.listen(PORT, () => {
    console.log(`listening on ${PORT}`)
})

const io = new Server(server)

const playerCount = {}

io.on('connection', (socket) => {
    console.log('user connected')
    socket.on('disconnect', () => {
        console.log('user disconnected')
    })

    socket.on('get_name', async (id, callback) => {
        await prisma.user.findUnique({
            where: {
                sessionId: id
            }
        }).then((user) => {
            callback(user.name)
        })
    })

    socket.on('join_normal', (gameData) => {
        const queueId = `queue_normal_${gameData.id}`
        socket.join(queueId)
        if (!playerCount[queueId]) {
            playerCount[queueId] = 1
        } else {
            playerCount[queueId] += 1
        }
        io.to(queueId).emit('player_count', playerCount[queueId])
    })

    socket.on('leave_normal', (gameData) => {
        const queueId = `queue_normal_${gameData.id}`
        socket.leave(queueId)
        playerCount[queueId] -= 1
        io.to(queueId).emit('player_count', playerCount[queueId])
    })

    socket.on('disconnecting', () => {
        socket.rooms.forEach((room) => {
            if (playerCount[room]) {
                playerCount[room] -= 1
                io.to(room).emit('player_count', playerCount[room])
            }
        })
    })
})