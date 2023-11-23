const BoardGame = require('./board_game')
const CARDS = require('../cards')

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
            const allCards = Object.values(CARDS)
            const deck1 = allCards.filter((s) =>
                s.includes('heart') ||
                s.includes('diamond')
            )
            const deck2 = allCards.filter((s) =>
                s.includes('spade') ||
                s.includes('club')
            )
            decks[this.playersJoined[0].id] = deck1
            decks[this.playersJoined[1].id] = deck2
            fieldCards[this.playersJoined[0].id] = new Array(4).fill(null)
            fieldCards[this.playersJoined[1].id] = new Array(4).fill(null)
            centerCards.left = null
            centerCards.right = null
        }

        const getFieldCards = (player) => fieldCards[player.id]
        const pickFromDeck = (player) => {
            const deck = decks[player.id]
            if (deck.length <= 0) {
                return
            }
            const field = getFieldCards(player)
            const emptySlot = field.indexOf(null)
            if (emptySlot === -1) {
                return
            }
            const picked = deck.splice(0, 1)
            const playerIndex = this.room.players.indexOf(player)
            field[emptySlot] = picked
            io.to(this.room.id).emit('speed_set_field', playerIndex, emptySlot, picked)
        }
        init()

        this.getRealPlayers().forEach((player) => {
            const socket = this.server.getSocket(player)
            console.log(player)
            socket.on('speed_pick_deck', () => {
                pickFromDeck(player)
            })
        })
    }
}

module.exports = BoardGameSpeed