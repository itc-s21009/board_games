export const createButton = (scene, x, y, width, height, color, text="") => {
    const objRect = scene.add.rectangle(0, 0, width, height, color)
    objRect.setStrokeStyle(1, 0xBDBDBD)
    const objRectShadow = scene.add.rectangle(5, 5, width, height, 0x000000)
    const objText = scene.add.text(0, 0, text, {fontSize: '48px', color: '#212121', fontStyle: 'bold'}).setOrigin(0.5, 0.5)
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