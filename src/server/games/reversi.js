const BoardGame = require('./board_game')
const {EASY, NORMAL, HARD} = require("../cpuDifficulty");
class BoardGameReversi extends BoardGame {
    constructor(room, isRated, cpuSettings) {
        super(room, isRated, cpuSettings);
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
            const color = colors[this.room.players[drawerPointer].id]
            const getPossibleCells = (color) => {
                const possibleCells = []
                for (let y = 0; y < 8; y++) {
                    for (let x = 0; x < 8; x++) {
                        const changes = getChanges(x, y, color)
                        if (changes.length > 0) {
                            possibleCells.push({x, y, changes: changes.length})
                        }
                    }
                }
                return possibleCells
            }
            const possibleCells = getPossibleCells(color)
            if (possibleCells.length <= 0) {
                const oppositeColor = color === BLACK ? WHITE : BLACK
                if (getPossibleCells(oppositeColor).length <= 0) {
                    // お互い置けない場合は強制終了
                    clearInterval(timerId)
                    this.handleEnd()
                } else {
                    // 相手が置ける場合は順番交代
                    drawerPointer = (++drawerPointer) % this.room.players.length
                    io.to(this.room.id).emit('reversi_pass')
                }
            }
            io.to(this.room.id).emit('reversi_drawer', drawerPointer)
            drawer = this.room.players[drawerPointer]
            setTimer(40)
            if (this.isCpuPlayer(drawer)) {
                setTimeout(() => {
                    if (this.ended) {
                        return
                    }
                    let cells = []
                    let changeCount
                    switch(this.getCpuProperty(drawer).difficulty) {
                        case EASY:
                            changeCount = Math.max(...possibleCells.map((pos) => pos.changes))
                            cells = possibleCells.filter((pos) => pos.changes === changeCount)
                            break
                        case NORMAL:
                            cells = possibleCells
                            break
                        case HARD:
                            // 角が取れれば角を取る
                            const corners = possibleCells.filter((pos) =>
                                pos.x === 0 && pos.y === 0
                                || pos.x === 0 && pos.y === 7
                                || pos.x === 7 && pos.y === 0
                                || pos.x === 7 && pos.y === 7)
                            if (corners.length > 0) {
                                cells = corners
                                break
                            }
                            // 端が取れれば端を取る
                            const edges = possibleCells.filter((pos) =>
                                pos.x === 0 || pos.x === 7
                                || pos.y === 0 || pos.y === 7)
                            if (edges.length > 0) {
                                cells = edges
                                break
                            }
                            let noneCount = 0
                            for (let y = 0; y < 8; y++) {
                                for (let x = 0; x < 8; x++) {
                                    if (field[y][x] === NONE) {
                                        noneCount++
                                    }
                                }
                            }
                            // 空きマスが32マスより少なければ裏返せる枚数が多いマス、32マス以上あれば裏返せる枚数が少ないマスを選ぶ
                            if (noneCount < 32) {
                                changeCount = Math.max(...possibleCells.map((pos) => pos.changes))
                            } else {
                                changeCount = Math.min(...possibleCells.map((pos) => pos.changes))
                            }
                            cells = possibleCells.filter((pos) => pos.changes === changeCount)
                            break
                        default:
                            break
                    }
                    const pos = cells[Math.floor(Math.random() * cells.length)]
                    handlePlace(pos.x, pos.y, drawer)
                }, 1200)
            }
        }
        const setCell = (x, y, color) => {
            field[y][x] = color
            io.to(this.room.id).emit('reversi_set', {x, y}, color)
        }
        const handlePlace = (x, y, player) => {
            if (this.ended) {
                return
            }
            const color = colors[player.id]
            const changes = getChanges(x, y, color)
            if (changes.length > 0) {
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
                const oppositePlayer = this.room.players.filter((p) => p.id !== player.id)[0]
                this.setScore(player, myStones)
                this.setScore(oppositePlayer, oppositeStones)
                if (oppositeStones === 0 || myStones + oppositeStones === 64) {
                    clearInterval(timerId)
                    this.handleEnd()
                } else {
                    changeDrawer(true)
                }
            }
        }
        this.room.players.forEach((player) => {
            this.setScore(player, 2) // 最初は2枚ずつ
        })
        this.getRealPlayers().forEach((player) => {
            const socket = this.server.getSocket(player)
            socket.emit('reversi_mycolor', colors[player.id])
            socket.on('reversi_place', ({x, y}) => handlePlace(x, y, player))
            socket.on('reversi_pass', () => {
                if (this.room.players[drawerPointer].id === player.id) {
                    io.to(this.room.id).emit('reversi_pass')
                    changeDrawer(true)
                }
            })
        })
        changeDrawer(false)
    }
}

module.exports = BoardGameReversi