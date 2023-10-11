import {
    BG_IN_GAME,
    BG_MENU,
    COLOR_FIRST,
    COLOR_GAME_FIRST, COLOR_SECOND
} from "./game";
import {HEIGHT, SCENE_MATCHING, WIDTH} from "./scenes/scene_loader";

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

export const drawGameDetail = (scene, gameData, withoutPlayButton=false) => {
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
    if (withoutPlayButton) {
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
            scene.scene.start(SCENE_MATCHING, {gameData: gameData})
        })
    }
}

export const createText = (scene, x, y, text, {color = 0x212121, fontSize = 24} = {}) => {
    const colorStr = `#${color.toString(16)}`
    const fontSizeStr = `${fontSize}px`
    const objText = scene.add.text(x, y, text, {fontSize: fontSizeStr, color: colorStr, fontStyle: 'bold'})
    objText.setOrigin(0.5, 0)
    return objText
}

export const createButton = (scene, x, y, width, height, color, text, {fontSize = 48} = {}) => {
    y += height / 2
    const objRect = scene.add.rectangle(0, 0, width, height, color)
    objRect.setStrokeStyle(1, 0xBDBDBD)
    const objRectShadow = scene.add.rectangle(5, 5, width, height, 0x000000)
    const objText = createText(scene, 0, 0, text, {fontSize: fontSize}).setOrigin(0.5, 0.5)
    const container = scene.add.container(x, y, [objRectShadow, objRect, objText])
    container.setSize(width, height)
    container.setInteractive()
    container.on('pointerover', () => {
        objRect.setFillStyle(0x1D566E)
        objText.setColor('#DEDEDE')
    })
    container.on('pointerout', () => {
        objRect.setFillStyle(color)
        objText.setColor('#212121')
    })
    container.setOnClick = (handleClick) => container.on('pointerup', handleClick)
    return container
}