import {HEIGHT, SCENE_MATCHING, SCENE_REVERSI, SCENE_SINKEI, SCENE_SPEED, WIDTH} from "./scene_loader";
import {
    createButton,
    createText,
    drawBackground,
    drawBlur,
    drawGameDetail,
    drawWindow,
    loadGameImages
} from "../components";
import {
    COLOR_DIVIDER, COLOR_FIRST,
    COLOR_FOURTH,
    COLOR_SECOND, COLOR_THIRD, GAME_REVERSI, GAME_SINKEI, GAME_SPEED,
    MODE_FRIEND_MATCH, MODE_RATING,
    socket
} from "../game";
import {BoardGameScene} from "./board_game_scene";

export class SceneMatching extends BoardGameScene {
    constructor() {
        super(SCENE_MATCHING)
    }

    preload() {
        loadGameImages(this)
    }

    init(data) {
        super.init(data)
        this.gameData = data.gameData
        this.roomId = data.roomId
        this.mode = data.mode
        this.initialPlayerCount = data.initialPlayerCount
        this.isOwner = data.isOwner ?? false
    }

    create() {
        drawBackground(this)
        if (this.roomId) {
            this.add.rectangle(WIDTH / 2, 66, 295, 59, COLOR_FOURTH)
                .setStrokeStyle(1, COLOR_DIVIDER)
            createText(this, WIDTH / 2, 66, `部屋番号：${this.roomId}`, {color: 0xFFFFFF, fontSize: 32})
                .setOrigin(0.5, 0.5)
        }
        createText(this, WIDTH / 2, 150, '対戦相手を\n待っています', {fontSize: 48})
            .setAlign('center')
        createText(this, WIDTH / 2, 294, `ゲーム：${this.gameData.title}`, {fontSize: 32})
        const objTextPlayers = createText(this, WIDTH / 2, 358, `待機中：${this.initialPlayerCount}/${this.gameData.maxPlayers}人`, {fontSize: 32})
        this.socketOn('player_count', (count) => {
            objTextPlayers.text = `待機中：${count}/${this.gameData.maxPlayers}人`
        })
        const btnInfo = createButton(this, 338, 297, 32, 32, COLOR_SECOND, '？', {fontSize: 24})
        btnInfo.setOnClick(() => {
            drawGameDetail(this, this.gameData)
        })
        const btnBack = createButton(this, WIDTH / 2, 489, 200, 100, COLOR_SECOND,'キャンセル', {fontSize: 32})
        btnBack.setOnClick(() => {
            if (this.mode === MODE_FRIEND_MATCH) {
                socket.emit('leave_room', this.roomId)
            } else {
                socket.emit('leave_queue')
            }
            this.backToPrevScene()
        })
        if (this.mode === MODE_FRIEND_MATCH && this.isOwner) {
            btnBack.y = 569
            const btnStart = createButton(this, WIDTH / 2, 409, 200, 100, COLOR_SECOND,'ゲーム開始！', {fontSize: 32})
            btnStart.setOnClick(() => {
                socket.emit('start_private', this.roomId, (error) => {
                    if (!error) {
                        return
                    }
                    const objBlur = drawBlur(this)
                    const objWindow = drawWindow(this, WIDTH / 2, HEIGHT / 2 - 70, 340, 150, COLOR_FIRST)
                    const objText = createText(this, WIDTH / 2, HEIGHT / 2 - 40, error)
                    const objBtnBack = createButton(this, WIDTH / 2, HEIGHT / 2, 200, 50, COLOR_SECOND, 'OK', {fontSize: 24})
                    objBtnBack.setOnClick(() => {
                        [objBlur, objWindow, objText, objBtnBack]
                            .forEach((obj) => obj.destroy())
                    })
                })
            })
        }
        this.socketOn('match_found', (players) => {
            drawBlur(this)
            drawWindow(this, WIDTH / 2, 84, 300, 469, COLOR_FIRST)
            createText(this, WIDTH / 2, 109, '対戦相手が見つかりました')
            this.add.rectangle(WIDTH / 2, 151 + 359/2, 250, 359, COLOR_THIRD)
            createText(this, WIDTH / 2, 159, `${this.gameData.title}\n(${players.length}/${this.gameData.maxPlayers})`, {color: 0xFFFFFF})
                .setAlign('center')

            players.forEach((player, i) => {
                this.add.rectangle(WIDTH / 2, 225 + 40/2 + i*48, 205, 40, COLOR_SECOND)
                    .setStrokeStyle(1, COLOR_DIVIDER)
                createText(this, 92, 225 + 40/2 + i*48, player.name, {fontSize: 16})
                    .setOrigin(0, 0.5)
            })

            this.socketOnce('match_go', () => {
                const data = {
                    players: players,
                    isRated: this.mode === MODE_RATING
                }
                switch (this.gameData.id) {
                    case GAME_SINKEI.id:
                        this.moveTo(SCENE_SINKEI, data)
                        break
                    case GAME_REVERSI.id:
                        this.moveTo(SCENE_REVERSI, data)
                        break
                    case GAME_SPEED.id:
                        this.moveTo(SCENE_SPEED, data)
                        break
                    default:
                        break
                }
            })

            this.socketOnce('match_disconnected', () => {
                drawBlur(this)
                drawWindow(this, WIDTH / 2, HEIGHT / 2 - 70, 270, 150, COLOR_FIRST)
                createText(this, WIDTH / 2, HEIGHT / 2 - 40, '誰かが切断しました')
                const objBtnBack = createButton(this, WIDTH / 2, HEIGHT / 2, 200, 50, COLOR_SECOND, '戻る', {fontSize: 24})
                objBtnBack.setOnClick(() => {
                    this.backToPrevScene()
                })

                this.socketOff('match_go')
            })
        })
    }
}