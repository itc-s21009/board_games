import {BoardGameScene} from "./board_game_scene";
import {SCENE_RANKING, WIDTH} from "./scene_loader";
import {createButton, createText, drawBackground} from "../components";
import {COLOR_DIVIDER, COLOR_SECOND, COLOR_THIRD} from "../game";

export class SceneRanking extends BoardGameScene {
    constructor() {
        super(SCENE_RANKING);
    }

    preload() {
        this.load.svg('up', 'assets/caret-up-fill.svg', {scale: 2.5})
        this.load.svg('left', 'assets/caret-left-fill.svg', {scale: 2.5})
        this.load.svg('right', 'assets/caret-right-fill.svg', {scale: 2.5})
        this.load.svg('down', 'assets/caret-down-fill.svg', {scale: 2.5})
        this.load.svg('top', 'assets/caret-top-fill.svg', {scale: 2.5})
        this.load.svg('bottom', 'assets/caret-bottom-fill.svg', {scale: 2.5})
    }

    create() {
        drawBackground(this)
        createText(this, WIDTH / 2, 46, 'ランキング', {fontSize: 48})
        createButton(this, 29 + 150/2, 104, 150, 50, COLOR_SECOND, '勝利数', {fontSize: 24})
        createButton(this, 193 + 150/2, 104, 150, 50, COLOR_SECOND, 'レート', {fontSize: 24})

        this.add.rectangle(19 + 8/2, 217 + 344/2, 8, 344, COLOR_SECOND)
            .setStrokeStyle(1, COLOR_DIVIDER)
        this.add.rectangle(26 + 323/2, 217 + 8/2, 323, 8, COLOR_SECOND)
            .setStrokeStyle(1, COLOR_DIVIDER)
        this.add.rectangle(26 + 323/2, 553 + 8/2, 323, 8, COLOR_SECOND)
            .setStrokeStyle(1, COLOR_DIVIDER)
        this.add.rectangle(26 + 323/2, 224 + 330/2, 323, 330, COLOR_THIRD)
            .setStrokeStyle(1, COLOR_DIVIDER)

        const objBtnPrev = createButton(this, 82 + 39/2, 170, 39, 37, COLOR_SECOND, 'left', {isSvg: true})
        const objBtnNext = createButton(this, 248 + 39/2, 170, 39, 37, COLOR_SECOND, 'right', {isSvg: true})
        const objBtnFirst = createButton(this, 305 + 44 / 2, 224, 44, 45, COLOR_SECOND, 'top', {
                isSvg: true,
                withoutShadow: true
            })
        const objBtnUp = createButton(this, 305 + 44 / 2, 268, 44, 121, COLOR_SECOND, 'up', {
                isSvg: true,
                withoutShadow: true
            })
        const objBtnDown = createButton(this, 305 + 44 / 2, 388, 44, 121, COLOR_SECOND, 'down', {
                isSvg: true,
                withoutShadow: true
            })
        const objBtnLast = createButton(this, 305 + 44 / 2, 509, 44, 45, COLOR_SECOND, 'bottom', {
                isSvg: true,
                withoutShadow: true
            })
        const objTextGame = createText(this, WIDTH / 2, 174, 'オセロ')
        const objBtnBack = createButton(this, WIDTH / 2, 582, 330, 69, COLOR_SECOND, '戻る', {fontSize: 24})
        objBtnBack.setOnClick(() => {
            this.backToPrevScene()
        })
    }
}