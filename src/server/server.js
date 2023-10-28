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
const CARDS = require("../server/cards");

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
    queues[roomId] = {players: [], gameData: gameData}
}

const createPrivateRoom = (gameData) => {
    const roomId = generateRoomId()
    createRoom(roomId, gameData)
    return roomId
}

const isQueue = (roomId) => roomId.toString().startsWith('queue')
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

const startGame = (roomId) => {
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
                // (4, 5), (5, 6), (6, 7), (6, 8)
                // がちょうどいい
                const ROWS = 5
                const COLUMNS = 6
                io.to(roomId).emit('sinkei_areasize', {ROWS: ROWS, COLUMNS: COLUMNS})

                const cardsCount = ROWS * COLUMNS
                let cardsRemain = cardsCount
                let cards = []
                const shuffle = (array) => {
                    const newArray = [...array]
                    for (let i = array.length-1; i >= 0; i--) {
                        let j = Math.floor(Math.random() * i);
                        [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
                    }
                    return newArray
                }
                const chunkArray = (array, chunkSize) => {
                    const newArray = []
                    for (let i = 0; i < array.length; i += chunkSize) {
                        newArray.push(array.slice(i, i + chunkSize))
                    }
                    return newArray
                }
                // 全ての柄の１〜１３までのカード（シャッフルもする）
                let deck = shuffle(
                    Object.values(CARDS).slice(0, 52)
                        .map((card) => ({id: card, suit: card.slice(0, -3), number: card.slice(-2)}))
                )
                // 同じ数字のペアができるように、必要な枚数を配列cardsに入れる
                for (let i = 0; i < cardsCount / 2; i++) {
                    const randomIndex = Math.floor(Math.random() * deck.length)
                    const randomCard = deck.splice(randomIndex, 1)[0]
                    cards.push(randomCard.id)
                    // randomCard と同じ数字で、違う柄のカードを引く
                    const matchingCard =　deck.find((card) => card.number === randomCard.number)
                    const matchingCardIndex = deck.indexOf(matchingCard)
                    cards.push(deck.splice(matchingCardIndex, 1)[0].id)
                }
                cards = shuffle(cards)
                cards = chunkArray(cards, COLUMNS)
                // カードを引く人
                let drawerPointer = 0
                let drawer
                let drawCount = 0
                let pos1
                let pos2
                const scores = {}
                room.players.forEach((player) => scores[player.id] = {name: player.name, score: 0})
                const getScore = (player) => scores[player.id].score
                const setScore = (player, score) => {
                    const playerIndex = room.players.indexOf(player)
                    if (playerIndex === -1) {
                        return
                    }
                    scores[player.id].score = score
                    io.to(roomId).emit('sinkei_setscore', playerIndex, score)
                }
                let timerCount
                let timerId
                const setTimer = (sec) => {
                    if (timerId) {
                        clearInterval(timerId)
                    }
                    timerCount = sec
                    io.to(roomId).emit('sinkei_timer', sec)
                    const task = () => {
                        if (--timerCount < 0) {
                            clearInterval(timerId)
                            if (pos1) io.to(roomId).emit('sinkei_set', pos1, CARDS.BACK)
                            if (pos2) io.to(roomId).emit('sinkei_set', pos2, CARDS.BACK)
                            changeDrawer()
                        }
                    }
                    task()
                    timerId = setInterval(task, 1000)
                }
                const changeDrawer = (change=true) => {
                    if (change) {
                        drawerPointer = (++drawerPointer) % room.players.length
                    }
                    io.to(roomId).emit('sinkei_drawer', drawerPointer)
                    drawer = room.players[drawerPointer]
                    drawCount = 0
                    pos1 = null
                    pos2 = null
                    setTimer(15)
                }
                // カードのIDの末尾２文字を比較して、同じ数字であるかをチェックする
                // 'club_01' と 'diamond_01' の場合は true
                const isEqualNumber = (card1, card2) => card1.slice(-2) === card2.slice(-2)
                const createScoreboard = () => {
                    const nameScores = Object.keys(scores)
                        .map((playerId) => (
                            {
                                id: playerId.substring(0, 10),
                                name: scores[playerId].name,
                                score: scores[playerId].score
                            }
                        ))
                    return nameScores.sort((a, b) => a.score < b.score ? 1 : -1)
                }
                room.players.forEach((player) => {
                    const socket = getSocket(player)
                    socket.on('sinkei_pick', (position) => {
                        if (drawCount >= 2) {
                            return
                        }
                        const {x, y} = position
                        if (player.id === drawer.id) {
                            io.to(roomId).emit('sinkei_set', position, cards[y][x])
                            setTimeout(() => {
                                if (!pos1) {
                                    pos1 = {x, y}
                                } else if (!pos2) {
                                    pos2 = {x, y}
                                    const isEqual = isEqualNumber(cards[pos1.y][pos1.x], cards[pos2.y][pos2.x])
                                    io.to(roomId).emit('sinkei_result', pos1, pos2, isEqual)
                                    if (isEqual) {
                                        io.to(roomId).emit('sinkei_delete', pos1)
                                        io.to(roomId).emit('sinkei_delete', pos2)
                                        setScore(player, getScore(player) + 2)
                                        cardsRemain -= 2
                                        if (cardsRemain <= 0) {
                                            io.to(roomId).emit('sinkei_end', createScoreboard())
                                            room.players.forEach((p) => {
                                                const socket = getSocket(p)
                                                socket.removeAllListeners('sinkei_pick')
                                                leaveRoom(socket, roomId)
                                            })
                                        } else {
                                            changeDrawer(false)
                                        }
                                    } else {
                                        io.to(roomId).emit('sinkei_set', pos1, CARDS.BACK)
                                        io.to(roomId).emit('sinkei_set', pos2, CARDS.BACK)
                                        changeDrawer()
                                    }
                                }
                            }, 1000)
                        }
                    })
                    socket.on('disconnecting', () => {
                        const playerIndex = room.players.indexOf(player)
                        socket.to(roomId).emit('sinkei_disconnect', playerIndex)
                        room.players.splice(playerIndex, 1)
                        if (drawerPointer === playerIndex) {
                            changeDrawer(false)
                        }
                        if (room.players.length <= 1) {
                            socket.to(roomId).emit('sinkei_end', createScoreboard())
                        }
                    })
                })
                changeDrawer(false)
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
        start()
    }, 5000)
}

const dequeuePlayersAndGo = (roomId) => {
    roomId = roomId.toString()
    const room = queues[roomId]
    if (!room) {
        return false
    }
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
            startGame(roomId)
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

    socket.on('join_normal', (gameData, callback) => {
        const queueId = `queue_normal_${gameData.id}`
        if (!queues[queueId]) {
            createRoom(queueId, gameData)
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
})

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
            if (queue.players.length >= maxPlayers || forceStartCount[queueId] > FORCESTART_THRESHOLD / QUEUE_INTERVAL) {
                delete forceStartCount[queueId]
                dequeuePlayersAndGo(queueId)
            }
        }
    })
}, QUEUE_INTERVAL * 1000)