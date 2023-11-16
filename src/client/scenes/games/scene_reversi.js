import {BoardGameScene} from "../board_game_scene";
import {SCENE_REVERSI, SCENE_TITLE, WIDTH} from "../scene_loader";
import {createButton, createCircleNumber, createText, drawBackground, drawBlur, drawWindow} from "../../components";
import {
    BG_IN_GAME,
    COLOR_DIVIDER,
    COLOR_GAME_FIRST,
    COLOR_GAME_SECOND, COLOR_GAME_THIRD,
    COLOR_REVERSI_BACK
} from "../../game";

export class SceneReversi extends BoardGameScene {
    constructor() {
        super(SCENE_REVERSI);
    }

    init(data) {
        super.init(data)
        this.players = data.players
        this.isRated = data.isRated
    }

    preload() {
        this.load.image('black', 'assets/reversi/black.png')
        this.load.image('white', 'assets/reversi/white.png')
        this.load.image('background', 'assets/reversi/background.png')
    }

    create() {
        drawBackground(this, BG_IN_GAME)
        const objTextState = createText(this, WIDTH / 2, 24, '', {fontSize: 16})
        const objTimer = createCircleNumber(this, 320 + 50/2, 5 + 25/2 + 25/2, 25, COLOR_GAME_SECOND, 0)
        const objBtnPass = createButton(this, WIDTH / 2, 545, 154, 83, COLOR_GAME_SECOND, 'パス！', {fontSize: 36})
        objBtnPass.setVisible(false)
        objBtnPass.setOnClick(() => {
            this.socketEmit('reversi_pass')
        })

        // フィールドを表現する多次元配列になる
        // {type: type, object: objImg}
        const field = []
        this.add.rectangle(WIDTH / 2, 150, 360, 362, COLOR_REVERSI_BACK)
            .setStrokeStyle(15, 0x000000)
            .setOrigin(0.5, 0)

        const NONE = 0
        const BLACK = 1
        const WHITE = 2

        let MY_COLOR

        const player = this.getPlayer()
        let drawer
        let drawCount = 0
        let isMyTurn = false

        let pos = {x: 0, y: 0}

        const setCell = (x, y, type) => {
            if (!field[y][x]) {
                return
            }
            const objImg = field[y][x].object
            field[y][x].type = type
            switch(type) {
                case BLACK:
                    objImg.setTexture('black')
                    break
                case WHITE:
                    objImg.setTexture('white')
                    break
                case NONE:
                    objImg.setTexture('background')
                    break
                default:
                    break
            }
            objImg.setInteractive()
            objImg.on('pointerover', () => {
                if (field[y][x].type === NONE && isMyTurn) {
                    objImg.setTexture(MY_COLOR === BLACK ? 'black' : 'white')
                    pos = {x, y}
                }
            })
            objImg.on('pointerout', () => {
                if (field[y][x].type === NONE && isMyTurn) {
                    objImg.setTexture('background')
                    pos = null
                }
            })
            objImg.on('pointerup', () => {
                if (field[y][x].type === NONE && isMyTurn) {
                    this.socketEmit('reversi_place', {x: x, y: y})
                }
            })
        }
        const getChanges = (x, y, color) => {
            if (field[y][x].type !== NONE) {
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
                    if (field[cy][cx].type === oppositeColor) {
                        foundOpposite = true
                        changesOnDirection.push({x: cx, y: cy})
                    } else if (foundOpposite && field[cy][cx].type === color) {
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

        for (let y = 0; y < 8; y++) {
            // y行を{}で埋める
            field[y] = Array(8).fill(null).map(() => ({}))
            for (let x = 0; x < 8; x++) {
                const offset = 43
                this.add.rectangle(15 + offset*x, 159 + offset*y, 44, 44, COLOR_REVERSI_BACK)
                    .setStrokeStyle(2, 0x000000)
                    .setOrigin(0)
                field[y][x] = {
                    type: BLACK,
                    object: this.add.image(37 + offset*x, 181 + offset*y, 'black')
                        .setOrigin(0.5)
                        .setScale(0.3)
                }
                setCell(x, y, NONE)
            }
        }
        setCell(3, 3, WHITE)
        setCell(3, 4, BLACK)
        setCell(4, 3, BLACK)
        setCell(4, 4, WHITE)

        let timerCount
        let timerId
        const setTimer = (sec) => {
            if (timerId) {
                clearInterval(timerId)
            }
            timerCount = sec
            const task = () => {
                objTimer.setNumber(timerCount)
                if (--timerCount < 0) {
                    clearInterval(timerId)
                }
            }
            task()
            timerId = setInterval(task, 1000)
        }
        this.socketOn('reversi_timer', setTimer)
        const isMyself = (victim) => player.id.startsWith(victim.id)

        const availableHintObjects = []
        const setDrawer = (drawerPointer) => {
            drawer = this.players[drawerPointer]
            if (isMyself(drawer)) {
                drawCount = 0
                objTextState.text = `あなたの番です`
                objTextState.setFontSize(28)
                isMyTurn = true
                const availablePositions = []
                for (let y = 0; y < 8; y++) {
                    for (let x = 0; x < 8; x++) {
                        if (getChanges(x, y, MY_COLOR).length > 0) {
                            availablePositions.push({x, y})
                        }
                    }
                }
                availablePositions.forEach(({x, y}) => {
                    const offset = 43
                    const objImageHint = this.add.image(37 + offset*x, 181 + offset*y, MY_COLOR === BLACK ? 'black' : 'white')
                        .setOrigin(0.5)
                        .setScale(0.08)
                    availableHintObjects.push(objImageHint)
                })
            } else {
                objTextState.text = `${drawer.name} の番です`
                objTextState.setFontSize(16)
                isMyTurn = false
                if (pos) {
                    const {x, y} = pos
                    field[y][x].object.setTexture('background')
                }
                availableHintObjects.splice(0).forEach((obj) => obj.destroy())
            }
            objBtnPass.setVisible(isMyTurn)
        }
        this.socketOn('reversi_drawer', setDrawer)

        this.socketOnce('reversi_mycolor', (color) => {
            MY_COLOR = color
            createText(this, WIDTH / 2, 65, 'あなた', {fontSize: 16})
            this.add.rectangle(WIDTH / 2, 95, 44, 44, COLOR_REVERSI_BACK)
                .setStrokeStyle(3, 0x000000)
                .setOrigin(0.5, 0)
            this.add.image(WIDTH / 2, 117, color === BLACK ? 'black' : 'white')
                .setOrigin(0.5)
                .setScale(0.3)
        })
        this.socketOn('reversi_set', ({x, y}, color) => {
            pos = null
            setCell(x, y, color)
        })
        this.socketOn('reversi_pass', () => {
            const objFieldCover = this.add.rectangle(WIDTH / 2, 150, 360, 362, 0x0000FF, 0)
                .setOrigin(0.5, 0)
            objFieldCover.setInteractive()
            const objWindow = drawWindow(this, WIDTH / 2, 270, 130, 80, COLOR_GAME_SECOND)
            const objTextPass = createText(this, WIDTH / 2, 300, 'パス')
            setTimeout(() => {
                [objFieldCover, objWindow, objTextPass].forEach((obj) => obj.destroy())
            }, 800)
        })

        this.socketEmit('ready')

        this.socketOnce('game_end', (scoreboard) => {
            clearInterval(timerId)
            let placement = 0
            for (let i = 0; i < scoreboard.length; i++) {
                const scoreDataList = scoreboard[i]
                const containsMyself = scoreDataList.filter((score) => isMyself(score)).length > 0
                if (containsMyself) {
                    placement = i+1
                    break
                }
            }

            const objects = []
            drawBlur(this)
            const objWindow = drawWindow(this, WIDTH / 2, 144, 285, !this.isRated ? 393 : 518, COLOR_GAME_FIRST)
            const objTextPlacement = createText(this, WIDTH / 2, 164, `ゲーム終了\n順位：${placement}位`)
            objects.push(objWindow, objTextPlacement)

            let i = 0
            scoreboard.forEach((scoreDataList, placement) => {
                scoreDataList.forEach((scoreData) => {
                    const offsetY = i*48
                    const objCirclePlacement = createCircleNumber(this, 87, 268 + offsetY, 20, COLOR_GAME_SECOND, placement + 1)
                    const objRect = this.add.rectangle(120, 248 + offsetY, 187, 38, COLOR_GAME_SECOND)
                        .setStrokeStyle(1, COLOR_DIVIDER)
                        .setOrigin(0)
                    const objTextName = createText(this, 120 + 10, 258 + offsetY, scoreData.name, {fontSize: 16})
                        .setOrigin(0)
                    const objCircleScore = createCircleNumber(this, 287, 268 + offsetY, 15, COLOR_GAME_THIRD, scoreData.score, 0xFFFF00)
                    objects.push(objCirclePlacement, objRect, objTextName, objCircleScore)
                    i++
                })
            })

            const objBtnBack = createButton(this, WIDTH / 2, 466, 192, 55, COLOR_GAME_SECOND, 'タイトルに戻る', {fontSize: 24})
            objBtnBack.setOnClick(() => {
                this.moveTo(SCENE_TITLE)
                this.clearHistory()
            })

            if (this.isRated) {
                objects.forEach((obj) => {
                    obj.y -= 72
                })
                objBtnBack.y += 40
                const myScore = scoreboard.find((scoreData) => this.getPlayer().id.startsWith(scoreData.id))
                const rating = myScore.rating
                const change = myScore.ratingChange
                const changeStr = change >= 0 ? `+${change}` : change
                createText(this, WIDTH / 2, 394, `レート変動\n${rating} => ${rating + change}\n(${changeStr})`)
                    .setAlign('center')
            }
        })
    }
}