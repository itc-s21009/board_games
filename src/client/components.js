import {
    BG_IN_GAME,
    BG_MENU,
    COLOR_FIRST,
    COLOR_GAME_FIRST, COLOR_SECOND, COLOR_TEXT_PRIMARY, COLOR_TEXT_WHITE, MODE_FRIEND_MATCH, socket
} from "./game";
import {HEIGHT, SCENE_MATCHING, WIDTH} from "./scenes/scene_loader";

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
                        roomId: roomId
                    })
                })
                return
            }
            socket.emit('join_normal', gameData, (success, playerCount) => {
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
    if (!withoutShadow) {
        const objRectShadow = scene.add.rectangle(5, 5, width, height, 0x000000)
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
    container.on('pointerover', () => {
        objRect.setFillStyle(0x1D566E)
        if (isSvg) {
            objTextOrIcon.setTintFill(COLOR_TEXT_WHITE)
        } else {
            objTextOrIcon.setColor(hexToStr(COLOR_TEXT_WHITE))
        }
    })
    container.on('pointerout', () => {
        objRect.setFillStyle(color)
        if (isSvg) {
            objTextOrIcon.setTintFill(COLOR_TEXT_PRIMARY)
        } else {
            objTextOrIcon.setColor(hexToStr(COLOR_TEXT_PRIMARY))
        }
    })
    container.setOnClick = (handleClick) => container.on('pointerup', handleClick)
    return container
}

export const createCircleNumber = (scene, x, y, radius, color, num) => {
    const objCircle = scene.add.circle(0, 0, radius, color)
    objCircle.setStrokeStyle(1, COLOR_DIVIDER)
    const objTextNumber = createText(scene, 0, -(radius/2), num.toString())
    const container = scene.add.container(x, y, [objCircle, objTextNumber])
    container.setNumber = (n) => {
        objTextNumber.text = n.toString()
    }
    return container
}