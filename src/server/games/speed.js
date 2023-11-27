const BoardGame = require('./board_game')
const {CARDS, shuffle} = require("../cards");

class BoardGameSpeed extends BoardGame {
    constructor(room, isRated, cpuSettings) {
        super(room, isRated, cpuSettings);
    }

    start() {
        const {io, getSocket} = this.server
        // {player.id: card[]}
        const decks = {}
        // {player.id: card[]}
        const fieldCards = {}
        const [LEFT, RIGHT] = [0, 1]
        // [leftCard, rightCard]
        const centerCards = []
        let timerForBacchankoId
        const prepareSlotThenBacchanko = () => {
            if (this.ended) {
                return
            }
            const player1 = this.room.players[0]
            const player2 = this.room.players[1]
            // {playerId: slot}
            const slots = {};
            const setSlot = (player, slot) => slots[player.id] = slot
            const playersHaveDeck = []
            this.room.players.forEach((player) => {
                const socket = getSocket(player)
                if (decks[player.id].length <= 0) {
                    socket.emit('speed_bacchanko_select')
                    socket.on('speed_bacchanko_select', (slot) => setSlot(player, slot))
                } else {
                    slots[player.id] = -1
                    playersHaveDeck.push(player)
                }
            })
            const bacchanko = () => {
                this.room.players.forEach((player) => {
                    getSocket(player).off('speed_bacchanko_select', (slot) => setSlot(player, slot))
                })
                // 選択されなかった場合はundefinedなので、その場合は一番左側にあるカードを出す
                let player1Slot = slots[player1.id] ?? [0,1,2,3].filter((i) => getFieldCards(player1)[i] !== null)[0]
                let player2Slot = slots[player2.id] ?? [0,1,2,3].filter((i) => getFieldCards(player2)[i] !== null)[0]
                startBacchankoCountdown(player1Slot, player2Slot)
            }
            if (playersHaveDeck.length === 1) {
                playersHaveDeck.forEach((player) => getSocket(player).emit('speed_bacchanko_select_wait'))
                setTimeout(bacchanko, 5000)
            } else {
                bacchanko()
            }
        }
        const resetTimerForBacchanko = () => {
            if (timerForBacchankoId) {
                clearTimeout(timerForBacchankoId)
            }
            timerForBacchankoId = setTimeout(prepareSlotThenBacchanko, 7000)
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
            if (!fieldCard || !centerCard) {
                return false
            }
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
                if (this.getScore(player) <= 0) {
                    this.handleEnd()
                }
                return true
            }
            return false
        }
        const performBacchanko = (player1slot=-1, player2slot=-1) => {
            const player1Index = 0
            const player2Index = 1
            const player1 = this.room.players[player1Index]
            const player2 = this.room.players[player2Index]
            const drawCard1 = player1slot !== -1 ? getFieldCards(player1)[player1slot] : pickFromDeck(player1)
            const drawCard2 = player2slot !== -1 ? getFieldCards(player2)[player2slot] : pickFromDeck(player2)
            if (player1slot !== -1) {
                getFieldCards(player1)[player1slot] = null
                io.to(this.room.id).emit('speed_set_field', player1Index, player1slot, null)
            }
            if (player2slot !== -1) {
                getFieldCards(player2)[player2slot] = null
                io.to(this.room.id).emit('speed_set_field', player2Index, player2slot, null)
            }
            centerCards[LEFT] = drawCard1
            centerCards[RIGHT] = drawCard2
            io.to(this.room.id).emit('speed_set_center', player1Index, LEFT, drawCard1)
            io.to(this.room.id).emit('speed_set_center', player2Index, RIGHT, drawCard2)
            this.setScore(player1, this.getScore(player1) - 1)
            this.setScore(player2, this.getScore(player2) - 1)
            if (this.getScore(player1) <= 0 || this.getScore(player2) <= 0) {
                this.handleEnd()
            } else {
                resetTimerForBacchanko()
            }
        }
        const startBacchankoCountdown = (player1slot, player2slot) => {
            io.to(this.room.id).emit('speed_bacchanko_countdown')
            setTimeout(() => performBacchanko(player1slot, player2slot), 3000)
        }
        init()
        for (let i = 0; i < 4; i++) {
            handlePickDeck(this.room.players[0])
            handlePickDeck(this.room.players[1])
        }
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