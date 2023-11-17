import {
    BG_IN_GAME,
    BG_MENU,
    COLOR_DIVIDER,
    COLOR_FIRST,
    COLOR_GAME_FIRST,
    COLOR_SECOND,
    COLOR_TEXT_PRIMARY,
    COLOR_TEXT_WHITE,
    COLOR_THIRD, GAME_DAIFUGO, GAME_REVERSI, GAME_SINKEI, GAME_SPEED,
    MODE_CPU,
    MODE_FRIEND_MATCH, socket
} from "./game";
import {HEIGHT, SCENE_MATCHING, SCENE_REVERSI, SCENE_SINKEI, WIDTH} from "./scenes/scene_loader";
import {EASY, HARD, NORMAL} from "./cpuDifficulty";

const hexToStr = (hex) => `#${hex.toString(16)}`

export const drawBackground = (scene, bgType=BG_MENU) => {
    const graphics = scene.add.graphics()
    const bgTypeToColor = (bgType) => {
        switch (bgType) {
            case BG_MENU:
                return COLOR_FIRST
            case BG_IN_GAME:
                return COLOR_GAME_FIRST
            default:
                return 0x000000
        }
    }
    const color = bgTypeToColor(bgType)
    graphics.fillGradientStyle(color, color,0xFFFFFF, 0xFFFFFF)
    graphics.fillRect(0, 0, WIDTH+1, HEIGHT+1)
    return graphics
}

export const drawBlur = (scene) => {
    const objBlur = scene.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x000000, 0.5)
    objBlur.setInteractive()
    return objBlur
}

export const drawWindow = (scene, x, y, width, height, color) => {
    const gWindow = scene.add.graphics()
    gWindow.fillGradientStyle(color, color, 0xFFFFFF, 0xFFFFFF)
    gWindow.fillRect(x - width / 2, y, width, height)
    return gWindow
}

export const drawGameDetail = (scene, gameData, mode=-1) => {
    const {title, description} = gameData
    const objBlur = drawBlur(scene)
    const objWindow = drawWindow(scene, WIDTH / 2, 110, 356, 436, COLOR_FIRST)

    const objTextTitle = createText(scene, WIDTH / 2, 131, title, {fontSize: 36})
    const objTextDesc = createText(scene, WIDTH / 2, 470, description, {fontSize: 20})
    objTextDesc
        .setAlign('center') // 中央揃え
        .setOrigin(0.5, 1)
    const objects = [
        objBlur,
        objWindow,
        objTextTitle,
        objTextDesc,
    ]
    let objImgGame
    switch(gameData.id) {
        case GAME_SINKEI.id:
            objImgGame = scene.add.image(188, 181, gameData.id)
            objImgGame.setScale(0.3)
            objImgGame.setOrigin(0.5, 0)
            objects.push(objImgGame)
            break
        case GAME_REVERSI.id:
            objImgGame = scene.add.image(188, 181, gameData.id)
            objImgGame.setScale(0.38)
            objImgGame.setOrigin(0.5, 0)
            objects.push(objImgGame)
            break
        default:
            break
    }
    if (mode === -1) {
        const objBtnBack = createButton(scene, WIDTH / 2, 476, 325, 50, COLOR_SECOND, '閉じる', {fontSize: 24})
        objects.push(objBtnBack)
        objBtnBack.setOnClick(() => {
            objects.forEach((obj) => obj.destroy())
        })
    } else {
        const objBtnBack = createButton(scene, 20 + 90 / 2, 476, 90, 50, COLOR_SECOND, '戻る', {fontSize: 24})
        const objBtnPlay = createButton(scene, 130 + 216 / 2, 476, 216, 50, COLOR_SECOND, 'プレイ', {fontSize: 24})
        objects.push(objBtnBack, objBtnPlay)
        objBtnBack.setOnClick(() => {
            objects.forEach((obj) => obj.destroy())
        })
        objBtnPlay.setOnClick(() => {
            const objBlur = drawBlur(scene)
            if (mode === MODE_FRIEND_MATCH) {
                socket.emit('create_room', gameData, (roomId) => {
                    scene.moveTo(SCENE_MATCHING, {
                        gameData: gameData,
                        mode: mode,
                        initialPlayerCount: 1,
                        roomId: roomId,
                        isOwner: true
                    })
                })
                return
            } else if (mode === MODE_CPU) {
                const objWindow = drawWindow(scene, WIDTH / 2, 199, 362, 268, COLOR_FIRST)
                const objTextSelect = createText(scene, WIDTH / 2, 220, 'CPUの難易度を選択', {fontSize: 32})
                const objBtnEasy = createButton(scene, 30 + 100/2, 263, 100, 132, COLOR_SECOND, 'よわい', {fontSize: 24})
                const objBtnNormal = createButton(scene, 138 + 100/2, 263, 100, 132, COLOR_SECOND, 'ふつう', {fontSize: 24})
                const objBtnHard = createButton(scene, 246 + 100/2, 263, 100, 132, COLOR_SECOND, 'つよい', {fontSize: 24})
                const objBtnBack = createButton(scene, 30 + 316/2, 411, 316, 42, COLOR_SECOND, '戻る', {fontSize: 24})
                const requestStartCpu = (difficulty) => {
                    socket.emit('start_cpu', gameData, difficulty, (players) => {
                        if (!players) {
                            return
                        }
                        const data = {
                            players: players,
                            isRated: false
                        }
                        switch (gameData.id) {
                            case GAME_SINKEI.id:
                                scene.moveTo(SCENE_SINKEI, data)
                                break
                            case GAME_REVERSI.id:
                                scene.moveTo(SCENE_REVERSI, data)
                                break
                            default:
                                break
                        }
                    })
                }
                objBtnEasy.setOnClick(() => requestStartCpu(EASY))
                objBtnNormal.setOnClick(() => requestStartCpu(NORMAL))
                objBtnHard.setOnClick(() => requestStartCpu(HARD))
                objBtnBack.setOnClick(() => {
                    [objBlur, objWindow, objTextSelect, objBtnEasy, objBtnNormal, objBtnHard, objBtnBack].forEach((obj) => obj.destroy())
                })
                return
            }
            socket.emit('join_queue', gameData, mode, (success, playerCount) => {
                if (success) {
                    scene.moveTo(SCENE_MATCHING, {gameData: gameData, mode: mode, initialPlayerCount: playerCount})
                } else {
                    const objWindow = drawWindow(scene, WIDTH / 2, 251, 275, 166, COLOR_FIRST)
                    const objText = createText(scene, WIDTH / 2, 288, '参加できませんでした', {fontSize: 24})
                    objText.setAlign('center')
                    objText.setOrigin(0.5, 0.25)
                    const objBtnBack = createButton(scene, WIDTH / 2, 342, 174, 50, COLOR_SECOND, 'OK', {fontSize: 24})
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
            })
        })
    }
}

export const createText = (scene, x, y, text, {color = 0x212121, fontSize = 24} = {}) => {
    const colorStr = hexToStr(color)
    const fontSizeStr = `${fontSize}px`
    const objText = scene.add.text(x, y, text, {fontSize: fontSizeStr, color: colorStr, fontStyle: 'bold'})
    objText.setOrigin(0.5, 0)
    return objText
}

export const createButton = (scene, x, y, width, height, color, textOrSvgPath, {fontSize = 48, isSvg = false, withoutShadow = false} = {}) => {
    y += height / 2
    const objRect = scene.add.rectangle(0, 0, width, height, color)
    objRect.setStrokeStyle(1, 0xBDBDBD)
    const container = scene.add.container(x, y)
    let objRectShadow
    if (!withoutShadow) {
        objRectShadow = scene.add.rectangle(5, 5, width, height, 0x000000)
        container.add(objRectShadow)
    }
    const createTextOrIcon = () => {
        if (isSvg) {
            return scene.add.image(0, 0, textOrSvgPath)
                .setTintFill(COLOR_TEXT_PRIMARY)
        } else {
            return createText(scene, 0, 0, textOrSvgPath, {fontSize: fontSize})
                .setOrigin(0.5, 0.5)
        }
    }
    const objTextOrIcon = createTextOrIcon()
    container.add([objRect, objTextOrIcon])
    container.setSize(width, height)
    container.setInteractive()
    const setReversedColor = (reversed) => {
        if (reversed) {
            objRect.setFillStyle(COLOR_THIRD)
            if (isSvg) {
                objTextOrIcon.setTintFill(COLOR_TEXT_WHITE)
            } else {
                objTextOrIcon.setColor(hexToStr(COLOR_TEXT_WHITE))
            }
        } else {
            objRect.setFillStyle(color)
            if (isSvg) {
                objTextOrIcon.setTintFill(COLOR_TEXT_PRIMARY)
            } else {
                objTextOrIcon.setColor(hexToStr(COLOR_TEXT_PRIMARY))
            }
        }
    }
    container.on('pointerover', () => {
        setReversedColor(true)
    })
    container.on('pointerout', () => {
        if (isPressed) {
            return
        }
        setReversedColor(false)
    })
    let isPressed = false
    container.setOnClick = (handleClick) => container.on('pointerup', handleClick)
    container.isPressed = () => isPressed
    container.setPressed = (flag) => {
        isPressed = flag
        if (isPressed) {
            setReversedColor(true)
            if (!withoutShadow) {
                objRect.x = 5
                objRect.y = 5
                objTextOrIcon.x = 5
                objTextOrIcon.y = 5
            }
        } else {
            setReversedColor(false)
            if (!withoutShadow) {
                objRect.x = 0
                objRect.y = 0
                objTextOrIcon.x = 0
                objTextOrIcon.x = 0
                objTextOrIcon.y = 0
            }
        }
    }
    return container
}

export const createCircleNumber = (scene, x, y, radius, color, num, textColor=COLOR_TEXT_PRIMARY) => {
    const objCircle = scene.add.circle(0, 0, radius, color)
    objCircle.setStrokeStyle(1, COLOR_DIVIDER)
    const objTextNumber = createText(scene, 0, 0, num.toString(), {color: textColor})
    objTextNumber.setOrigin(0.5)
    const container = scene.add.container(x, y, [objCircle, objTextNumber])
    container.setNumber = (n) => {
        objTextNumber.text = n.toString()
    }
    container.getNumber = () => parseInt(objTextNumber.text)
    container.setFontSize = (n) => objTextNumber.setFontSize(`${n}px`)
    return container
}

export const loadGameImages = (scene) => {
    const games = [
        GAME_SPEED,
        GAME_SINKEI,
        GAME_DAIFUGO,
        GAME_REVERSI
    ]
    games.forEach((game) => {
        scene.load.image(game.id, `assets/games/${game.id}.png`)
    })
}