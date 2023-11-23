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
        // {left: card, right: card}
        const centerCards = {}
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
            centerCards.left = null
            centerCards.right = null
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
        const performBacchanko = () => {
            const player1 = this.room.players[0]
            const player2 = this.room.players[1]
            const topCard1 = pickFromDeck(player1)
            const topCard2 = pickFromDeck(player2)
            io.to(this.room.id).emit('speed_set_left', topCard1)
            io.to(this.room.id).emit('speed_set_right', topCard2)
            this.setScore(player1, this.getScore(player1) - 1)
            this.setScore(player2, this.getScore(player2) - 1)
            if (this.getScore(player1) <= 0 || this.getScore(player2) <= 0) {
                this.handleEnd()
            }
        }
        init()
        setTimeout(performBacchanko, 1000)

        this.getRealPlayers().forEach((player) => {
            const socket = this.server.getSocket(player)
            console.log(player)
            socket.on('speed_pick_deck', () => {
                handlePickDeck(player)
            })
        })
    }
}

module.exports = BoardGameSpeed