import {SceneTitle} from "./scenes/scene_title.js";
import {HEIGHT, WIDTH} from "./scenes/scene_loader.js";

export const COLOR_FIRST = 0x45eba5
export const COLOR_SECOND = 0x21aba5
export const COLOR_THIRD = 0x1d566e
export const COLOR_FOURTH = 0x163a5f
export const COLOR_TEXT_PRIMARY = 0x212121
export const COLOR_TEXT_SECONDARY = 0x757575
export const COLOR_DIVIDER = 0xBDBDBD

export const COLOR_GAME_FIRST = 0xFFD6B6
export const COLOR_GAME_SECOND = 0xEA7362
export const COLOR_GAME_THIRD = 0xB74242
export const COLOR_GAME_FOURTH = 0x5C2626

export const BG_MENU = 0
export const BG_IN_GAME = 1

const socket = io()

const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    scene: [SceneTitle],
}

const game = new Phaser.Game(config)