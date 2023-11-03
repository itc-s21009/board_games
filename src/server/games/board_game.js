const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()

class BoardGame {
    constructor(room) {
        this.server = require("../server")
        this.room = room
        this.playersJoined = [...room.players]
        this.scores = {}
        this.duration = 0
        this.durationTimerId = setInterval(() => this.duration++, 1000)
        this.ended = false

        room.players.forEach((player) => {
            this.scores[player.id] = {name: player.name, score: 0}
            const socket = this.server.getSocket(player)
            socket.on('disconnecting', () => this.handleDisconnect(player))
        })
    }

    start() {}

    getScore(player) {
        return this.scores[player.id].score
    }

    setScore(player, score) {
        const playerIndex = this.room.players.indexOf(player)
        if (playerIndex === -1) {
            return
        }
        this.scores[player.id].score = score
        this.server.io.to(this.room.id).emit('game_setscore', playerIndex, score)
    }

    createScoreboard() {
        const nameScores = Object.keys(this.scores)
            .map((playerId) => (
                {
                    id: playerId.substring(0, 10),
                    name: this.scores[playerId].name,
                    score: this.scores[playerId].score
                }
            ))
        if (this.room.gameData.sortScoreInAsc) {
            return nameScores.sort((a, b) => a.score > b.score ? 1 : -1)
        } else {
            return nameScores.sort((a, b) => a.score < b.score ? 1 : -1)
        }
    }

    async storeResultsToDatabase(gameName) {
        const userData = {}
        const userColumnNames = ['user1', 'user2', 'user3', 'user4']
        const scoreColumnNames = ['score1', 'score2', 'score3', 'score4']
        for (let i = 0; i < this.playersJoined.length; i++) {
            const userColumnName = userColumnNames[i]
            const scoreColumnName = scoreColumnNames[i]
            const player = this.playersJoined[i]
            if (player) {
                userData[userColumnName] = {
                    connect: {
                        sessionId: player.id
                    }
                }
                userData[scoreColumnName] = this.getScore(player)
            }
        }
        await prisma.matchResult.create({
            data: {
                game: {
                    connect: {
                        name: gameName
                    }
                },
                isRated: false,
                duration: this.duration,
                ...userData
            },
        })
    }

    handleEnd() {
        if (this.ended) {
            return
        }
        this.ended = true
        clearInterval(this.durationTimerId)
        this.server.io.to(this.room.id).emit('game_end', this.createScoreboard())
        this.room.players.forEach((p) => {
            const socket = this.server.getSocket(p)
            socket.removeAllListeners()
            this.server.leaveRoom(socket, this.room.id)
            this.server.registerListeners(socket)
        })
        this.storeResultsToDatabase(this.room.gameData.id)
    }

    handleDisconnect(player)  {
        const playerIndex = this.room.players.indexOf(player)
        this.server.io.to(this.room.id).emit('game_disconnect', playerIndex)
        this.room.players.splice(playerIndex, 1)
        if (this.room.players.length <= 1) {
            this.handleEnd()
        }
    }
}

module.exports = BoardGame