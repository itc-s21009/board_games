import {SceneTitle} from "./scenes/scene_title.js";
import {HEIGHT, WIDTH} from "./scenes/scene_loader.js";

const socket = io()

const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    scene: [SceneTitle],
}

const game = new Phaser.Game(config)