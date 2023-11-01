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

        const field = []
        for (let y = 0; y < 8; y++) {
            // y行を[]で埋める
            field[y] = Array(8).fill([])
            for (let x = 0; x < 8; x++) {
                field[y][x] = NONE
            }
        }
        field[3][3] = WHITE
        field[4][3] = BLACK
        field[3][4] = BLACK
        field[4][4] = WHITE

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
        const getChanges = (x, y, color) => {
            if (field[y][x] !== NONE) {
                return []
            }
            const changes = []
            const oppositeColor = color === BLACK ? WHITE : BLACK
            const DIRECTIONS = [
                {x: 0, y: 1},   // 下
                {x: 1, y: 0},   // 右
                {x: 0, y: -1},  // 上
                {x: -1, y: 0},  // 左
                {x: 1, y: 1},   // 右下
                {x: 1, y: -1},  // 右上
                {x: -1, y: 1},  // 左下
                {x: -1, y: -1}, // 左上
            ]
            DIRECTIONS.forEach((d) => {
                const dx = d.x
                const dy = d.y
                let cx = x + dx
                let cy = y + dy
                const changesOnDirection = []
                let foundOpposite = false
                while (cx >= 0 && cx < 8 && cy >= 0 && cy < 8) {
                    if (field[cy][cx] === oppositeColor) {
                        foundOpposite = true
                        changesOnDirection.push({x: cx, y: cy})
                    } else if (foundOpposite && field[cy][cx] === color) {
                        changes.push(...changesOnDirection)
                        break
                    } else {
                        break
                    }
                    cx += dx
                    cy += dy
                }
            })
            return changes
        }
        const changeDrawer = (change = true) => {
            if (change) {
                drawerPointer = (++drawerPointer) % this.room.players.length
            }
            io.to(this.room.id).emit('reversi_drawer', drawerPointer)
            drawer = this.room.players[drawerPointer]
            setTimer(40)
        }
        changeDrawer(false)
        const setCell = (x, y, color) => {
            field[y][x] = color
            io.to(this.room.id).emit('reversi_set', {x, y}, color)
        }
        this.room.players.forEach((player) => {
            const socket = this.server.getSocket(player)
            const color = colors[player.id]
            const oppositePlayer = this.room.players.filter((p) => p.id !== player.id)[0]
            socket.emit('reversi_mycolor', colors[player.id])
            socket.on('reversi_place', ({x, y}) => {
                const changes = getChanges(x, y, color)
                if (changes.length > 0) {
                    changeDrawer(true)
                    setCell(x, y, color)
                    changes.forEach(({x, y}) => {
                        setCell(x, y, color)
                    })
                    const oppositeColor = color === BLACK ? WHITE : BLACK
                    let myStones = 0
                    let oppositeStones = 0
                    for (let y = 0; y < 8; y++) {
                        for (let x = 0; x < 8; x++) {
                            if (field[y][x] === color) {
                                myStones++
                            } else if (field[y][x] === oppositeColor) {
                                oppositeStones++
                            }
                        }
                    }
                    if (oppositeStones === 0) {
                        clearInterval(timerId)
                        this.setScore(player, myStones)
                        this.setScore(oppositePlayer, oppositeStones)
                        this.handleEnd()
                    }
                }
            })
            socket.on('reversi_pass', () => {
                if (this.room.players[drawerPointer].id === player.id) {
                    io.to(this.room.id).emit('reversi_pass')
                    changeDrawer(true)
                }
            })
        })
    }
}

module.exports = BoardGameReversi