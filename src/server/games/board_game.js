const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()

class BoardGame {
    constructor(room, isRated) {
        this.server = require("../server")
        this.room = room
        this.isRated = isRated
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

        if (this.isRated) {
            this.playersJoined.forEach(async (player) => {
                await prisma.rating.findFirst({
                    where: {
                        user: {
                            sessionId: player.id
                        },
                        game: {
                            name: this.room.gameData.id
                        }
                    }
                }).then((ratingData) => {
                    player.rating = ratingData.rating
                })
            })
        }
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

    async storeResultsToDatabase(gameName, scoreboard) {
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
                isRated: this.isRated,
                duration: this.duration,
                ...userData
            },
        })
        if (this.isRated) {
            for (let i = 0; i < scoreboard.length; i++) {
                const scoreData = scoreboard[i]
                await prisma.rating.findFirst({
                    where: {
                        user: {
                            sessionId: {
                                startsWith: scoreData.id
                            }
                        },
                        game: {
                            name: this.room.gameData.id
                        }
                    }
                }).then((ratingData) => {
                    scoreData.rating = ratingData.rating
                })
            }
            const K = 32
            const E = (player, opponent) => 1 / (1 + 10 ** ((opponent - player) / 400))
            const S = (rank) => {
                const S = [
                    [1.0, 0.0],
                    [1.0, 0.25, 0.0],
                    [1.0, 0.75, 0.25, 0.0]
                ]
                return S[this.playersJoined.length - 2][rank - 1]
            }
            const ratingFirst = scoreboard[0].rating
            const ratingLast = scoreboard[scoreboard.length - 1].rating
            for (let i = 0; i < scoreboard.length; i++) {
                const scoreData = scoreboard[i]
                const change = Math.ceil(K * (S(i + 1) - E(ratingFirst, ratingLast)))
                console.log(`${scoreData.name}: ${scoreData.rating} => ${scoreData.rating + change}`)
                scoreData.rating += change
                await prisma.rating.updateMany({
                    data: {
                        rating: scoreData.rating
                    },
                    where: {
                        user: {
                            sessionId: {
                                startsWith: scoreData.id
                            }
                        },
                        game: {
                            name: this.room.gameData.id
                        }
                    }
                })
            }
        }
    }

    async handleEnd() {
        if (this.ended) {
            return
        }
        this.ended = true
        clearInterval(this.durationTimerId)
        const scoreboard = this.createScoreboard()
        await this.storeResultsToDatabase(this.room.gameData.id, scoreboard)
        this.server.io.to(this.room.id).emit('game_end', scoreboard)
        this.room.players.forEach((p) => {
            const socket = this.server.getSocket(p)
            socket.removeAllListeners()
            this.server.leaveRoom(socket, this.room.id)
            this.server.registerListeners(socket)
        })
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