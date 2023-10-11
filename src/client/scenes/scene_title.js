import {HEIGHT, SCENE_TITLE, WIDTH} from "./scene_loader";
import {createButton, createText, drawBackground} from "../components";
import {COLOR_DIVIDER, COLOR_TEXT_PRIMARY} from "../game";

export class SceneTitle extends Phaser.Scene {
    constructor() {
        super({key: SCENE_TITLE});
    }

    create() {
        drawBackground(this)
        createText(this, WIDTH/2, 85, 'ボードゲーム対戦', {fontSize: 40})
        createButton(this,WIDTH/2, 200/2 + 185, 275, 200, 0x21ABA5, 'プレイ')
        createButton(this,WIDTH/2, 200/2 + 436, 275, 200, 0x21ABA5, 'ランキング')

    }
}