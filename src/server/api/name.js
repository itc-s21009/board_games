const express = require('express')
const router = express.Router()
const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()

router.get('/', async (req, res) => {
    const name = req.session.name
    if (name) {
        return res.status(200).json({name: name})
    } else {
        return res.status(400).json({message: '名前が登録されていません'})
    }
})

router.post('/', async (req, res) => {
    const {name} = req.body
    if (!name) {
        return res.status(500).json({message: 'nameが必要です。'})
    }
    req.session.name = name
    await prisma.user.create({
        data: {
            sessionId: req.session.id,
            name: name
        }
    }).then(async (user) => {
        const games = await prisma.game.findMany()
        const initialRatingData = games.map((game) => ({
                userId: user.id,
                rating: 1000,
                gameId: game.id
            }
        ))
        const initialStatData = games.map((game) => (
            [
                {
                    userId: user.id,
                    gameId: game.id,
                    isRated: true
                },
                {
                    userId: user.id,
                    gameId: game.id,
                    isRated: false
                }
            ]
        )).flat()
        await prisma.stat.createMany({data: initialStatData})
        await prisma.rating.createMany({data: initialRatingData}).then(() => {
            return res.status(200).json({message: `名前を設定しました：${name}`})
        })
    })
})

module.exports = router