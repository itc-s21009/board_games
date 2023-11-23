import {BoardGameScene} from "./board_game_scene";
import {HEIGHT, SCENE_LOADING, SCENE_TITLE, WIDTH} from "./scene_loader";
import {createText, drawBackground, drawBlur, drawWindow} from "../components";
import {COLOR_FIRST, COLOR_GAME_THIRD, socket} from "../game";

export class SceneLoading extends BoardGameScene {
    constructor() {
        super(SCENE_LOADING);
    }

    create() {
        drawBackground(this)
        createText(this, WIDTH / 2, HEIGHT / 2, '読み込み中...')
        fetch(`./api/session`, {withCredentials: true})
            .then((r) => r.json())
            .then((data) => {
                const id = data.id
                socket.emit('get_name', id, (name) => {
                    if (name) {
                        this.internalData.player = {id: id.slice(0, 10), name: name}
                        this.moveTo(SCENE_TITLE)
                    } else {
                        drawBlur(this)
                        drawWindow(this, WIDTH / 2, HEIGHT / 2 - 30, 300, 80, COLOR_GAME_THIRD)
                        createText(this, WIDTH / 2, HEIGHT / 2, '複数タブが検出されました')
                    }
                })
            })
    }
}