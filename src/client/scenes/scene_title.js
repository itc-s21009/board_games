import {HEIGHT, SCENE_TITLE, WIDTH} from "./scene_loader";
import {createButton} from "../components";

export class SceneTitle extends Phaser.Scene {
    constructor() {
        super({key: SCENE_TITLE});
    }

    create() {
        const graphics = this.add.graphics()
        graphics.fillGradientStyle(0x45EBA5, 0x45EBA5, 0xFFFFFF, 0xFFFFFF)
        graphics.fillRect(0, 0, WIDTH+1, HEIGHT+1)
        this.add.text(WIDTH/2, 85, 'ボードゲーム対戦', {fontSize: '40px', color: '#212121', fontStyle: 'bold'}).setOrigin(0.5, 0)
        createButton(this,WIDTH/2, 200/2 + 185, 275, 200, 0x21ABA5, 'プレイ')
        createButton(this,WIDTH/2, 200/2 + 436, 275, 200, 0x21ABA5, 'ランキング')

    }
}