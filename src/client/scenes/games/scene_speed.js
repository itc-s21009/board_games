import {InGameScene} from "./ingame_scene";
import {SCENE_SPEED, WIDTH} from "../scene_loader";
import {CARDS} from "../../cards";
import {COLOR_GAME_FIRST, COLOR_GAME_SECOND, COLOR_REVERSI_BACK} from "../../game";
import {createCircleNumber, createText, drawBlur} from "../../components";

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
        const registerCursorOverEvent = (objCard, conditionFunc = () => true) => {
            objCard.setInteractive()
            objCard.on('pointerover', () => {
                if (conditionFunc()) {
                    objCard.setTint(0x9999FF)
                }
            })
            objCard.on('pointerout', () => {
                if (conditionFunc()) {
                    objCard.clearTint()
                }
            })
        }
        const isFieldSelected = () => selectedSlot !== -1
        const getFieldPosition = (player, slot) => {
            const isMyself = this.isMyself(player)
            if (slot === -1) {
                return isMyself ? {x: 19, y: 512} : {x: 286, y: 55}
            }
            const offset = 70
            let x = 47 + offset*slot
            let y = isMyself ? 399 : 170
            return {x, y}
        }
        const getCenterPosition = (slot) => slot === LEFT ? ({x: 108, y: 284}) : ({x: 196, y: 284})
        const leftPos = getCenterPosition(LEFT)
        const leftCard = this.add.image(leftPos.x, leftPos.y, CARDS.BACK)
        leftCard.setScale(70 / 136)
        leftCard.setOrigin(0)
        leftCard.setVisible(false)
        registerCursorOverEvent(leftCard, isFieldSelected)
        centerCards[LEFT] = leftCard
        const rightPos = getCenterPosition(RIGHT)
        const rightCard = this.add.image(rightPos.x, rightPos.y, CARDS.BACK)
        rightCard.setScale(70 / 136)
        rightCard.setOrigin(0)
        rightCard.setVisible(false)
        registerCursorOverEvent(rightCard, isFieldSelected)
        centerCards[RIGHT] = rightCard
        const centerSlots = [LEFT, RIGHT]
        centerSlots.forEach((centerSlot) => {
            const centerCard = centerCards[centerSlot]
            centerCard.on('pointerup', () => {
                if (isFieldSelected()) {
                    centerCard.clearTint()
                    this.socketEmit('speed_place', selectedSlot, centerSlot, (success) => {
                        if (success) {
                            setSelectedSlot(-1)
                        }
                    })
                }
            })
        })
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
        const makeAnimation = async (from, to, type) => {
            if (!type) {
                return
            }
            const dummyCard = this.add.image(from.x, from.y, type)
            dummyCard.setScale(70 / 136)
            dummyCard.setOrigin(0)
            const animDuration = 200
            this.tweens.add({
                targets: dummyCard,
                x: to.x,
                y: to.y,
                ease: Phaser.Math.Easing.Cubic.In,
                duration: animDuration
            })
            await sleep(animDuration)
            dummyCard.destroy()
        }
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
            if (slot !== -1) {
                const card = getFieldCard(this.getPlayer(), slot)
                card.y -= offset
                card.setTint(0xFFFF99)
            }
            selectedSlot = slot
        }
        const getScore = (player) => scores[player.id].getScore()
        const setScore = (player, score) => scores[player.id].setScore(score)
        // {player.id: image[]}
        const objectsDeck = {}
        const updateDeck = (player) => {
            const deckCards = objectsDeck[player.id]
            deckCards.forEach((deckCard) => {
                deckCard.off('pointerover')
                deckCard.off('pointerout')
                deckCard.off('pointerup')
                deckCard.setVisible(false)
            })
            // 5枚ごとに1枚表示する(26枚の場合は5枚に設定)
            const fieldCardCount = fieldCards[player.id].filter((card) => card.getData('card') !== null).length
            const deckCardCount = getScore(player) - fieldCardCount
            const cardCount = deckCardCount >= 26 ? 5 : Math.ceil(deckCardCount / 5)
            for (let i = 0; i < cardCount; i++) {
                const deckCard = deckCards[i]
                deckCard.setVisible(true)
                // 一番上の1枚にクリック処理をつける
                if (this.isMyself(player) && i === cardCount - 1) {
                    registerCursorOverEvent(deckCard)
                    deckCard.on('pointerup', () => {
                        deckCard.clearTint()
                        setTimeout(() => {
                            deckCard.setTint(0x9999FF)
                        }, 40)
                        this.socketEmit('speed_pick_deck')
                    })
                }
            }
        }
        this.players.forEach((player) => {
            const isMyself = this.isMyself(player)
            let score = 26
            const objRectScore = this.add.rectangle(102, 537, 50, 50, COLOR_GAME_SECOND)
            objRectScore.setOrigin(0)
            const objTextScore = createText(this, 127, 547, score.toString())
            objTextScore.setAlign('center')
            const objTextName = createText(this, 162, 547, 'あなた', {color: 0xFFFFFF})
            objTextName.setStroke('0x000000', 3)
            objTextName.setOrigin(0)
            const container = this.add.container(0, 0, [objRectScore, objTextScore])

            const drawDeck = () => {
                const offset = 3
                objectsDeck[player.id] = []
                for (let i = 0; i < 5; i++) {
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
                    objectsDeck[player.id].push(objImgDeckBottom)
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
            }
            fieldCards[player.id] = []
            scores[player.id] = container
            drawDeck()
            updateDeck(player)
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
                    const isNotSelected = () => selectedSlot !== i
                    registerCursorOverEvent(objImgCard, isNotSelected)
                    objImgCard.on('pointerup', () => {
                        if (isNotSelected()) {
                            setSelectedSlot(i)
                        }
                    })
                }
                fieldCards[player.id][i] = objImgCard
            }
        })

        this.socketEmit('ready')

        this.socketOn('game_setscore', (playerIndex, score) => {
            const player = this.players[playerIndex]
            setScore(player, score)
            updateDeck(player)
        })

        this.socketOn('speed_set_field', async (playerIndex, slot, type) => {
            const player = this.players[playerIndex]
            await makeAnimation(getFieldPosition(player, -1), getFieldPosition(player, slot), type)
            setFieldCard(player, slot, type)
            updateDeck(player)
        })
        this.socketOn('speed_set_center', async (playerIndex, fieldSlot, centerSlot, type) => {
            const player = this.players[playerIndex]
            await makeAnimation(getFieldPosition(player, fieldSlot), getCenterPosition(centerSlot), type)
            setCenterCard(centerSlot, type)
        })
        this.socketOn('speed_bacchanko_select_wait', () => {
            setSelectedSlot(-1)
            const objBlur = drawBlur(this)
            const objRect = this.add.rectangle(1, 300, 374, 62, COLOR_GAME_SECOND)
            objRect.setStrokeStyle(5, 0x000000)
            objRect.setOrigin(0)
            const objText = createText(this, WIDTH / 2, 315, 'しばらくお待ちください', {color: 0xFFFFFF})
            objText.setStroke('0x000000', 3)
            const objects = [objBlur, objRect, objText]
            setTimeout(() => objects.forEach((obj) => obj.destroy()), 5000)
        })
        this.socketOn('speed_bacchanko_select', () => {
            setSelectedSlot(-1)
            const objBlur = drawBlur(this)
            const objects = [objBlur]
            const offset = 70
            const player = this.getPlayer()
            let selectedCard
            let selectedSlot = -1
            for (let i = 0; i < 4; i++) {
                const fieldCard = getFieldCard(player, i)
                if (!fieldCard || !fieldCard.getData('card')) {
                    continue
                }
                const objImgCard = this.add.image(47, 399, fieldCard.getData('card'))
                objImgCard.setScale(70 / 136)
                objImgCard.setOrigin(0)
                objImgCard.x += offset * i
                const isNotSelected = () => selectedSlot !== i
                registerCursorOverEvent(objImgCard, isNotSelected)
                objImgCard.on('pointerup', () => {
                    if (isNotSelected()) {
                        if (selectedCard) {
                            selectedCard.clearTint()
                        }
                        selectedSlot = i
                        selectedCard = objImgCard
                        objImgCard.setTint(0xFF99FF)
                        this.socketEmit('speed_bacchanko_select', selectedSlot)
                    }
                })
                objects.push(objImgCard)
            }
            const objRect = this.add.rectangle(1, 530, 374, 62, COLOR_GAME_SECOND)
            objRect.setStrokeStyle(5, 0x000000)
            objRect.setOrigin(0)
            const objText = createText(this, WIDTH / 2, 545, '出すカードを選んでください', {color: 0xFFFFFF})
            objText.setStroke('0x000000', 3)
            objects.push(objRect, objText)
            setTimeout(() => objects.forEach((obj) => obj.destroy()), 5000)
        })
        this.socketOn('speed_bacchanko_countdown', () => {
            let count = 3
            const objBlur = drawBlur(this)
            objBlur.setAlpha(0.01)
            const objCircleCount = createCircleNumber(this, WIDTH / 2, 230, 40, COLOR_GAME_FIRST, count)
            objCircleCount.setFontSize(64)
            const timerId = setInterval(() => {
                if (--count <= 0) {
                    objCircleCount.destroy()
                    objBlur.destroy()
                    clearInterval(timerId)
                    return
                }
                objCircleCount.setNumber(count)
            }, 1000)
        })
    }
}