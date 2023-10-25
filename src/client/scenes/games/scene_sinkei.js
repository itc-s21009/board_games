import {BoardGameScene} from "../board_game_scene";
import {HEIGHT, SCENE_SINKEI, WIDTH} from "../scene_loader";
import {createCircleNumber, createText, drawBackground} from "../../components";
import {BG_IN_GAME, COLOR_DIVIDER, COLOR_GAME_SECOND, COLOR_GAME_THIRD} from "../../game";
import {CARDS} from "../../cards";

export class SceneSinkei extends BoardGameScene {
    constructor() {
        super(SCENE_SINKEI);
    }

    init(data) {
        super.init(data)
        this.players = data.players
    }

    preload() {
        Object.values(CARDS).forEach((cardId) => {
            this.load.image(cardId, `assets/cards/${cardId}.png`)
        })
    }

    create() {
        drawBackground(this, BG_IN_GAME)
        const objTextState = createText(this, WIDTH / 2, 24, '', {fontSize: 16})
        createCircleNumber(this, 320 + 50/2, 5 + 25/2 + 25/2, 25, COLOR_GAME_SECOND, 10)

        let ROWS
        let COLUMNS

        // フィールドを表現する多次元配列になる
        // {type: type, object: objImg}
        const cards = []

        // {player.id: container}
        const scores = {}

        const player = this.getPlayer()
        let drawer
        let drawCount = 0
        let isMyTurn = false

        const setCard = (x, y, type) => {
            cards[y][x].type = type
            if (cards[y][x].object) {
                const scale = cards[y][x].object.scaleX
                cards[y][x].object.setTexture(type)
                cards[y][x].object.setScale(scale)
                cards[y][x].object.setData('card', type)
            } else {
                drawCard(x, y, type)
            }
        }
        const drawCard = (x, y, type) => {
            const imgWidth = 136
            // const imgHeight = 200
            const marginX = 14
            const marginY = 85
            const areaWidth = WIDTH - marginX*2
            const areaHeight = 494 - marginY
            const cardWidth = areaWidth / COLUMNS
            const scale = cardWidth / imgWidth
            // const cardHeight = imgHeight * scale
            const cardHeight = areaHeight / ROWS
            const cardX = marginX + cardWidth/2 + x*(cardWidth)
            const cardY = marginY + cardHeight/2 + y*(cardHeight)

            const objImg = this.add.image(cardX, cardY, type)
            objImg.setScale(scale)
            if (cards[y][x].object) {
                console.log(`destroy object Y${y} X${x}`)
                cards[y][x].object.destroy()
                delete cards[y][x].object
            }
            objImg.setData('card', type)
            objImg.setInteractive()
            const isInteractive = () => isMyTurn && objImg.getData('card') === CARDS.BACK && drawCount < 2
            objImg.on('pointerover', () => {
                if (!isInteractive()) {
                    return
                }
                objImg.setTint(0x9999FF)
            })
            objImg.on('pointerout', () => {
                if (!isInteractive()) {
                    return
                }
                objImg.clearTint()
            })
            objImg.on('pointerup', () => {
                if (!isInteractive()) {
                    return
                }
                objImg.clearTint()
                drawCount++
                this.socketEmit('sinkei_pick', {x: x, y: y})
            })
            cards[y][x].object = objImg
        }
        const updateCards = () => {
            // カードの画像オブジェクトを一旦全て消す
            cards.flat().forEach((card) => {
                if (card.object) {
                    card.object.destroy()
                    delete card.object
                }
            })
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLUMNS; x++) {
                    drawCard(x, y, cards[y][x])
                }
            }
        }

        const drawPlayer = (name, pos, score) => {
            const width = 170
            const height = 57
            const textMargin = 10
            const x = pos % 2 === 0 ? WIDTH*0.25 : WIDTH*0.75
            const y = pos <= 2 ? 550 : 620
            const objRect = this.add.rectangle(0, 0, width, height, COLOR_GAME_SECOND)
            objRect.setStrokeStyle(1, COLOR_DIVIDER)
            const objText = createText(this, - width / 2 + textMargin, - height / 4, name, {fontSize: 14})
            objText.setOrigin(0)
            const objScore = createCircleNumber(this, width / 2 - 30, 0, 20, COLOR_GAME_THIRD, score, 0xFFFF00)
            const container = this.add.container(x, y, [objRect, objText, objScore])
            container.setScore = objScore.setNumber
            container.getScore = objScore.getNumber
            return container
        }
        const getScore = (player) => scores[player.id].getScore()
        const setScore = (player, score) => scores[player.id].setScore(score)

        this.socketOn('sinkei_areasize', (data) => {
            ROWS = data.ROWS
            COLUMNS = data.COLUMNS
            // 全カードをウラ面としてセットする
            for (let y = 0; y < ROWS; y++) {
                // y行を{}で埋める
                cards[y] = Array(COLUMNS).fill(null).map(() => ({}))
                for (let x = 0; x < COLUMNS; x++) {
                    setCard(x, y, CARDS.BACK)
                }
            }
        })
        // 変数scoresに各プレイヤーのスコアを表示するcontainerをセットする
        this.players.forEach((p, i) => scores[p.id] = drawPlayer(p.name, i+1, 0))

        this.socketEmit('ready')

        const isMyself = (victim) => player.id.startsWith(victim.id)

        this.socketOn('sinkei_drawer', (drawerPointer) => {
            drawer = this.players[drawerPointer]
            if (isMyself(drawer)) {
                drawCount = 0
                objTextState.text = `あなたの番です`
                isMyTurn = true
            } else {
                objTextState.text = `${drawer.name} の番です`
                isMyTurn = false
            }
        })
        this.socketOn('sinkei_open', ({x, y}, type) => {
            setCard(x, y, type)
        })
    }
}