const CARDS = {
    C_1: 'club_01',
    C_2: 'club_02',
    C_3: 'club_03',
    C_4: 'club_04',
    C_5: 'club_05',
    C_6: 'club_06',
    C_7: 'club_07',
    C_8: 'club_08',
    C_9: 'club_09',
    C_10: 'club_10',
    C_11: 'club_11',
    C_12: 'club_12',
    C_13: 'club_13',
    D_1: 'diamond_01',
    D_2: 'diamond_02',
    D_3: 'diamond_03',
    D_4: 'diamond_04',
    D_5: 'diamond_05',
    D_6: 'diamond_06',
    D_7: 'diamond_07',
    D_8: 'diamond_08',
    D_9: 'diamond_09',
    D_10: 'diamond_10',
    D_11: 'diamond_11',
    D_12: 'diamond_12',
    D_13: 'diamond_13',
    H_1: 'heart_01',
    H_2: 'heart_02',
    H_3: 'heart_03',
    H_4: 'heart_04',
    H_5: 'heart_05',
    H_6: 'heart_06',
    H_7: 'heart_07',
    H_8: 'heart_08',
    H_9: 'heart_09',
    H_10: 'heart_10',
    H_11: 'heart_11',
    H_12: 'heart_12',
    H_13: 'heart_13',
    S_1: 'spade_01',
    S_2: 'spade_02',
    S_3: 'spade_03',
    S_4: 'spade_04',
    S_5: 'spade_05',
    S_6: 'spade_06',
    S_7: 'spade_07',
    S_8: 'spade_08',
    S_9: 'spade_09',
    S_10: 'spade_10',
    S_11: 'spade_11',
    S_12: 'spade_12',
    S_13: 'spade_13',
    BACK: 'back',
    JOKER: 'joker',
    JOKER_BLACK: 'joker_black',
}
const shuffle = (array) => {
    const newArray = [...array]
    for (let i = array.length - 1; i >= 0; i--) {
        let j = Math.floor(Math.random() * i);
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }
    return newArray
}

module.exports = {CARDS, shuffle}