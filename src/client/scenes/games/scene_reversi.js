import {BoardGameScene} from "../board_game_scene";
import {SCENE_REVERSI, WIDTH} from "../scene_loader";
import {createCircleNumber, createText, drawBackground} from "../../components";
import {BG_IN_GAME, COLOR_GAME_SECOND, COLOR_REVERSI_BACK, COLOR_TEXT_PRIMARY} from "../../game";

export class SceneReversi extends BoardGameScene {
    constructor() {
        super(SCENE_REVERSI);
    }

    init(data) {
        super.init(data)
        this.players = data.players
    }

    preload() {
        this.load.image('black', 'assets/reversi/black.png')
        this.load.image('white', 'assets/reversi/white.png')
    }

    create() {
        drawBackground(this, BG_IN_GAME)
        const objTextState = createText(this, WIDTH / 2, 24, '', {fontSize: 16})
        const objTimer = createCircleNumber(this, 320 + 50/2, 5 + 25/2 + 25/2, 25, COLOR_GAME_SECOND, 0)

        // フィールドを表現する多次元配列になる
        // {type: type, object: objImg}
        const field = []

        const NONE = 0
        const BLACK = 1
        const WHITE = 2

        const setCell = (x, y, type) => {
            if (!field[y][x]) {
                return
            }
            const objImg = field[y][x].object
            switch(type) {
                case BLACK:
                    objImg.setVisible(true)
                    objImg.setTexture('black')
                    break
                case WHITE:
                    objImg.setVisible(true)
                    objImg.setTexture('white')
                    break
                case NONE:
                    objImg.setVisible(false)
                    break
                default:
                    break
            }
        }

        for (let y = 0; y < 8; y++) {
            // y行を{}で埋める
            field[y] = Array(8).fill(null).map(() => ({}))
            for (let x = 0; x < 8; x++) {
                const offset = 43
                this.add.rectangle(15 + offset*x, 159 + offset*y, 44, 44, COLOR_REVERSI_BACK)
                    .setStrokeStyle(2, 0x000000)
                    .setOrigin(0)
                field[y][x] = {
                    type: BLACK,
                    object: this.add.image(37 + offset*x, 181 + offset*y, 'black')
                        .setOrigin(0.5)
                        .setScale(0.3)
                }
                setCell(x, y, NONE)
            }
        }
        setCell(3, 3, BLACK)
        setCell(3, 4, WHITE)
        setCell(4, 3, WHITE)
        setCell(4, 4, BLACK)
    }
}