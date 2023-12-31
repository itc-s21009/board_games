const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()

class BoardGame {
    constructor(room, isRated, cpuSettings) {
        this.server = require("../server")
        this.room = room
        this.isRated = isRated
        this.includeCpu = cpuSettings ? cpuSettings.cpus > 0 : false
        this.playersJoined = [...room.players]
        this.scores = {}
        this.taskIntervalIds = []
        this.taskTimeoutIds = []
        this.duration = 0
        this.durationTimerId = this.setInterval(() => this.duration++, 1000)
        this.ended = false

        this.room.players.forEach((player) => {
            this.scores[player.id] = {name: player.name, score: 0}
        })

        this.getRealPlayers().forEach((player) => {
            const socket = this.server.getSocket(player)
            socket.on('disconnecting', () => this.handleDisconnect(player))
        })

        if (this.isRated) {
            this.getRealPlayers().forEach(async (player) => {
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
        // cpuごとの保持データ {id: {}}
        this.cpuProperties = {}
        this.getCpuPlayers().forEach((cpuPlayer) => this.cpuProperties[cpuPlayer.id] = {})

        this.getCpuPlayers().forEach((cpuPlayer) => {
            const property = this.getCpuProperty(cpuPlayer)
            property.difficulty = cpuSettings.difficulty
        })
    }

    start() {}

    isCpuPlayer(player) {
        return player.id.startsWith('cpugamer_')
    }

    getRealPlayers() {
        return this.room.players.filter((player) => !this.isCpuPlayer(player))
    }

    getCpuPlayers() {
        return this.room.players.filter((player) => this.isCpuPlayer(player))
    }

    getCpuProperty(cpuPlayer) {
        return this.cpuProperties[cpuPlayer.id]
    }

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
        const playerIds = this.room.players.map((player) => player.id)
        const scoreDataList = Object.keys(this.scores)
            .map((playerId) => (
                {
                    id: playerId.substring(0, 10),
                    name: this.scores[playerId].name,
                    score: this.scores[playerId].score,
                    disconnected: !playerIds.includes(playerId)
                }
            ))
        const disconnectList = scoreDataList.filter((scoreData) => scoreData.disconnected)
        const notDisconnectList = scoreDataList.filter((scoreData) => !scoreData.disconnected)
        const sortedScoreDataList = this.room.gameData.sortScoreInAsc ?
            notDisconnectList.sort((a, b) => a.score > b.score ? 1 : -1) :
            notDisconnectList.sort((a, b) => a.score < b.score ? 1 : -1)

        // 同順位をまとめる [ scoreData[] ]
        const groupedScore = []
        for (let i = 0, placement = 0; i < sortedScoreDataList.length; i++) {
            const scoreData = sortedScoreDataList[i]
            const score = scoreData.score
            if (!groupedScore[placement]) {
                groupedScore[placement] = []
            } else if (groupedScore[placement][0].score !== score) {
                placement++
                groupedScore[placement] = []
            }
            groupedScore[placement].push(scoreData)
        }
        if (disconnectList.length > 0) {
            groupedScore.push(disconnectList)
        }
        return groupedScore
    }

    async storeResultsToDatabase(gameName, scoreboard) {
        if (this.includeCpu) {
            return
        }
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
        const isDraw = scoreboard.length <= 1
        // 引き分け数、勝利数、敗北数の加算処理
        if (isDraw) {
            for (const player of scoreboard) {
                await prisma.stat.updateMany({
                    where: {
                        user: {
                            sessionId: {
                                startsWith: player.id
                            }
                        },
                        game: {
                            name: gameName
                        },
                        isRated: this.isRated
                    },
                    data: {
                        draws: {
                            increment: 1
                        }
                    }
                })
            }
        } else {
            const winners = scoreboard[0]
            const losers = scoreboard.slice(1).flat()
            for (const winner of winners) {
                await prisma.stat.updateMany({
                    where: {
                        user: {
                            sessionId: {
                                startsWith: winner.id
                            }
                        },
                        game: {
                            name: gameName
                        },
                        isRated: this.isRated
                    },
                    data: {
                        wins: {
                            increment: 1
                        }
                    }
                })
            }
            for (const loser of losers) {
                await prisma.stat.updateMany({
                    where: {
                        user: {
                            sessionId: {
                                startsWith: loser.id
                            }
                        },
                        game: {
                            name: gameName
                        },
                        isRated: this.isRated
                    },
                    data: {
                        losses: {
                            increment: 1
                        }
                    }
                })
            }
        }
        if (this.isRated) {
            for (const scoreData of scoreboard.flat()) {
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
            if (isDraw) {
                // isDraw が true なら scoreboard の要素数は1個になっている
                scoreboard[0].forEach((scoreData) => scoreData.ratingChange = 0)
                return
            }
            const base = 32
            const getMultiplier = (rank) => {
                const S = [
                    [0.0],
                    [1.0, -1.0],
                    [1.0, -0.5, -1.0],
                    [1.0, 0.5, -0.5, -1.0]
                ]
                return S[scoreboard.length - 1][rank - 1]
            }
            const scoresFirst = scoreboard[0]
            const scoresLast = scoreboard[scoreboard.length - 1]
            const ratingFirstSum = scoresFirst.map((scoreData) => scoreData.rating).reduce((a, b) => a + b)
            const ratingLastSum = scoresLast.map((scoreData) => scoreData.rating).reduce((a, b) => a + b)
            const ratingFirstAvg = Math.ceil(ratingFirstSum / scoresFirst.length)
            const ratingLastAvg = Math.ceil(ratingLastSum / scoresLast.length)
            const changeBase = Math.ceil(base + (ratingLastAvg - ratingFirstAvg) * 0.04)
            for (let i = 0; i < scoreboard.length; i++) {
                const scoreDataList = scoreboard[i]
                for (const scoreData of scoreDataList) {
                    const change = Math.ceil(changeBase * getMultiplier(i + 1))
                    console.log(`${scoreData.name}: ${scoreData.rating} => ${scoreData.rating + change} (${change >= 0 ? `+${change}` : change})`)
                    scoreData.ratingChange = change
                    await prisma.rating.updateMany({
                        data: {
                            rating: scoreData.rating + change
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
    }

    async handleEnd() {
        if (this.ended) {
            return
        }
        this.ended = true
        this.clearInterval(this.durationTimerId)
        this.taskIntervalIds.forEach((id) => clearInterval(id))
        this.taskIntervalIds = []
        this.taskTimeoutIds.forEach((id) => clearTimeout(id))
        this.taskTimeoutIds = []
        const scoreboard = this.createScoreboard()
        await this.storeResultsToDatabase(this.room.gameData.id, scoreboard)
        this.server.io.to(this.room.id).emit('game_end', scoreboard)
        this.getRealPlayers().forEach((p) => {
            const socket = this.server.getSocket(p)
            socket.removeAllListeners()
            this.server.leaveRoom(socket, this.room.id)
            this.server.registerListeners(socket)
        })
    }

    setTimeout(callback, ms) {
        const id = setTimeout(callback, ms)
        this.taskTimeoutIds.push(id)
        return id
    }

    clearTimeout(id) {
        clearTimeout(id)
        const index = this.taskTimeoutIds.indexOf(id)
        if (index !== -1) {
            this.taskTimeoutIds.splice(index, 1)
        }
    }

    setInterval(callback, ms) {
        const id = setInterval(callback, ms)
        this.taskIntervalIds.push(id)
        return id
    }

    clearInterval(id) {
        clearInterval(id)
        const index = this.taskIntervalIds.indexOf(id)
        if (index !== -1) {
            this.taskIntervalIds.splice(index, 1)
        }
    }

    handleDisconnect(player)  {
        if (this.isCpuPlayer(player)) {
            return
        }
        const playerIndex = this.room.players.indexOf(player)
        this.server.io.to(this.room.id).emit('game_disconnect', playerIndex)
        this.room.players.splice(playerIndex, 1)
        if (this.getRealPlayers().length <= 1) {
            this.handleEnd()
        }
    }
}

module.exports = BoardGame