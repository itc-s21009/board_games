const express = require('express')
const router = express.Router()

router.get('/', async (req, res) => {
    const id = req.session.id
    if (id) {
        return res.status(200).json({id: id})
    } else {
        return res.status(400).json({message: 'セッションが使用されていません'})
    }
})

module.exports = router