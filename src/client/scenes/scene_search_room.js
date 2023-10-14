import {SCENE_MATCHING, SCENE_SEARCH_ROOM, WIDTH} from "./scene_loader";
import {createButton, createText, drawBackground, drawBlur, drawGameDetail, drawWindow} from "../components";
import {
    COLOR_DIVIDER,
    COLOR_FIRST,
    COLOR_FOURTH,
    COLOR_SECOND,
    COLOR_THIRD,
    MODE_FRIEND_MATCH,
    socket
} from "../game";
import {BoardGameScene} from "./board_game_scene";

export class SceneSearchRoom extends BoardGameScene {
    constructor() {
        super(SCENE_SEARCH_ROOM);
    }

    preload() {
        this.load.svg('backspace', 'assets/backspace-fill.svg', {scale: 3})
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
            const showMessageWindow = (msg) => {
                const objBlur = drawBlur(this)
                const objWindow = drawWindow(this, WIDTH / 2, 251, 275, 166, COLOR_FIRST)
                const objText = createText(this, WIDTH / 2, 288, msg, {fontSize: 24})
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
            const handleNotFound = () => {
                if (found || !searching) {
                    return
                }
                searching = false
                objects.forEach((obj) => obj.destroy())
                showMessageWindow('この番号の部屋は\n見つかりませんでした')
            }
            const handleFound = (room) => {
                if (found || !searching) {
                    return
                }
                searching = false
                found = true
                objects.forEach((obj) => obj.destroy())

                const objBlur = drawBlur(this)
                const objWindow = drawWindow(this, WIDTH / 2, 84, 275, 500, COLOR_FIRST)
                const objTextFound = createText(this, WIDTH / 2, 109, '部屋が見つかりました')
                const objRectField = this.add.rectangle(WIDTH / 2, 151 + 359/2, 250, 359, COLOR_THIRD)
                const objTextDetail = createText(this, WIDTH / 2, 159, `${room.gameData.title}\n(${room.players.length}/${room.gameData.maxPlayers})`, {color: 0xFFFFFF})
                objTextDetail.setAlign('center')
                const objBtnInfo = createButton(this, 261, 172, 32, 32, COLOR_SECOND, '?', {fontSize: 24})
                const objBtnBack = createButton(this, 62 + 100/2, 523, 100, 50, COLOR_SECOND, '戻る', {fontSize: 24})
                const objBtnJoin = createButton(this, 170 + 142/2, 523, 142, 50, COLOR_SECOND, '参加する', {fontSize: 24})

                const objects3 = [
                    objBlur,
                    objWindow,
                    objTextFound,
                    objRectField,
                    objTextDetail,
                    objBtnInfo,
                    objBtnBack,
                    objBtnJoin
                ]
                room.players.forEach((player, i) => {
                    const objRectName = this.add.rectangle(WIDTH / 2, 225 + 40/2 + i*48, 205, 40, COLOR_SECOND)
                    objRectName.setStrokeStyle(1, COLOR_DIVIDER)
                    const objTextName = createText(this, 92, 225 + 40/2 + i*48, player.name, {fontSize: 16})
                    objTextName.setOrigin(0, 0.5)
                    objects3.push(objRectName, objTextName)
                })

                objBtnBack.setOnClick(() => {
                    objects3.forEach((obj) => obj.destroy())
                })

                objBtnInfo.setOnClick(() => {
                    drawGameDetail(this, room.gameData)
                })

                objBtnJoin.setOnClick(() => {
                    socket.emit('join_room', roomId, (success) => {
                        if (success) {
                            this.moveTo(SCENE_MATCHING, {
                                gameData: room.gameData,
                                mode: MODE_FRIEND_MATCH,
                                initialPlayerCount: room.players.length + 1,
                                roomId: roomId
                            })
                        } else {
                            showMessageWindow('部屋に\n参加できませんでした')
                        }
                    })
                })
            }
            socket.emit('get_room', roomId, (room) => {
                if (room) {
                    handleFound(room)
                } else {
                    handleNotFound()
                }
            })
            //5秒探して見つからなければ終了
            setTimeout(handleNotFound, 5000)
        }
        const objBtnJoin = createButton(this, 272 + 82 / 2, 151, 82, 51, COLOR_SECOND, '参加', {fontSize: 24})
        const objBtn7 = createButton(this, 29 + 82 / 2, 227, 82, 82, COLOR_SECOND, '7', {fontSize: 24})
        const objBtn8 = createButton(this, 110 + 82 / 2, 227, 82, 82, COLOR_SECOND, '8', {fontSize: 24})
        const objBtn9 = createButton(this, 191 + 82 / 2, 227, 82, 82, COLOR_SECOND, '9', {fontSize: 24})
        const objBtnBackspace = createButton(this, 272 + 82 / 2, 227, 82, 82, COLOR_SECOND, 'backspace', {fontSize: 24, isSvg: true})
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
            this.backToPrevScene()
        })
    }
}