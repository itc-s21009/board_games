const socket = io()

const WIDTH = 375
const HEIGHT = 667

const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    scene: {
        preload: preload,
        create: create,
        update: update
    },
}

const game = new Phaser.Game(config)

function preload() {

}

function create() {
    /**
     * @type {Phaser.Scene}
     */
    const scene = this
    const graphics = scene.add.graphics()
    graphics.fillGradientStyle(0x45EBA5, 0x45EBA5, 0xFFFFFF, 0xFFFFFF)
    graphics.fillRect(0, 0, WIDTH+1, HEIGHT+1)
    this.add.text(WIDTH/2, 85, 'ボードゲーム対戦', {fontSize: '40px', color: '#212121', fontStyle: 'bold'}).setOrigin(0.5, 0)
    const createButton = (x, y, width, height, color=0x21ABA5, text="") => {
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

    }
    createButton(WIDTH/2, 200/2 + 185, 275, 200, 0x21ABA5, 'プレイ')
    createButton(WIDTH/2, 200/2 + 436, 275, 200, 0x21ABA5, 'ランキング')
}

function update() {

}