import {SCENE_MATCHING, WIDTH} from "./scene_loader";
import {createButton, createText, drawBackground, drawGameDetail} from "../components";
import {COLOR_DIVIDER, COLOR_FOURTH, COLOR_SECOND, MODE_FRIEND_MATCH, MODE_NORMAL, socket} from "../game";
import {BoardGameScene} from "./board_game_scene";

export class SceneMatching extends BoardGameScene {
    constructor() {
        super(SCENE_MATCHING)
    }

    init(data) {
        super.init(data)
        this.gameData = data.gameData
        this.roomId = data.roomId
        this.mode = data.mode
        this.initialPlayerCount = data.initialPlayerCount
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
        if (this.mode === MODE_NORMAL) {
            const objTextPlayers = createText(this, WIDTH / 2, 358, `待機中：${this.initialPlayerCount}/${this.gameData.maxPlayers}人`, {fontSize: 32})
            socket.on('player_count', (count) => {
                objTextPlayers.text = `待機中：${count}/${this.gameData.maxPlayers}人`
            })
        }
        const btnInfo = createButton(this, 338, 297, 32, 32, COLOR_SECOND, '？', {fontSize: 24})
        btnInfo.setOnClick(() => {
            drawGameDetail(this, this.gameData)
        })
        const btnBack = createButton(this, WIDTH / 2, 489, 200, 100, COLOR_SECOND,'キャンセル', {fontSize: 32})
        btnBack.setOnClick(() => {
            socket.off('player_count')
            socket.emit('leave_normal', this.internalData.player, this.gameData)
            this.backToPrevScene()
        })
    }
}