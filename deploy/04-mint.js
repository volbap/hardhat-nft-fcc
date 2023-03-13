// Let's have each contract mint an NFT (basic, random IPFS, dynamic SVG)

const { ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async ({ getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts()

    // Basic NFT
    console.log("Minting Basic NFT...")
    const basicNFT = await ethers.getContract("BasicNFT", deployer)
    const basicMintTx = await basicNFT.mintNFT()
    await basicMintTx.wait(1)
    console.log(`Basic NFT index 0 has tokenURI: ${await basicNFT.tokenURI(0)}`)

    // Random IPFS NFT
    console.log("Minting Random IPFS NFT...")
    const randomIPFSNFT = await ethers.getContract("RandomIPFSNFT", deployer)
    const mintFee = await randomIPFSNFT.getMintFee()

    await new Promise(async (resolve, reject) => {
        console.log("Promise started")
        randomIPFSNFT.once("NFTMinted", async function () {
            console.log("NFTMinted")
            resolve()
        })
        console.log("Promise continues")
        const randomIPFSMintTx = await randomIPFSNFT.requestNFT({ value: mintFee.toString() })
        const randomIPFSMintTxReceipt = await randomIPFSMintTx.wait(1)

        if (developmentChains.includes(network.name)) {
            const requestId = randomIPFSMintTxReceipt.events[1].args.requestId.toString()
            const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIPFSNFT.address)
        }
    })
    console.log(`Random IPFS NFT index 0 has tokenURI: ${await randomIPFSNFT.getTokenURIs(0)}`)

    // Dynamic SVG NFT
    console.log("Minting Dynamic SVG NFT...")
    const highPriceValue = ethers.utils.parseEther("4000")
    const dynamicSVGNFT = await ethers.getContract("DynamicSVGNFT", deployer)
    const dynamicSVGNFTMintTx = await dynamicSVGNFT.mintNFT(highPriceValue.toString())
    await dynamicSVGNFTMintTx.wait(1)
    console.log(`Dynamic SVG NFT index 0 has tokenURI: ${await dynamicSVGNFT.tokenURI(0)}`)
}

module.exports.tags = ["all", "mint"]
