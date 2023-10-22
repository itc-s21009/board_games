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
        const objTextState = createText(this, WIDTH / 2, 24, 'あなたの番です', {fontSize: 32})
        createCircleNumber(this, 320 + 50/2, 5 + 25/2 + 25/2, 25, COLOR_GAME_SECOND, 10)

        // (4, 5), (5, 6), (6, 7), (6, 8)
        // がちょうどいい
        const ROWS = 5
        const COLUMNS = 6

        const cards = []
        const cardObjects = []

        // {player.id: container}
        const scores = {}

        const setCard = (x, y, type) => {
            cards[y][x] = type
            drawCard(x, y, type)
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
            objImg.setScale(scale / 2)
            if (cardObjects[y][x]) {
                console.log(`destroy ${y} ${x} ${JSON.stringify(cardObjects[y][x])}`)
                cardObjects[y][x].destroy()
            }
            if (type === CARDS.BACK) {
                objImg.setInteractive()
                objImg.on('pointerover', () => {
                    objImg.setTint(0xFFFF00)
                })
                objImg.on('pointerout', () => {
                    objImg.clearTint()
                })
            }
            cardObjects[y][x] = objImg
        }
        const updateCards = () => {
            cardObjects.forEach((line) => line.forEach((c) => c.destroy()))
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

        // 全カードをウラ面としてセットする
        for (let y = 0; y < ROWS; y++) {
            cards[y] = []
            cardObjects[y] = []
            for (let x = 0; x < COLUMNS; x++) {
                setCard(x, y, CARDS.BACK)
            }
        }
        // 変数scoresに各プレイヤーのスコアを表示するcontainerをセットする
        this.players.forEach((p, i) => scores[p.id] = drawPlayer(p.name, i+1, 0))
    }
}