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

// {players: playerList, gameData: gameData}
const queues = {}

// {socket: socket, player: {id: playerId, name: playerName}}
const sockets = []

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

const getPlayer = (socket) => {
    const data = sockets.find((s) => socket.id === s.socket.id)
    if (data) {
        return data.player
    }
}

const getSocket = (player) => {
    const data = sockets.find((s) => player.id === s.player.id)
    if (data) {
        return data.socket
    }
}

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
            sockets.push({socket: socket, player: {id: id, name: user.name}})
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

    socket.on('get_room', (roomId, callback) => {
        callback(queues[roomId])
    })

    socket.on('join_room', (roomId, callback) => {
        callback(joinRoom(socket, roomId))
    })

    socket.on('disconnecting', () => {
        socket.rooms.forEach((room) => {
            leaveRoom(socket, room)
        })
    })
})

// 3秒ごとに全ての待ち列を確認して、最大人数に達していれば待っていた順で追い出していく
setInterval(() => {
    Object.keys(queues).forEach((queueId) => {
        const queue = queues[queueId]
        const maxPlayers = queue.gameData.maxPlayers
        console.log(`${queueId}: ${queue.players.length}/${maxPlayers}`)
        if (queue.players.length >= maxPlayers) {
            const playersToGo = queue.players.slice(0, maxPlayers)
            queue.players = queue.players.slice(maxPlayers)
            playersToGo.forEach((p) => {
                const pSocket = getSocket(p)
                // プレイヤーを区別するためのIDとして、セッションIDの一部をクライアントに渡す
                pSocket.emit('match_found', playersToGo
                    .map((p) => ({id: p.id.substring(0, 10), name: p.name})))
                leaveRoom(pSocket, queueId)
                // 10秒後に画面遷移させる
                setTimeout(() => {
                    pSocket.emit('match_go')
                }, 10000)
            })
        }
    })
}, 3000)