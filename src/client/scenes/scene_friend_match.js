import {SCENE_FRIEND_MATCH, SCENE_SEARCH_ROOM, SCENE_SELECT_GAME, SCENE_SELECT_MODE, WIDTH} from "./scene_loader";
import {createButton, createText, drawBackground} from "../components";
import {COLOR_SECOND, MODE_FRIEND_MATCH} from "../game";
import {BoardGameScene} from "./board_game_scene";

export class SceneFriendMatch extends BoardGameScene {
    constructor() {
        super(SCENE_FRIEND_MATCH);
    }

    create() {
        drawBackground(this)
        createText(this, WIDTH / 2, 46, 'フレンド対戦', {fontSize: 40})
        const btnCreate = createButton(this, WIDTH / 2, 138, 227, 159, COLOR_SECOND, '新しい部屋を\n作成する', {fontSize: 32})
        btnCreate.setOnClick(() => {
            this.moveTo(SCENE_SELECT_GAME, {mode: MODE_FRIEND_MATCH})
        })
        const btnJoin = createButton(this, WIDTH / 2, 348, 227, 159, COLOR_SECOND, '部屋に\n参加する', {fontSize: 32})
        btnJoin.setOnClick(() => {
            this.moveTo(SCENE_SEARCH_ROOM)
        })
        const btnBack = createButton(this, WIDTH / 2, 559, 275, 69, COLOR_SECOND, '戻る', {fontSize: 24})
        btnBack.setOnClick(() => {
            this.backToPrevScene()
        })
    }
}