const BoardGame = require("./board_game");
const {EASY} = require("../cpuDifficulty");
class BoardGameSinkei extends BoardGame {
    constructor(room, isRated, includeCpu) {
        super(room, isRated, includeCpu);
    }
    start() {
        const CARDS = require("../../server/cards");
        const io = this.server.io

        // (4, 5), (5, 6), (6, 7), (6, 8)
        // がちょうどいい
        const SIZE_SET = [
            {ROWS: 5, COLUMNS: 6}, // 2人, 30枚
            {ROWS: 6, COLUMNS: 7}, // 3人, 42枚
            {ROWS: 6, COLUMNS: 8}  // 4人, 48枚
        ]

        console.log(this.room.players)
        const {ROWS, COLUMNS} = SIZE_SET[this.room.players.length - 2]
        io.to(this.room.id).emit('sinkei_areasize', {ROWS: ROWS, COLUMNS: COLUMNS})

        const cardsCount = ROWS * COLUMNS
        let cardsRemain = cardsCount
        let cards = []
        const shuffle = (array) => {
            const newArray = [...array]
            for (let i = array.length - 1; i >= 0; i--) {
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
        let timerCount
        let timerId
        const setTimer = (sec) => {
            if (timerId) {
                clearInterval(timerId)
            }
            timerCount = sec
            io.to(this.room.id).emit('sinkei_timer', sec)
            const task = () => {
                if (--timerCount < 0) {
                    clearInterval(timerId)
                    if (pos1) io.to(this.room.id).emit('sinkei_set', pos1, CARDS.BACK)
                    if (pos2) io.to(this.room.id).emit('sinkei_set', pos2, CARDS.BACK)
                    changeDrawer()
                }
            }
            task()
            timerId = setInterval(task, 1000)
        }
        const changeDrawer = (change = true) => {
            if (change) {
                drawerPointer = (++drawerPointer) % this.room.players.length
            }
            io.to(this.room.id).emit('sinkei_drawer', drawerPointer)
            drawer = this.room.players[drawerPointer]
            drawCount = 0
            pos1 = null
            pos2 = null
            setTimer(15)
            if (this.isCpuPlayer(drawer)) {
                cpuHandleDrawer(drawer)
            }
        }
        // カードのIDの末尾２文字を比較して、同じ数字であるかをチェックする
        // 'club_01' と 'diamond_01' の場合は true
        const isEqualNumber = (card1, card2) => card1.slice(-2) === card2.slice(-2)
        const handlePick = (player, position) => {
            if (drawCount >= 2) {
                return
            }
            const {x, y} = position
            if (player.id === drawer.id) {
                io.to(this.room.id).emit('sinkei_set', position, cards[y][x])
                setTimeout(() => {
                    if (!pos1) {
                        pos1 = {x, y}
                    } else if (!pos2) {
                        pos2 = {x, y}
                        const isEqual = isEqualNumber(cards[pos1.y][pos1.x], cards[pos2.y][pos2.x])
                        io.to(this.room.id).emit('sinkei_result', pos1, pos2, isEqual)
                        if (isEqual) {
                            io.to(this.room.id).emit('sinkei_delete', pos1)
                            io.to(this.room.id).emit('sinkei_delete', pos2)
                            cards[pos1.y][pos1.x] = null
                            cards[pos2.y][pos2.x] = null
                            this.setScore(player, this.getScore(player) + 2)
                            cardsRemain -= 2
                            if (cardsRemain <= 0) {
                                this.handleEnd()
                            } else {
                                changeDrawer(false)
                            }
                        } else {
                            io.to(this.room.id).emit('sinkei_set', pos1, CARDS.BACK)
                            io.to(this.room.id).emit('sinkei_set', pos2, CARDS.BACK)
                            changeDrawer()
                        }
                    }
                }, 1000)
            }
        }
        this.getRealPlayers().forEach((player) => {
            const socket = this.server.getSocket(player)
            socket.on('sinkei_pick', (position) => handlePick(player, position))
            socket.on('disconnecting', () => {
                const playerIndex = this.room.players.indexOf(player)
                if (drawerPointer === playerIndex) {
                    changeDrawer(false)
                }
            })
        })
        changeDrawer(false)

        const getRandomPosition = () => {
            const rnd = (max) => Math.floor(Math.random() * max)
            while (true) {
                const pos = {x: rnd(COLUMNS), y: rnd(ROWS)}
                if (cards[pos.y][pos.x] !== null) {
                    return pos
                }
            }
        }
        const getRandomTwoPosition = () => {
            const pos1 = getRandomPosition()
            while (true) {
                const pos2 = getRandomPosition()
                if (pos1.x !== pos2.x || pos1.y !== pos2.y) {
                    return {pos1, pos2}
                }
            }
        }
        const cpuHandleDrawer = (cpuPlayer) => {
            switch (this.getCpuProperty(cpuPlayer).difficulty) {
                case EASY:
                    const {pos1, pos2} = getRandomTwoPosition()
                    setTimeout(() => {
                        handlePick(cpuPlayer, pos1)
                        setTimeout(() => {
                            handlePick(cpuPlayer, pos2)
                        }, 500)
                    }, 1000);
                    break
                default:
                    break
            }
        }
    }
}

module.exports = BoardGameSinkei