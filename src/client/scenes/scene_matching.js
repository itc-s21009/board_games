import {SCENE_MATCHING, SCENE_SELECT_GAME, WIDTH} from "./scene_loader";
import {createButton, createText, drawBackground, drawGameDetail} from "../components";
import {COLOR_FOURTH, COLOR_SECOND} from "../game";

export class SceneMatching extends Phaser.Scene {
    constructor() {
        super({key: SCENE_MATCHING})
    }

    init(data) {
        this.gameData = data.gameData
        this.roomId = data.roomId
    }

    create() {
        drawBackground(this)
        if (this.roomId) {
            this.add.rectangle(WIDTH / 2, 66, 295, 59, COLOR_FOURTH)
            createText(this, WIDTH / 2, 66, `部屋番号：${this.roomId}`, {color: 0xFFFFFF, fontSize: 32})
                .setOrigin(0.5, 0.5)
        }
        createText(this, WIDTH / 2, 150, '対戦相手を\n待っています', {fontSize: 48})
            .setAlign('center')
        createText(this, WIDTH / 2, 294, `ゲーム：${this.gameData.title}`, {fontSize: 32})
        createText(this, WIDTH / 2, 358, `待機中：1/${this.gameData.maxPlayers}人`, {fontSize: 32})
        const btnInfo = createButton(this, 338, 297, 32, 32, COLOR_SECOND, '？', {fontSize: 24})
        btnInfo.setOnClick(() => {
            drawGameDetail(this, this.gameData, true)
        })
        const btnBack = createButton(this, WIDTH / 2, 489, 200, 100, COLOR_SECOND,'キャンセル', {fontSize: 32})
        btnBack.setOnClick(() => {
            this.scene.start(SCENE_SELECT_GAME)
        })
    }
}