import {
    SCENE_FRIEND_MATCH,
    SCENE_SELECT_GAME,
    SCENE_SELECT_MODE,
    SCENE_TITLE,
    WIDTH
} from "./scene_loader";
import {createButton, createText, drawBackground} from "../components";
import {COLOR_SECOND, MODE_CPU, MODE_NORMAL, MODE_RATING} from "../game";

export class SceneSelectMode extends Phaser.Scene {
    constructor() {
        super({key: SCENE_SELECT_MODE});
    }

    create() {
        drawBackground(this)
        createText(this, WIDTH / 2, 46, 'モード選択', {fontSize: 40})
        const btnNormal = createButton(this, WIDTH / 2, 143, 275, 69, COLOR_SECOND, '通常対戦', {fontSize: 24})
        btnNormal.setOnClick(() => {
            this.scene.start(SCENE_SELECT_GAME, {mode: MODE_NORMAL})
        })
        const btnCpu = createButton(this, WIDTH / 2, 247, 275, 69, COLOR_SECOND, 'CPU対戦', {fontSize: 24})
        btnCpu.setOnClick(() => {
            this.scene.start(SCENE_SELECT_GAME, {mode: MODE_CPU})
        })
        const btnRating = createButton(this, WIDTH / 2, 351, 275, 69, 0xA2AB21, 'レート対戦', {fontSize: 24})
        btnRating.setOnClick(() => {
            this.scene.start(SCENE_SELECT_GAME, {mode: MODE_RATING})
        })
        const btnFriend = createButton(this, WIDTH / 2, 455, 275, 69, 0x21AB23, 'フレンド対戦', {fontSize: 24})
        btnFriend.setOnClick(() => {
            this.scene.start(SCENE_FRIEND_MATCH)
        })
        const btnBack = createButton(this, WIDTH / 2, 559, 275, 69, COLOR_SECOND, '戻る', {fontSize: 24})
        btnBack.setOnClick(() => {
            this.scene.start(SCENE_TITLE)
        })
    }
}