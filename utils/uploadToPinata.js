const pinataSDK = require("@pinata/sdk")
const path = require("path")
const fs = require("fs")

const pinata = pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_API_SECRET)

async function storeImages(imagesFilePath) {
    console.log("Uploading images to IPFS...")
    const fullImagesPath = path.resolve(imagesFilePath)
    const files = fs.readdirSync(fullImagesPath)
    console.log(files)
    let responses = []
    for (index in files) {
        const filePath = `${fullImagesPath}/${files[index]}`
        const readableStreamForFile = fs.createReadStream(filePath)
        try {
            console.log(`Uploading image at '${filePath}'...`)
            const response = await pinata.pinFileToIPFS(readableStreamForFile)
            console.log(`Finished uploading image at '${filePath}'!`)
            responses.push(response)
        } catch (error) {
            console.log(error)
        }
    }
    console.log("Finished uploading images!")
    return { responses, files }
}

async function storeMetadata(metadata) {
    try {
        console.log(`Uploading metadata for '${metadata.name}'...`)
        const response = await pinata.pinJSONToIPFS(metadata)
        console.log(`Finished uploading metadata for '${metadata.name}'!`)
        return response
    } catch (error) {
        console.log(error)
    }
    return null
}

module.exports = { storeImages, storeMetadata }
