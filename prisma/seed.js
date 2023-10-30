const {PrismaClient} = require('@prisma/client')
const prisma = new PrismaClient()

const main = async () => {
    await prisma.game.createMany({
        data: [
            {name: 'sinkei'},
            {name: 'speed'},
            {name: 'osero'},
            {name: 'daifugo'},
        ]
    })
}

main().then(async () => {
    await prisma.$disconnect()
}).catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})