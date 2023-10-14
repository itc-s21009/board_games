import {SCENE_MATCHING, SCENE_SELECT_GAME, WIDTH} from "./scene_loader";
import {createButton, createText, drawBackground, drawGameDetail} from "../components";
import {COLOR_SECOND, GAME_DAIFUGO, GAME_OSERO, GAME_SINKEI, GAME_SPEED} from "../game";
import {BoardGameScene} from "./board_game_scene";

export class SceneSelectGame extends BoardGameScene {
    constructor() {
        super(SCENE_SELECT_GAME);
    }

    init(data) {
        super.init(data)
        this.mode = data.mode
    }

    create() {
        drawBackground(this)
        createText(this, WIDTH / 2, 46, 'ゲーム選択', {fontSize: 40})
        createText(this, WIDTH / 2, 130, 'ボタンを押すと\nルール説明を表示します')
            .setAlign('center')
        const btnSpeed = createButton(this, WIDTH / 4, 208, 168, 154, COLOR_SECOND,'スピード', {fontSize: 24})
        btnSpeed.setOnClick(() => {
            drawGameDetail(this, GAME_SPEED, this.mode)
        })
        const btnSinkei = createButton(this, WIDTH / 4 + WIDTH / 2, 208, 168, 154, COLOR_SECOND,'神経衰弱', {fontSize: 24})
        btnSinkei.setOnClick(() => {
            drawGameDetail(this, GAME_SINKEI, this.mode)
        })
        const btnDaifugo = createButton(this, WIDTH / 4, 382, 168, 154, COLOR_SECOND,'大富豪', {fontSize: 24})
        btnDaifugo.setOnClick(() => {
            drawGameDetail(this, GAME_DAIFUGO, this.mode)
        })
        const btnOsero = createButton(this, WIDTH / 4 + WIDTH / 2, 382, 168, 154, COLOR_SECOND,'オセロ', {fontSize: 24})
        btnOsero.setOnClick(() => {
            drawGameDetail(this, GAME_OSERO, this.mode)
        })
        const btnBack = createButton(this, WIDTH / 2, 566, 356, 69, COLOR_SECOND, '戻る', {fontSize: 24})
        btnBack.setOnClick(() => {
            this.backToPrevScene()
        })
    }
}