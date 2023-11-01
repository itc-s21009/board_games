import {BoardGameScene} from "../board_game_scene";
import {SCENE_REVERSI, WIDTH} from "../scene_loader";
import {createCircleNumber, createText, drawBackground} from "../../components";
import {BG_IN_GAME, COLOR_GAME_SECOND, COLOR_REVERSI_BACK, COLOR_TEXT_PRIMARY} from "../../game";

export class SceneReversi extends BoardGameScene {
    constructor() {
        super(SCENE_REVERSI);
    }

    init(data) {
        super.init(data)
        this.players = data.players
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

        const setDrawer = (drawerPointer) => {
            drawer = this.players[drawerPointer]
            if (isMyself(drawer)) {
                drawCount = 0
                objTextState.text = `あなたの番です`
                objTextState.setFontSize(28)
                isMyTurn = true
            } else {
                objTextState.text = `${drawer.name} の番です`
                objTextState.setFontSize(16)
                isMyTurn = false
                if (pos) {
                    const {x, y} = pos
                    field[y][x].object.setTexture('background')
                }
            }
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
            setCell(x, y, color)
        })

        this.socketEmit('ready')
    }
}