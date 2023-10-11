import {SCENE_SELECT_GAME, SCENE_SELECT_MODE, WIDTH} from "./scene_loader";
import {createButton, createText, drawBackground} from "../components";
import {COLOR_SECOND} from "../game";

export class SceneSelectGame extends Phaser.Scene {
    constructor() {
        super({key: SCENE_SELECT_GAME});
    }

    create() {
        drawBackground(this)
        createText(this, WIDTH / 2, 46, 'ゲーム選択', {fontSize: 40})
        createText(this, WIDTH / 2, 130, 'ボタンを押すと\nルール説明を表示します')
            .setAlign('center')
        const btnSpeed = createButton(this, WIDTH / 4, 208, 168, 154, COLOR_SECOND,'スピード', {fontSize: 24})
        const btnSinkei = createButton(this, WIDTH / 4 + WIDTH / 2, 208, 168, 154, COLOR_SECOND,'神経衰弱', {fontSize: 24})
        const btnDaifugo = createButton(this, WIDTH / 4, 382, 168, 154, COLOR_SECOND,'大富豪', {fontSize: 24})
        const btnOsero = createButton(this, WIDTH / 4 + WIDTH / 2, 382, 168, 154, COLOR_SECOND,'オセロ', {fontSize: 24})
        const btnBack = createButton(this, WIDTH / 2, 566, 356, 69, COLOR_SECOND, '戻る', {fontSize: 24})
        btnBack.setOnClick(() => {
            this.scene.start(SCENE_SELECT_MODE)
        })
    }
}