import {SCENE_REVERSI, WIDTH} from "../scene_loader";
import {createButton, createCircleNumber, createText, drawBackground, drawWindow} from "../../components";
import {
    COLOR_GAME_SECOND, COLOR_REVERSI_BACK
} from "../../game";
import {InGameScene} from "./ingame_scene";

export class SceneReversi extends InGameScene {
    constructor() {
        super(SCENE_REVERSI);
    }

    preload() {
        this.load.image('black', 'assets/reversi/black.png')
        this.load.image('white', 'assets/reversi/white.png')
        this.load.image('background', 'assets/reversi/background.png')
    }

    create() {
        super.create()
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

        const TEXTURES = {
            [BLACK]: 'black',
            [WHITE]: 'white',
            [NONE]: 'background'
        }

        let MY_COLOR

        const player = this.getPlayer()
        let drawer
        let drawCount = 0
        let isMyTurn = false

        let pos = {x: 0, y: 0}

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
        const makeFlipAnimation = async (x, y, type) => {
            const obj = field[y][x].object
            if (field[y][x].type === NONE) {
                obj.setTexture(TEXTURES[type])
                return
            }
            const scaleX = obj.scaleX
            const scaleY = obj.scaleY
            const openScale = 0.03
            this.tweens.chain({
                tweens: [{
                    targets: obj,
                    scaleX: scaleX + openScale,
                    scaleY: scaleY + openScale,
                    duration: 50
                }, {
                    targets: obj,
                    scaleX: 0,
                    duration: 100,
                    onComplete: () => obj.setTexture(TEXTURES[type])
                }, {
                    targets: obj,
                    scaleX: scaleX + openScale,
                    duration: 100
                }, {
                    targets: obj,
                    scaleX: scaleX,
                    scaleY: scaleY,
                    duration: 50
                }]
            })
            await sleep(150)
        }
        const setCell = (x, y, type) => {
            if (!field[y][x]) {
                return
            }
            const objImg = field[y][x].object
            makeFlipAnimation(x, y, type)
            field[y][x].type = type
            objImg.setInteractive()
            objImg.on('pointerover', () => {
                if (field[y][x].type === NONE && isMyTurn) {
                    objImg.setTexture(MY_COLOR === BLACK ? TEXTURES[BLACK] : TEXTURES[WHITE])
                    pos = {x, y}
                }
            })
            objImg.on('pointerout', () => {
                if (field[y][x].type === NONE && isMyTurn) {
                    objImg.setTexture(TEXTURES[NONE])
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
                    type: NONE,
                    object: this.add.image(37 + offset*x, 181 + offset*y, TEXTURES[NONE])
                        .setOrigin(0.5)
                        .setScale(0.27)
                }
                setCell(x, y, NONE)
            }
        }
        setCell(3, 3, WHITE)
        setCell(3, 4, BLACK)
        setCell(4, 3, BLACK)
        setCell(4, 4, WHITE)

        let timerCount
        const setTimer = (sec) => {
            if (this.timerId) {
                clearInterval(this.timerId)
            }
            timerCount = sec
            const task = () => {
                objTimer.setNumber(timerCount)
                if (--timerCount < 0) {
                    clearInterval(this.timerId)
                }
            }
            task()
            this.timerId = setInterval(task, 1000)
        }
        this.socketOn('reversi_timer', setTimer)

        const availableHintObjects = []
        const setDrawer = (drawerPointer) => {
            drawer = this.players[drawerPointer]
            if (this.isMyself(drawer)) {
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
                    const objImageHint = this.add.image(37 + offset*x, 181 + offset*y, MY_COLOR === BLACK ? TEXTURES[BLACK] : TEXTURES[WHITE])
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
                    field[y][x].object.setTexture(TEXTURES[NONE])
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
            this.add.image(WIDTH / 2, 117, color === BLACK ? TEXTURES[BLACK] : TEXTURES[WHITE])
                .setOrigin(0.5)
                .setScale(0.27)
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
    }

    onGameEnd(scoreboard) {
        super.onGameEnd(scoreboard);
        clearInterval(this.timerId)
    }
}