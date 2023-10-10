const path = require('path')
const outputFolder = path.join(__dirname, 'public', 'js')

module.exports = {
    entry: './src/client/game.js',
    output: {
        filename: "game.js",
        path: outputFolder
    }
}
