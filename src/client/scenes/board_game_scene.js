import {socket} from "../game";

export class BoardGameScene extends Phaser.Scene {
    constructor(key) {
        super({key: key});
    }

    init(data) {
        this.internalData = data.internalData ?? {}

        this.internalData.prevScenes = this.internalData.prevScenes ?? []

        this.passedData = data ?? {}
        delete this.passedData.internalData

        this.eventsListening = []
    }

    getPlayer() {
        return this.internalData.player
    }

    getPlayerName() {
        return this.internalData.player ? this.internalData.player.name : 'unknown'
    }

    moveTo(key, data = {}) {
        this.internalData.prevScenes.push({key: this.scene.key, data: this.passedData})
        this.eventsListening.forEach((e) => socket.off(e))
        this.scene.start(key, {internalData: this.internalData, ...data})
    }

    backToPrevScene() {
        const prevScene = this.internalData.prevScenes.pop()
        if (prevScene) {
            this.eventsListening.forEach((e) => socket.off(e))
            this.scene.start(prevScene.key, {internalData: this.internalData, ...prevScene.data})
        }
    }

    socketOn(eventName, listener) {
        if (this.eventsListening.includes(eventName)) {
            return
        }
        this.eventsListening.push(eventName)
        socket.on(eventName, listener)
    }

    socketOnce(eventName, listener) {
        if (this.eventsListening.includes(eventName)) {
            return
        }
        this.eventsListening.push(eventName)
        socket.once(eventName, (...args) => {
            listener(...args)
            this.eventsListening = this.eventsListening.filter((d) => d !== eventName)
        })
    }

    socketOff(eventName) {
        this.eventsListening = this.eventsListening.filter((d) => d !== eventName)
        socket.off(eventName)
    }

    socketOffAll() {
        this.eventsListening.forEach((eventName) => socket.off(eventName))
        this.eventsListening = []
    }

    socketEmit(eventName, ...args) {
        socket.emit(eventName, ...args)
    }

    clearHistory() {
        this.internalData.prevScenes = []
    }
}