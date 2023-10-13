const express = require('express')
const router = express.Router()
const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()

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
    }).then(() => {
        return res.status(200).json({message: `名前を設定しました：${name}`})
    })
})

module.exports = router