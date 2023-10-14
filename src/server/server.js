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
        } while (queues[roomId])
        return roomId
    }
    const roomId = generateRoomId()
    createQueueRoom(roomId, gameData)
    return roomId
}

const joinRoom = (socket, roomId) => {
    const room = queues[roomId]
    const player = getPlayer(socket)
    if (!room || room.players.filter((p) => p.id === player.id).length > 0) {
        return false
    }
    socket.join(roomId)
    room.players.push(player)
    io.to(roomId).emit('player_count', room.players.length)
    return true
}

const leaveRoom = (socket, roomId) => {
    const room = queues[roomId]
    const player = getPlayer(socket)
    if (!room) {
        return false
    }
    socket.leave(roomId)
    room.players = room.players.filter((p) => p.id !== player.id)
    if (room.players.length <= 0) {
        delete queues[roomId]
    } else {
        io.to(roomId).emit('player_count', room.players.length)
    }
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

    socket.on('join_normal', (gameData, callback) => {
        const queueId = `queue_normal_${gameData.id}`
        if (!queues[queueId]) {
            createQueueRoom(queueId, gameData)
        }
        if (joinRoom(socket, queueId)) {
            const playerCount = queues[queueId].players.length
            callback(true, playerCount)
        } else {
            callback(false)
        }
    })

    socket.on('leave_normal', (gameData) => {
        const queueId = `queue_normal_${gameData.id}`
        leaveRoom(socket, queueId)
    })

    socket.on('create_room', (gameData, callback) => {
        const roomId = createPrivateRoom(gameData)
        joinRoom(socket, roomId)
        callback(roomId)
    })

    socket.on('leave_room', (roomId) => {
        leaveRoom(socket, roomId)
    })

    socket.on('disconnecting', () => {
        socket.rooms.forEach((room) => {
            leaveRoom(socket, room)
        })
    })
})