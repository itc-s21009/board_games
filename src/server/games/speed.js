const BoardGame = require('./board_game')
const {CARDS, shuffle} = require("../cards");

class BoardGameSpeed extends BoardGame {
    constructor(room, isRated, cpuSettings) {
        super(room, isRated, cpuSettings);
    }

    start() {
        const io = this.server.io
        // {player.id: card[]}
        const decks = {}
        // {player.id: card[]}
        const fieldCards = {}
        const [LEFT, RIGHT] = [0, 1]
        // [leftCard, rightCard]
        const centerCards = []
        let timerForBacchankoId
        const resetTimerForBacchanko = () => {
            if (timerForBacchankoId) {
                clearTimeout(timerForBacchankoId)
            }
            timerForBacchankoId = setTimeout(() => {
                startBacchankoCountdown()
            }, 7000)
        }
        const init = () => {
            const player1 = this.room.players[0]
            const player2 = this.room.players[1]
            const allCards = Object.values(CARDS)
            const deck1 = allCards.filter((s) =>
                s.includes('heart') ||
                s.includes('diamond')
            )
            const deck2 = allCards.filter((s) =>
                s.includes('spade') ||
                s.includes('club')
            )
            decks[player1.id] = shuffle(deck1)
            decks[player2.id] = shuffle(deck2)
            fieldCards[player1.id] = new Array(4).fill(null)
            fieldCards[player2.id] = new Array(4).fill(null)
            centerCards[LEFT] = null
            centerCards[RIGHT] = null
            this.setScore(player1, 26)
            this.setScore(player2, 26)
        }

        const getFieldCards = (player) => fieldCards[player.id]
        const pickFromDeck = (player) => {
            const deck = decks[player.id]
            if (deck.length <= 0) {
                return null
            }
            return deck.splice(0, 1)[0]
        }
        const isPlaceable = (a, b) => Math.abs(a - b) <= 1 ||
            (a === 1 && b === 13) ||
            (a === 13 && b === 1)
        const handlePickDeck = (player) => {
            const field = getFieldCards(player)
            const emptySlot = field.indexOf(null)
            // フィールドに空きがなければ何もしない
            if (emptySlot === -1) {
                return
            }
            const picked = pickFromDeck(player)
            // 山札にカードがなければ何もしない
            if (!picked) {
                return
            }
            const playerIndex = this.room.players.indexOf(player)
            field[emptySlot] = picked
            io.to(this.room.id).emit('speed_set_field', playerIndex, emptySlot, picked)
        }
        const handlePlace = (player, fieldSlot, centerSlot) => {
            const fieldCards = getFieldCards(player)
            const fieldCard = fieldCards[fieldSlot]
            const centerCard = centerCards[centerSlot]
            const getCardNum = (card) => parseInt(card.slice(-2))
            const fieldNum = getCardNum(fieldCard)
            const centerNum = getCardNum(centerCard)
            if (isPlaceable(fieldNum, centerNum)) {
                const playerIndex = this.room.players.indexOf(player)
                fieldCards[fieldSlot] = null
                centerCards[centerSlot] = fieldCard
                this.setScore(player, this.getScore(player) - 1)
                io.to(this.room.id).emit('speed_set_field', playerIndex, fieldSlot, null)
                io.to(this.room.id).emit('speed_set_center', playerIndex, centerSlot, fieldCard)
                resetTimerForBacchanko()
                return true
            }
            return false
        }
        const performBacchanko = () => {
            const playerIndex1 = 0
            const playerIndex2 = 1
            const player1 = this.room.players[playerIndex1]
            const player2 = this.room.players[playerIndex2]
            const topCard1 = pickFromDeck(player1)
            const topCard2 = pickFromDeck(player2)
            centerCards[LEFT] = topCard1
            centerCards[RIGHT] = topCard2
            io.to(this.room.id).emit('speed_set_center', playerIndex1, LEFT, topCard1)
            io.to(this.room.id).emit('speed_set_center', playerIndex2, RIGHT, topCard2)
            this.setScore(player1, this.getScore(player1) - 1)
            this.setScore(player2, this.getScore(player2) - 1)
            if (this.getScore(player1) <= 0 || this.getScore(player2) <= 0) {
                this.handleEnd()
            } else {
                resetTimerForBacchanko()
            }
        }
        const startBacchankoCountdown = () => {
            io.to(this.room.id).emit('speed_bacchanko_countdown')
            setTimeout(performBacchanko, 3000)
        }
        init()
        startBacchankoCountdown()

        this.getRealPlayers().forEach((player) => {
            const socket = this.server.getSocket(player)
            console.log(player)
            socket.on('speed_pick_deck', () => {
                handlePickDeck(player)
            })
            socket.on('speed_place', (fieldSlot, centerSlot, callback) => {
                callback(handlePlace(player, fieldSlot, centerSlot))
            })
        })
    }
}

module.exports = BoardGameSpeed