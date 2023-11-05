import {BoardGameScene} from "./board_game_scene";
import {SCENE_RANKING, WIDTH} from "./scene_loader";
import {createButton, createCircleNumber, createText, drawBackground} from "../components";
import {COLOR_DIVIDER, COLOR_SECOND, COLOR_THIRD, GAME_DAIFUGO, GAME_REVERSI, GAME_SINKEI, GAME_SPEED} from "../game";

export class SceneRanking extends BoardGameScene {
    constructor() {
        super(SCENE_RANKING);
    }

    preload() {
        this.load.svg('up', 'assets/caret-up-fill.svg', {scale: 2.5})
        this.load.svg('left', 'assets/caret-left-fill.svg', {scale: 2.5})
        this.load.svg('right', 'assets/caret-right-fill.svg', {scale: 2.5})
        this.load.svg('down', 'assets/caret-down-fill.svg', {scale: 2.5})
        this.load.svg('top', 'assets/caret-top-fill.svg', {scale: 2.5})
        this.load.svg('bottom', 'assets/caret-bottom-fill.svg', {scale: 2.5})
    }

    create() {
        drawBackground(this)
        createText(this, WIDTH / 2, 46, 'ランキング', {fontSize: 48})
        const objBtnWins = createButton(this, 29 + 150/2, 104, 150, 50, COLOR_SECOND, '勝利数', {fontSize: 24})
        const objBtnRating = createButton(this, 193 + 150/2, 104, 150, 50, COLOR_SECOND, 'レート', {fontSize: 24})

        this.add.rectangle(19, 217, 8, 344, COLOR_SECOND)
            .setStrokeStyle(1, COLOR_DIVIDER)
            .setOrigin(0)
        this.add.rectangle(26 ,217, 323, 8, COLOR_SECOND)
            .setStrokeStyle(1, COLOR_DIVIDER)
            .setOrigin(0)
        this.add.rectangle(26, 553, 323, 8, COLOR_SECOND)
            .setStrokeStyle(1, COLOR_DIVIDER)
            .setOrigin(0)
        this.add.rectangle(26, 224, 323, 330, COLOR_THIRD)
            .setStrokeStyle(1, COLOR_DIVIDER)
            .setOrigin(0)

        const objBtnPrev = createButton(this, 82 + 39/2, 170, 39, 37, COLOR_SECOND, 'left', {isSvg: true})
        const objBtnNext = createButton(this, 248 + 39/2, 170, 39, 37, COLOR_SECOND, 'right', {isSvg: true})
        const objBtnFirst = createButton(this, 305 + 44 / 2, 224, 44, 45, COLOR_SECOND, 'top', {
                isSvg: true,
                withoutShadow: true
            })
        const objBtnUp = createButton(this, 305 + 44 / 2, 268, 44, 121, COLOR_SECOND, 'up', {
                isSvg: true,
                withoutShadow: true
            })
        const objBtnDown = createButton(this, 305 + 44 / 2, 388, 44, 121, COLOR_SECOND, 'down', {
                isSvg: true,
                withoutShadow: true
            })
        const objBtnLast = createButton(this, 305 + 44 / 2, 509, 44, 45, COLOR_SECOND, 'bottom', {
                isSvg: true,
                withoutShadow: true
            })
        const objTextGame = createText(this, WIDTH / 2, 174, '')
        const objBtnBack = createButton(this, WIDTH / 2, 582, 330, 69, COLOR_SECOND, '戻る', {fontSize: 24})
        objBtnBack.setOnClick(() => {
            this.backToPrevScene()
        })

        const topColors = [0xE4FF41, 0xAFAFAF, 0xCC6200]
        const reqData = {
            type: 'wins',
            gameName: 'sinkei'
        }
        const leaderboardObjects = []
        const displayData = (leaderboard) => {
            leaderboardObjects.splice(0).forEach((obj) => obj.destroy())
            const topColors = [0xE4FF41, 0xAFAFAF, 0xCC6200]
            leaderboard.forEach((data, i) => {
                const placement = i + 1
                const offsetY = i * 55
                if (placement <= 3) {
                    const color = topColors[i]
                    const objCirclePlacement = createCircleNumber(this, 60, 252 + offsetY, 20, color, placement)
                    objCirclePlacement.setFontSize(32)
                    const objGraphicsPlayer = this.add.graphics()
                    objGraphicsPlayer.fillGradientStyle(color, color, color, color)
                    objGraphicsPlayer.fillRect(90, 232 + offsetY, 205, 40)
                    leaderboardObjects.push(objCirclePlacement, objGraphicsPlayer)
                } else {
                    const objCirclePlacement = createCircleNumber(this, 60, 252 + offsetY, 20, COLOR_SECOND, placement)
                    objCirclePlacement.setFontSize(32)
                    const objGraphicsPlayer = this.add.graphics()
                    objGraphicsPlayer.fillGradientStyle(COLOR_SECOND, COLOR_SECOND, COLOR_SECOND, COLOR_SECOND)
                    objGraphicsPlayer.fillRect(90, 232 + offsetY, 205, 40)
                    leaderboardObjects.push(objCirclePlacement, objGraphicsPlayer)
                }
                const objTextPlayer = createText(this, 95, 242 + offsetY, data.name, {fontSize: 16})
                objTextPlayer.setOrigin(0)
                const objGraphicsScore = this.add.graphics()
                objGraphicsScore.fillStyle(COLOR_THIRD)
                objGraphicsScore.fillRoundedRect(220, 235 + offsetY, 70, 34, 10)
                const objTextScore = createText(this, 255, 242 + offsetY, data.score, {color: 0xE4FF41, fontSize: 20})
                const objDivider = this.add.line(26, 279 + offsetY, 0, 0, 279, 0, COLOR_DIVIDER)
                objDivider.setOrigin(0)
                leaderboardObjects.push(objTextPlayer, objGraphicsScore, objTextScore, objDivider)
            })
        }
        const cacheLeaderboard = {}
        const reqDataToKey = (reqData) => `${reqData.type}_${reqData.gameName}`
        const fetchData = (reqData) => {
            this.socketEmit('get_leaderboard', reqData, (leaderboard) => {
                const reqDataKey = reqDataToKey(reqData)
                cacheLeaderboard[reqDataKey] = leaderboard
                displayData(leaderboard)
            })
        }
        const refreshData = (reqData) => {
            const reqDataKey = reqDataToKey(reqData)
            const cache = cacheLeaderboard[reqDataKey]
            if (cache) {
                displayData(cache)
            } else {
                fetchData(reqData)
            }
        }
        let gamePointer = 0
        const games = [
            GAME_SPEED,
            GAME_SINKEI,
            GAME_DAIFUGO,
            GAME_REVERSI
        ]
        const setGame = (pointer) => {
            if (pointer < 0) {
                pointer = games.length - 1
            }
            gamePointer = pointer % games.length
            const game = games[gamePointer]
            reqData.gameName = game.id
            objTextGame.text = game.title
            refreshData(reqData)
        }
        const setType = (type) => {
            reqData.type = type
            refreshData(reqData)
        }

        objBtnWins.setOnClick(() => {
            setType('wins')
        })
        objBtnRating.setOnClick(() => {
            setType('rating')
        })
        objBtnNext.setOnClick(() => {
            setGame(++gamePointer)
        })
        objBtnPrev.setOnClick(() => {
            setGame(--gamePointer)
        })
    }
}