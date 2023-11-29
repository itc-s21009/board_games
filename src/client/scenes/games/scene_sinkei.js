import {SCENE_SINKEI, WIDTH} from "../scene_loader";
import {createCircleNumber, createText} from "../../components";
import {COLOR_DIVIDER, COLOR_GAME_SECOND, COLOR_GAME_THIRD} from "../../game";
import {CARDS} from "../../cards";
import {InGameScene} from "./ingame_scene";

export class SceneSinkei extends InGameScene {
    constructor() {
        super(SCENE_SINKEI);
    }

    preload() {
        Object.values(CARDS).forEach((cardId) => {
            this.load.image(cardId, `assets/cards/${cardId}.png`)
        })
    }

    create() {
        super.create()
        const objTextState = createText(this, WIDTH / 2, 24, '', {fontSize: 16})
        const objTimer = createCircleNumber(this, 320 + 50/2, 5 + 25/2 + 25/2, 25, COLOR_GAME_SECOND, 0)

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

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
        const makeAnimation = async (card, type) => {
            const animDuration = 100
            const scaleX = card.scaleX
            this.tweens.add({
                targets: card,
                scaleX: 0,
                duration: animDuration
            })
            await sleep(animDuration)
            card.setTexture(type)
            card.setData('card', type)
            this.tweens.add({
                targets: card,
                scaleX: scaleX,
                duration: animDuration
            })
            await sleep(animDuration)
        }
        const setCard = async (x, y, type) => {
            cards[y][x].type = type
            if (cards[y][x].object) {
                cards[y][x].object.clearTint()
                if (type) {
                    await makeAnimation(cards[y][x].object, type)
                } else {
                    cards[y][x].object.destroy()
                    delete cards[y][x].object
                }
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
            container.handleDisconnect = () => {
                objRect.setFillStyle(COLOR_DIVIDER)
            }
            return container
        }
        const getScore = (player) => scores[player.id].getScore()
        const setScore = (player, score) => scores[player.id].setScore(score)

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

        this.socketOn('sinkei_timer', setTimer)
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

        const setDrawer = (drawerPointer) => {
            drawer = this.players[drawerPointer]
            if (this.isMyself(drawer)) {
                drawCount = 0
                objTextState.text = `あなたの番です`
                objTextState.setFontSize(28)
                isMyTurn = true
            } else {
                objTextState.text = `${drawer.name} の番です`
                objTextState.setFontSize(16)
                isMyTurn = false
                cards.flat().forEach((card) => {
                    if (card.object) {
                        card.object.clearTint()
                    }
                })
            }
        }
        this.socketOn('sinkei_drawer', setDrawer)
        this.socketOn('sinkei_set', ({x, y}, type) => {
            setCard(x, y, type)
        })
        this.socketOn('sinkei_delete', ({x, y}) => {
            setCard(x, y, null)
        })
        this.socketOn('sinkei_result', (pos1, pos2, isEqual) => {

        })
        this.socketOn('game_setscore', (playerIndex, score) => {
            const victim = this.players[playerIndex]
            if (!victim) {
                return
            }
            setScore(victim, score)
        })
        this.socketOn('game_disconnect', (playerIndex) => {
            const victim = this.players[playerIndex]
            if (!victim) {
                return
            }
            scores[victim.id].handleDisconnect()
            this.players.splice(playerIndex, 1)
        })
    }

    onGameEnd(scoreboard) {
        super.onGameEnd(scoreboard);
        clearInterval(this.timerId)
    }
}