export class BoardGameScene extends Phaser.Scene {
    constructor(key) {
        super({key: key});
    }

    init(data) {
        this.prevScenes = data.prevScenes ?? []
        this.passedData = data ?? {}
        delete this.passedData.prevScenes
    }

    moveTo(key, data = {}) {
        this.prevScenes.push({key: this.scene.key, data: this.passedData})
        this.scene.start(key, {prevScenes: this.prevScenes, ...data})
    }

    backToPrevScene() {
        const prevScene = this.prevScenes.pop()
        if (prevScene) {
            this.scene.start(prevScene.key, {prevScenes: this.prevScenes, ...prevScene.data})
        }
    }
}