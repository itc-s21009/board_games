import {SceneTitle} from "./scenes/scene_title.js";
import {HEIGHT, WIDTH} from "./scenes/scene_loader.js";
import {SceneSelectMode} from "./scenes/scene_select_mode";
import {SceneSelectGame} from "./scenes/scene_select_game";
import {SceneMatching} from "./scenes/scene_matching";
import {SceneSearchRoom} from "./scenes/scene_search_room";
import {SceneFriendMatch} from "./scenes/scene_friend_match";
import {SceneRanking} from "./scenes/scene_ranking";

export const COLOR_FIRST = 0x45eba5
export const COLOR_SECOND = 0x21aba5
export const COLOR_THIRD = 0x1d566e
export const COLOR_FOURTH = 0x163a5f
export const COLOR_TEXT_PRIMARY = 0x212121
export const COLOR_TEXT_SECONDARY = 0x757575
export const COLOR_TEXT_WHITE = 0xDEDEDE
export const COLOR_DIVIDER = 0xBDBDBD

export const COLOR_GAME_FIRST = 0xFFD6B6
export const COLOR_GAME_SECOND = 0xEA7362
export const COLOR_GAME_THIRD = 0xB74242
export const COLOR_GAME_FOURTH = 0x5C2626

export const BG_MENU = 0
export const BG_IN_GAME = 1

export const MODE_NORMAL = 0
export const MODE_CPU = 1
export const MODE_RATING = 2
export const MODE_FRIEND_MATCH = 3

export const GAME_SPEED = {
    title: 'スピード',
    description: '２人で行うゲームです。\n場のカードと数字が繋がるカードを\n出していき、全部出すと勝利です。',
    minPlayers: 2,
    maxPlayers: 2
}
export const GAME_SINKEI = {
    title: '神経衰弱',
    description: '２〜４人で行うゲームです。\n場のカードを２枚めくって\n同じ数字であればゲットできます。\nゲットした枚数が多い人が勝利です。',
    minPlayers: 2,
    maxPlayers: 4
}
export const GAME_DAIFUGO = {
    title: '大富豪',
    description: '４人で行うゲームです。\nルールは以下の通りです。' +
        '\n・スペード３' +
        '\n・４止め' +
        '\n・５スキップ' +
        '\n・７渡し' +
        '\n・８ぎり' +
        '\n・９栗拾い' +
        '\n・１０捨て' +
        '\n・Ｊバック' +
        '\n・Ｑボンバー' +
        '\n・Ｋリバース',
    minPlayers: 4,
    maxPlayers: 4
}
export const GAME_OSERO = {
    title: 'オセロ',
    description: '２人で行うゲームです。\nお馴染みのルールで遊べます。',
    minPlayers: 2,
    maxPlayers: 2
}

const socket = io()

const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    scene: [SceneTitle, SceneSelectMode, SceneSelectGame, SceneMatching, SceneSearchRoom, SceneFriendMatch, SceneRanking],
}

const game = new Phaser.Game(config)