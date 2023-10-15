import {BoardGameScene} from "../board_game_scene";
import {SCENE_SINKEI} from "../scene_loader";
import {drawBackground} from "../../components";
import {BG_IN_GAME} from "../../game";

export class SceneSinkei extends BoardGameScene {
    constructor() {
        super(SCENE_SINKEI);
    }

    init(data) {
        super.init(data)
        this.players = data.players
    }

    create() {
        drawBackground(this, BG_IN_GAME)
    }
}