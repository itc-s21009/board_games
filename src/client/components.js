import {
    BG_IN_GAME,
    BG_MENU,
    COLOR_DIVIDER,
    COLOR_FIRST,
    COLOR_FOURTH,
    COLOR_GAME_FIRST,
    COLOR_TEXT_PRIMARY
} from "./game";
import {HEIGHT, WIDTH} from "./scenes/scene_loader";

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
    return container
}