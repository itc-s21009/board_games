import {BoardGameScene} from "../board_game_scene";
import {createButton, createCircleNumber, createText, drawBackground, drawBlur, drawWindow} from "../../components";
import {BG_IN_GAME, COLOR_DIVIDER, COLOR_GAME_FIRST, COLOR_GAME_SECOND, COLOR_GAME_THIRD} from "../../game";
import {SCENE_TITLE, WIDTH} from "../scene_loader";

export class InGameScene extends BoardGameScene {
    constructor(key) {
        super(key);
    }

    init(data) {
        super.init(data)
    }

    create() {
        drawBackground(this, BG_IN_GAME)

        let everyoneReady = false
        const handleTimeout = () => {
            if (everyoneReady) {
                return
            }
            drawBlur(this)
            drawWindow(this, WIDTH / 2, 204, 285, 177, COLOR_GAME_FIRST)
            createText(this, WIDTH / 2, 224, `ゲームを読み込み\nできませんでした`)
                .setAlign('center')
                .setOrigin(0.5, 0)
            const objBtnBack = createButton(this, WIDTH / 2, 306, 192, 55, COLOR_GAME_SECOND, 'タイトルに戻る', {fontSize: 24})
            objBtnBack.setOnClick(() => {
                this.moveTo(SCENE_TITLE)
                this.clearHistory()
            })
        }
        this.socketOnce('ready', () => everyoneReady = true)
        setTimeout(handleTimeout, 5000)

        this.socketOnce('game_end', (scoreboard) => {
            this.onGameEnd(scoreboard)
        })
    }

    isMyself(victim) {
        return this.getPlayer().id.startsWith(victim.id)
    }

    onGameEnd(scoreboard) {
        let placement = 0
        for (let i = 0; i < scoreboard.length; i++) {
            const scoreDataList = scoreboard[i]
            const containsMyself = scoreDataList.filter((score) => this.isMyself(score)).length > 0
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
                const color = scoreData.disconnected ? COLOR_DIVIDER : COLOR_GAME_SECOND
                const objCirclePlacement = createCircleNumber(this, 87, 268 + offsetY, 20, color, placement + 1)
                const objRect = this.add.rectangle(120, 248 + offsetY, 187, 38, color)
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
            const myScore = scoreboard.flat().find((score) => this.isMyself(score))
            const rating = myScore.rating
            const change = myScore.ratingChange
            const changeStr = change >= 0 ? `+${change}` : change
            createText(this, WIDTH / 2, 394, `レート変動\n${rating} => ${rating + change}\n(${changeStr})`)
                .setAlign('center')
        }
    }
}