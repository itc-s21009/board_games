module.exports = (room) => {
    const CARDS = require("../../server/cards");
    const {io, getSocket, leaveRoom} = require("../server");
    const roomId = room.id
    // (4, 5), (5, 6), (6, 7), (6, 8)
    // がちょうどいい
    const SIZE_SET = [
        {ROWS: 5, COLUMNS: 6}, // 2人, 30枚
        {ROWS: 6, COLUMNS: 7}, // 3人, 42枚
        {ROWS: 6, COLUMNS: 8}  // 4人, 48枚
    ]
    const {ROWS, COLUMNS} = SIZE_SET[room.players.length - 2]
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
        const matchingCard = deck.find((card) => card.number === randomCard.number)
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
            socket.to(roomId).emit('game_disconnect', playerIndex)
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
}