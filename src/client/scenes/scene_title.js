import {HEIGHT, SCENE_SELECT_MODE, SCENE_TITLE, WIDTH} from "./scene_loader";
import {createButton, createText, drawBackground} from "../components";

export class SceneTitle extends Phaser.Scene {
    constructor() {
        super({key: SCENE_TITLE});
    }

    create() {
        drawBackground(this)
        createText(this, WIDTH/2, 85, 'ボードゲーム対戦', {fontSize: 40})
        const btnPlay = createButton(this,WIDTH/2, 185, 275, 200, 0x21ABA5, 'プレイ')
        btnPlay.setOnClick(() => {
            this.scene.start(SCENE_SELECT_MODE)
        })
        const btnRanking = createButton(this,WIDTH/2, 436, 275, 200, 0x21ABA5, 'ランキング')
    }
}