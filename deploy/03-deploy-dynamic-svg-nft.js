const { network } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId

    let ethUsdPriceFeedAddress

    if (developmentChains.includes(network.name)) {
        const aggregator = await ethers.getContract("MockV3Aggregator")
        ethUsdPriceFeedAddress = aggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed
    }

    const lowPriceSVG = await fs.readFileSync("./images/dynamicNFT/frown.svg", { encoding: "utf8" })
    const highPriceSVG = await fs.readFileSync("./images/dynamicNFT/happy.svg", {
        encoding: "utf8",
    })

    const args = [ethUsdPriceFeedAddress, lowPriceSVG, highPriceSVG]

    const nft = await deploy("DynamicSVGNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(nft.address, args)
    }
}

module.exports.tags = ["all", "dynamicsvg", "main"]
