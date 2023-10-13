import {socket} from "../game";

export class BoardGameScene extends Phaser.Scene {
    constructor(key) {
        super({key: key});
    }

    init(data) {
        this.internalData = data.internalData ?? {}

        this.internalData.prevScenes = this.internalData.prevScenes ?? []
        if (!this.internalData.player) {
            fetch(`http://localhost:8080/api/session`, {withCredentials: true})
                .then((r) => r.json())
                .then((data) => {
                    const id = data.id
                    socket.emit('get_name', id, (name) => {
                        this.internalData.player = {id: id, name: name}
                    })
                })
        }

        this.passedData = data ?? {}
        delete this.passedData.internalData
    }

    getPlayerName() {
        return this.internalData.player ? this.internalData.player.name : 'unknown'
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