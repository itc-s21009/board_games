import {InGameScene} from "./ingame_scene";
import {SCENE_SPEED} from "../scene_loader";
import {CARDS} from "../../cards";
import {COLOR_GAME_SECOND, COLOR_REVERSI_BACK} from "../../game";
import {createText} from "../../components";

export class SceneSpeed extends InGameScene {
    constructor() {
        super(SCENE_SPEED);
    }

    preload() {
        Object.values(CARDS).forEach((cardId) => {
            this.load.image(cardId, `assets/cards/${cardId}.png`)
        })
    }

    create() {
        super.create()
        this.add.rectangle(3, 41, 369, 585, COLOR_REVERSI_BACK)
            .setOrigin(0)
            .setStrokeStyle(5, 0x000000)
        // {player.id: container}
        const scores = {}
        // {player.id: image[]}
        const fieldCards = {}
        // 選択中のカード 0〜3
        let selectedSlot = -1
        const [LEFT, RIGHT] = [0, 1]
        // [leftCardImage, rightCardImage]
        const centerCards = []
        const leftCard = this.add.image(108, 284, CARDS.BACK)
        leftCard.setScale(70 / 136)
        leftCard.setOrigin(0)
        leftCard.setVisible(false)
        centerCards[LEFT] = leftCard
        const rightCard = this.add.image(196, 284, CARDS.BACK)
        rightCard.setScale(70 / 136)
        rightCard.setOrigin(0)
        rightCard.setVisible(false)
        centerCards[RIGHT] = rightCard
        const setCard = (card, type) => {
            card.setData('card', type)
            if (type) {
                card.setVisible(true)
                card.setTexture(type)
            } else {
                card.setVisible(false)
            }
        }
        const setCenterCard = (centerSlot, type) => setCard(centerCards[centerSlot], type)
        const getFieldCard = (player, slot) => fieldCards[player.id][slot]
        const setFieldCard = (player, slot, type) => setCard(getFieldCard(player, slot), type)
        const setSelectedSlot = (slot) => {
            const offset = 10
            if (selectedSlot !== -1) {
                const card = getFieldCard(this.getPlayer(), selectedSlot)
                card.y += offset
                card.clearTint()
            }
            const card = getFieldCard(this.getPlayer(), slot)
            card.y -= offset
            card.setTint(0xFFFF99)
            selectedSlot = slot
        }
        this.players.forEach((player) => {
            const isMyself = this.isMyself(player)
            let score = 26
            const objRectScore = this.add.rectangle(102, 537, 50, 50, COLOR_GAME_SECOND)
            objRectScore.setOrigin(0)
            const objTextScore = createText(this, 127, 547, score.toString())
            objTextScore.setAlign('center')
            const objTextName = createText(this, 162, 547, 'あなた')
            objTextName.setOrigin(0)
            const container = this.add.container(0, 0, [objRectScore, objTextScore])

            const objectsDeck = []
            const drawDeck = () => {
                objectsDeck.forEach((obj) => {
                    obj.destroy()
                    container.remove(obj)
                })
                // 5枚ごとに1枚表示する(26枚の場合は5枚に設定)
                const cardCount = score >= 26 ? 5 : Math.ceil(score / 5)
                const offset = 3
                for (let i = 0; i < cardCount; i++) {
                    const objImgDeckBottom = this.add.image(19, 512, CARDS.BACK)
                    // 相手のデッキ表示位置
                    if (!isMyself) {
                        objImgDeckBottom.x = 286
                        objImgDeckBottom.y = 55
                    }
                    objImgDeckBottom.x -= offset*i
                    objImgDeckBottom.y -= offset*i
                    objImgDeckBottom.setScale(70 / 136)
                    objImgDeckBottom.setOrigin(0)
                    objImgDeckBottom.setInteractive()
                    // 一番上の1枚にクリック処理をつける
                    if (isMyself && i === cardCount - 1) {
                        objImgDeckBottom.on('pointerover', () => {
                            objImgDeckBottom.setTint(0x9999FF)
                        })
                        objImgDeckBottom.on('pointerout', () => {
                            objImgDeckBottom.clearTint()
                        })
                        objImgDeckBottom.on('pointerup', () => {
                            objImgDeckBottom.clearTint()
                            setTimeout(() => {
                                objImgDeckBottom.setTint(0x9999FF)
                            }, 40)
                            this.socketEmit('speed_pick_deck')
                        })
                    }
                    objectsDeck.push(objImgDeckBottom)
                    container.add(objImgDeckBottom)
                }
            }
            // 相手のスコア表示位置
            if (!isMyself) {
                objRectScore.x = 218
                objRectScore.y = 80
                objTextScore.x = 243
                objTextScore.y = 90
                objTextName.x = 213
                objTextName.y = 90
                objTextName.setAlign('right')
                objTextName.setOrigin(1, 0)
                objTextName.text = player.name
            }
            container.getScore = () => score
            container.setScore = (newScore) => {
                score = newScore
                objTextScore.text = score.toString()
                drawDeck()
            }
            drawDeck()
            scores[player.id] = container
            fieldCards[player.id] = []
            const offset = 70
            for (let i = 0; i < 4; i++) {
                const objImgCard = this.add.image(47, 399, CARDS.BACK)
                objImgCard.setScale(70 / 136)
                objImgCard.setOrigin(0)
                objImgCard.x += offset * i
                if (!isMyself) {
                    objImgCard.y = 170
                }
                objImgCard.setVisible(false)
                if (isMyself) {
                    const isSelected = () => selectedSlot === i
                    objImgCard.setInteractive()
                    objImgCard.on('pointerover', () => {
                        if (isSelected()) {
                            return
                        }
                        objImgCard.setTint(0x9999FF)
                    })
                    objImgCard.on('pointerout', () => {
                        if (isSelected()) {
                            return
                        }
                        objImgCard.clearTint()
                    })
                    objImgCard.on('pointerup', () => {
                        if (isSelected()) {
                            return
                        }
                        setSelectedSlot(i)
                    })
                }
                fieldCards[player.id][i] = objImgCard
            }
        })
        const getScore = (player) => scores[player.id].getScore()
        const setScore = (player, score) => scores[player.id].setScore(score)

        this.socketEmit('ready')

        this.socketOn('game_setscore', (playerIndex, score) => {
            const player = this.players[playerIndex]
            setScore(player, score)
        })

        this.socketOn('speed_set_field', (playerIndex, slot, type) => {
            setFieldCard(this.players[playerIndex], slot, type)
        })
        this.socketOn('speed_set_center', (playerIndex, centerSlot, type) => {
            setCenterCard(centerSlot, type)
        })
    }
}