import {SCENE_FRIEND_MATCH, SCENE_SEARCH_ROOM, WIDTH} from "./scene_loader";
import {createButton, createText, drawBackground, drawBlur, drawWindow} from "../components";
import {COLOR_DIVIDER, COLOR_FIRST, COLOR_FOURTH, COLOR_SECOND} from "../game";

export class SceneSearchRoom extends Phaser.Scene {
    constructor() {
        super({key: SCENE_SEARCH_ROOM});
    }

    create() {
        drawBackground(this)
        createText(this, WIDTH / 2, 46, '部屋番号を\n入力して参加', {fontSize: 32})
            .setAlign('center')
        this.add.rectangle(29 + 238 / 2, 151 + 51 / 2, 238, 51, COLOR_FOURTH)
            .setStrokeStyle(1, COLOR_DIVIDER)
        const objTextRoomId = createText(this, 42, 151 + 51 / 2, '',
            {color: 0xFFFFFF, fontSize: 36})
            .setOrigin(0, 0.5)
        let roomId = 0
        const updateTextRoomId = () => {
            if (roomId <= 0) {
                objTextRoomId.text = ''
            } else {
                objTextRoomId.text = roomId
            }
        }
        const inputNumber = (n) => {
            if (roomId >= 10000) {
                return
            }
            roomId *= 10
            roomId += n
            updateTextRoomId()
        }
        const handleBackspace = () => {
            roomId = Math.floor(roomId / 10)
            updateTextRoomId()
        }
        const handleClear = () => {
            roomId = 0
            updateTextRoomId()
        }
        const handleJoin = () => {
            if (roomId <= 0) {
                return
            }
            const objBlur = drawBlur(this)
            const objWindow = drawWindow(this, WIDTH / 2, 251, 275, 166, COLOR_FIRST)
            const objText = createText(this, WIDTH / 2, 288, '検索中...', {fontSize: 24})
            const objBtnBack = createButton(this, WIDTH / 2, 342, 174, 50, COLOR_SECOND, 'キャンセル', {fontSize: 24})
            const objects = [
                objBlur,
                objWindow,
                objText,
                objBtnBack
            ]
            let searching = true
            let found = false
            objBtnBack.setOnClick(() => {
                searching = false
                objects.forEach((obj) => obj.destroy())
            })
            // 「検索中...」のアニメーション処理
            let i = 0
            const taskId = setInterval(() => {
                if (found || !searching) {
                    clearInterval(taskId)
                    return
                }
                let s = '検索中'
                for (let j = 0; j < i%4; j++) {
                    s += '.'
                }
                objText.text = s
                i+=1
            }, 300)
            const handleNotFound = () => {
                if (found || !searching) {
                    return
                }
                searching = false
                objects.forEach((obj) => obj.destroy())
                const objBlur = drawBlur(this)
                const objWindow = drawWindow(this, WIDTH / 2, 251, 275, 166, COLOR_FIRST)
                const objText = createText(this, WIDTH / 2, 288, 'この番号の部屋は\n見つかりませんでした', {fontSize: 24})
                objText.setAlign('center')
                objText.setOrigin(0.5, 0.25)
                const objBtnBack = createButton(this, WIDTH / 2, 342, 174, 50, COLOR_SECOND, '戻る', {fontSize: 24})
                const objects2 = [
                    objBlur,
                    objWindow,
                    objText,
                    objBtnBack
                ]
                objBtnBack.setOnClick(() => {
                    objects2.forEach((obj) => obj.destroy())
                })
            }
            setTimeout(handleNotFound, 5000)
        }
        const objBtnJoin = createButton(this, 272 + 82 / 2, 151, 82, 51, COLOR_SECOND, '参加', {fontSize: 24})
        const objBtn7 = createButton(this, 29 + 82 / 2, 227, 82, 82, COLOR_SECOND, '7', {fontSize: 24})
        const objBtn8 = createButton(this, 110 + 82 / 2, 227, 82, 82, COLOR_SECOND, '8', {fontSize: 24})
        const objBtn9 = createButton(this, 191 + 82 / 2, 227, 82, 82, COLOR_SECOND, '9', {fontSize: 24})
        const objBtnBackspace = createButton(this, 272 + 82 / 2, 227, 82, 82, COLOR_SECOND, '１字\n削除', {fontSize: 24})
        const objBtn4 = createButton(this, 29 + 82 / 2, 308, 82, 82, COLOR_SECOND, '4', {fontSize: 24})
        const objBtn5 = createButton(this, 110 + 82 / 2, 308, 82, 82, COLOR_SECOND, '5', {fontSize: 24})
        const objBtn6 = createButton(this, 191 + 82 / 2, 308, 82, 82, COLOR_SECOND, '6', {fontSize: 24})
        const objBtnClear = createButton(this, 272 + 82 / 2, 308, 82, 82, COLOR_SECOND, 'クリア', {fontSize: 24})
        const objBtn1 = createButton(this, 29 + 82 / 2, 389, 82, 82, COLOR_SECOND, '1', {fontSize: 24})
        const objBtn2 = createButton(this, 110 + 82 / 2, 389, 82, 82, COLOR_SECOND, '2', {fontSize: 24})
        const objBtn3 = createButton(this, 191 + 82 / 2, 389, 82, 82, COLOR_SECOND, '3', {fontSize: 24})
        const objBtn0 = createButton(this, 29 + 244 / 2, 470, 244, 82, COLOR_SECOND, '0', {fontSize: 24})
        const objBtnEnter = createButton(this, 272 + 82 / 2, 389, 82, 163, COLOR_SECOND, '参加', {fontSize: 24})
        const objBtnBack = createButton(this, 29 + 328 / 2, 567, 330, 69, COLOR_SECOND, '戻る', {fontSize: 24})

        objBtn0.setOnClick(() => inputNumber(0))
        objBtn1.setOnClick(() => inputNumber(1))
        objBtn2.setOnClick(() => inputNumber(2))
        objBtn3.setOnClick(() => inputNumber(3))
        objBtn4.setOnClick(() => inputNumber(4))
        objBtn5.setOnClick(() => inputNumber(5))
        objBtn6.setOnClick(() => inputNumber(6))
        objBtn7.setOnClick(() => inputNumber(7))
        objBtn8.setOnClick(() => inputNumber(8))
        objBtn9.setOnClick(() => inputNumber(9))
        objBtnBackspace.setOnClick(() => handleBackspace())
        objBtnClear.setOnClick(() => handleClear())
        objBtnJoin.setOnClick(() => handleJoin())
        objBtnEnter.setOnClick(() => handleJoin())

        objBtnBack.setOnClick(() => {
            this.scene.start(SCENE_FRIEND_MATCH)
        })
    }
}