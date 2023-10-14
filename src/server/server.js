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

const queues = {}

// {socketId: player}
const sockets = {}

const createQueueRoom = (roomId, gameData) => {
    if (queues[roomId]) {
        return
    }
    queues[roomId] = {players: [], gameData: gameData}
}

const createPrivateRoom = (gameData) => {
    const generateRoomId = () => {
        let roomId;
        do {
            roomId = Math.floor(Math.random() * 99999)
        } while (!queues[roomId])
        return roomId
    }
    const roomId = generateRoomId()
    createQueueRoom(roomId, gameData)
}

const joinRoom = (player, roomId) => {
    const room = queues[roomId]
    if (!room || room.players.filter((p) => p.id === player.id).length > 0) {
        return false
    }
    room.players.push(player)
    return true
}

const leaveRoom = (player, roomId) => {
    const room = queues[roomId]
    if (!room) {
        return false
    }
    room.players = room.players.filter((p) => p.id !== player.id)
    return true
}

const getPlayer = (socket) => sockets[socket.id]

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
            sockets[socket.id] = {id: id, name: user.name}
            callback(user.name)
        })
    })

    socket.on('join_normal', (player, gameData, callback) => {
        const queueId = `queue_normal_${gameData.id}`
        socket.join(queueId)
        if (!queues[queueId]) {
            createQueueRoom(queueId, gameData)
        }
        if (joinRoom(player, queueId)) {
            const playerCount = queues[queueId].players.length
            callback(true, playerCount)
            io.to(queueId).emit('player_count', playerCount)
        } else {
            callback(false)
        }
    })

    socket.on('leave_normal', (player, gameData) => {
        const queueId = `queue_normal_${gameData.id}`
        socket.leave(queueId)
        leaveRoom(player, queueId)
        io.to(queueId).emit('player_count', queues[queueId].players.length)
    })

    socket.on('disconnecting', () => {
        socket.rooms.forEach((room) => {
            if (leaveRoom(getPlayer(socket), room)) {
                io.to(room).emit('player_count', queues[room].players.length)
            }
        })
    })
})