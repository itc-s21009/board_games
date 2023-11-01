const BoardGame = require('./board_game')
class BoardGameReversi extends BoardGame {
    constructor(room) {
        super(room);
    }

    start() {
        const io = this.server.io

        const NONE = 0
        const BLACK = 1
        const WHITE = 2

        const colors = {
            [this.room.players[0].id]: BLACK,
            [this.room.players[1].id]: WHITE
        }

        this.room.players.forEach((player) => {
            const socket = this.server.getSocket(player)
            socket.emit('reversi_mycolor', colors[player.id])
        })

        let drawerPointer = 0
        let drawer
        let timerCount
        let timerId

        const setTimer = (sec) => {
            if (timerId) {
                clearInterval(timerId)
            }
            timerCount = sec
            io.to(this.room.id).emit('reversi_timer', sec)
            const task = () => {
                if (--timerCount < 0) {
                    clearInterval(timerId)
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
            io.to(this.room.id).emit('reversi_drawer', drawerPointer)
            drawer = this.room.players[drawerPointer]
            setTimer(15)
        }
        changeDrawer(false)
    }
}

module.exports = BoardGameReversi