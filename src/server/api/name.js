const express = require('express')
const router = express.Router()

router.post('/', (req, res) => {
    const {name} = req.body
    if (!name) {
        return res.status(500).json({message: 'nameが必要です。'})
    }
    req.session.name = name
    return res.status(200).json({message: `名前を設定しました：${name}`})
})

module.exports = router