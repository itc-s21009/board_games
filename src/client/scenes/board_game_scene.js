import {socket} from "../game";

export class BoardGameScene extends Phaser.Scene {
    constructor(key) {
        super({key: key});
    }

    init(data) {
        this.internalData = data.internalData ?? {}

        this.internalData.prevScenes = this.internalData.prevScenes ?? []
        if (!this.internalData.playerName) {
            fetch(`http://localhost:8080/api/name`, {withCredentials: true})
                .then((r) => r.json())
                .then((data) => {
                    console.log('name fetched')
                    this.internalData.playerName = data.name
                })
        }

        this.passedData = data ?? {}
        delete this.passedData.internalData
    }

    getPlayerName() {
        return this.internalData.playerName
    }

    moveTo(key, data = {}) {
        this.internalData.prevScenes.push({key: this.scene.key, data: this.passedData})
        this.scene.start(key, {internalData: this.internalData, ...data})
    }

    backToPrevScene() {
        const prevScene = this.internalData.prevScenes.pop()
        if (prevScene) {
            this.scene.start(prevScene.key, {internalData: this.internalData, ...prevScene.data})
        }
    }
}