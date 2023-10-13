const path = require('path')
const outputFolder = path.join(__dirname, 'public', 'js')

module.exports = {
    entry: {
        game: './src/client/game.js',
        name: './src/server/clientJs/name.js'
    },
    output: {
        filename: "[name].js",
        path: outputFolder
    }
}
