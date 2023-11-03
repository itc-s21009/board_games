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

// {id: roomId, players: playerList, gameData: gameData}
const queues = {}

// {socket: socket, player: {id: playerId, name: playerName}}
const sockets = []

// {socket: socket, queue: queue}
const socketQueueMap = {}

const BoardGameSinkei = require('./games/sinkei')
const BoardGameReversi = require('./games/reversi')
const {MODE_NORMAL, MODE_RATING} = require("./modes");

const generateRoomId = () => {
    let roomId;
    do {
        roomId = Math.floor(Math.random() * 99999).toString()
    } while (queues[roomId])
    return roomId
}

const createRoom = (roomId, gameData) => {
    if (queues[roomId]) {
        return
    }
    queues[roomId] = {id: roomId, players: [], gameData: gameData}
}

const createPrivateRoom = (gameData) => {
    const roomId = generateRoomId()
    createRoom(roomId, gameData)
    return roomId
}

const isQueue = (roomId) => roomId.toString().startsWith('queue')
const isNormalQueue = (roomId) => roomId.toString().startsWith('queue_normal')
const isRatedQueue = (roomId) => roomId.toString().startsWith('queue_rated')
const isGameRoom = (roomId) => roomId.toString().startsWith('game')

const joinRoom = (socket, roomId) => {
    roomId = roomId.toString()
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
    roomId = roomId.toString()
    const room = queues[roomId]
    const player = getPlayer(socket)
    if (!room) {
        return false
    }
    socket.leave(roomId)
    if (!isGameRoom(roomId)) {
        room.players = room.players.filter((p) => p.id !== player.id)
        if (room.players.length <= 0) {
            delete queues[roomId]
        } else {
            io.to(roomId).emit('player_count', room.players.length)
        }
    }
    return true
}

const startGame = (roomId, isRated) => {
    roomId = roomId.toString()
    const room = queues[roomId]
    if (!room) {
        return false
    }
    let started = false
    const start = () => {
        if (started) {
            return
        }
        started = true
        switch(room.gameData.id) {
            case 'sinkei':
                new BoardGameSinkei(room, isRated).start()
                return true
            case 'reversi':
                new BoardGameReversi(room, isRated).start()
                return true
            default:
                return false
        }
    }
    let playersNotReady = room.players
    room.players.forEach((readyPlayer) => {
        const socket = getSocket(readyPlayer)
        socket.once('ready', () => {
            playersNotReady = playersNotReady.filter((player) => player.id !== readyPlayer.id)
            if (playersNotReady.length === 0) {
                setTimeout(start, 1000)
            }
        })
    })
    setTimeout(() => {
        // TODO ５秒以内に準備完了できなかったプレイヤーを退出させる処理
        let cancelled = false
        playersNotReady.forEach((notReadyPlayer) => {
            const socket = getSocket(notReadyPlayer)
            const playerIndex = room.players.indexOf(notReadyPlayer)
            leaveRoom(socket, roomId)
            socket.emit('game_timeout')
            io.to(roomId).emit('game_disconnect', playerIndex)
            room.players.splice(playerIndex, 1)
            cancelled = room.players.length <= 1
        })
        if (cancelled) {
            io.to(roomId).emit('game_cancelled')
        } else {
            start()
        }
    }, 5000)
}

const dequeuePlayersAndGo = (roomId) => {
    roomId = roomId.toString()
    const room = queues[roomId]
    if (!room) {
        return false
    }
    const isRated = isRatedQueue(roomId)
    const playersToGo = room.players.splice(0, room.gameData.maxPlayers)
    // 切断を検出するために、このタイミングでのソケットを保管しておく
    const sockets = []
    playersToGo.forEach((p) => {
        const pSocket = getSocket(p)
        // プレイヤーを区別するためのIDとして、セッションIDの一部をクライアントに渡す
        pSocket.emit('match_found', playersToGo
            .map((p) => ({id: p.id.substring(0, 10), name: p.name})))
        leaveRoom(pSocket, roomId)
        sockets.push(pSocket)
    })
    // 10秒後に画面遷移させる
    setTimeout(() => {
        const disconnected = sockets.filter((socket) => socket.disconnected).length > 0
        // 誰かが切断していればキャンセルする
        if (disconnected) {
            playersToGo.forEach((p) => getSocket(p).emit('match_disconnected'))
        } else {
            const roomId = `game_${generateRoomId()}`
            createRoom(roomId, room.gameData)
            console.log(`game room: ${roomId}`)
            playersToGo.forEach((p) => joinRoom(getSocket(p), roomId))
            io.to(roomId).emit('match_go')
            startGame(roomId, isRated)
        }
    }, 10000)
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

const registerListeners = (socket) => {
    socket.on('get_name', async (id, callback) => {
        await prisma.user.findUnique({
            where: {
                sessionId: id
            }
        }).then((user) => {
            const player = {id: id, name: user.name}
            if (getSocket(player)) {
                console.log('multiple tabs detected')
                callback(false)
                socket.disconnect(true)
                return
            }
            sockets.push({socket: socket, player: player})
            callback(user.name)
        })
    })

    socket.on('join_queue', async (gameData, mode, callback) => {
        let queueId
        if (mode === MODE_NORMAL) {
            queueId = `queue_normal_${gameData.id}`
        } else if (mode === MODE_RATING) {
            await prisma.rating.findFirst({
                where: {
                    user: {
                        sessionId: getPlayer(socket).id
                    },
                    game: {
                        name: gameData.id
                    }
                }
            }).then((ratingData) => {
                const splitInterval = 300 // 300, 600, 900, 1200, 1500, ... のグループに分ける
                const queueGroup = Math.floor(ratingData.rating / splitInterval) * splitInterval
                queueId = `queue_rated_${gameData.id}_${queueGroup}`
            })
        } else {
            callback(false)
            return
        }
        if (!queues[queueId]) {
            createRoom(queueId, gameData)
        }
        if (joinRoom(socket, queueId)) {
            const playerCount = queues[queueId].players.length
            socketQueueMap[socket] = queueId
            callback(true, playerCount)
        } else {
            callback(false)
        }
    })

    socket.on('leave_queue', () => {
        const queueId = socketQueueMap[socket]
        if (queueId) {
            delete socketQueueMap[socket]
            leaveRoom(socket, queueId)
        }
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

    socket.on('start_private', (roomId, error) => {
        const room = queues[roomId]
        if (!room || isQueue(roomId)) {
            error('エラーが発生しました')
            return
        }
        if (room.players.length < room.gameData.minPlayers) {
            error('最低人数に達していません')
            return
        }
        dequeuePlayersAndGo(roomId)
    })

    socket.on('disconnecting', () => {
        socket.rooms.forEach((room) => {
            leaveRoom(socket, room)
        })
        const socketData = sockets.find((data) => data.socket === socket)
        const socketDataIndex = sockets.indexOf(socketData)
        if (socketDataIndex === -1) {
            return
        }
        sockets.splice(socketDataIndex, 1)
    })
}

io.on('connection', registerListeners)

// {queueId: count}
const forceStartCount = {}
// キューをチェックする間隔（秒）
const QUEUE_INTERVAL = 1
// 最低人数に達してから、スタートさせるまでの時間（秒）
const FORCESTART_THRESHOLD = 10

// 3秒ごとに全ての待ち列を確認して、最大人数に達していれば待っていた順で追い出していく
setInterval(() => {
    Object.keys(queues).forEach((queueId) => {
        if (isQueue(queueId)) {
            const queue = queues[queueId]
            const minPlayers = queue.gameData.minPlayers
            const maxPlayers = queue.gameData.maxPlayers
            console.log(`${queueId}: ${queue.players.length}/${maxPlayers}`)
            if (queue.players.length >= minPlayers) {
                if (!forceStartCount[queueId]) {
                    forceStartCount[queueId] = 1
                } else {
                    forceStartCount[queueId]++
                }
            } else {
                delete forceStartCount[queueId]
            }
            if ((queue.players.length >= maxPlayers && forceStartCount[queueId] >= 2) || forceStartCount[queueId] > FORCESTART_THRESHOLD / QUEUE_INTERVAL) {
                delete forceStartCount[queueId]
                dequeuePlayersAndGo(queueId)
            }
        }
    })
}, QUEUE_INTERVAL * 1000)

module.exports = {io, joinRoom, leaveRoom, getPlayer, getSocket, registerListeners}