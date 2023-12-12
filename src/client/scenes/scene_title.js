import {HEIGHT, SCENE_RANKING, SCENE_SELECT_MODE, SCENE_TITLE, WIDTH} from "./scene_loader";
import {createButton, createText, drawBackground} from "../components";
import {BoardGameScene} from "./board_game_scene";

export class SceneTitle extends BoardGameScene {
    constructor() {
        super(SCENE_TITLE);
    }

    create() {
        drawBackground(this)
        createText(this, WIDTH/2, 85, 'BOARD GAMES', {fontSize: 48})
        const btnPlay = createButton(this,WIDTH/2, 185, 275, 200, 0x21ABA5, 'プレイ')
        btnPlay.setOnClick(() => {
            this.moveTo(SCENE_SELECT_MODE)
        })
        const btnRanking = createButton(this,WIDTH/2, 436, 275, 200, 0x21ABA5, 'ランキング')
        btnRanking.setOnClick(() => {
            this.moveTo(SCENE_RANKING)
        })
    }
}