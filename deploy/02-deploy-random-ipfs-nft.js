const { network } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeMetadata } = require("../utils/uploadToPinata")

const FUND_AMOUNT = "1000000000000000000000" // 10 LINK
const imagesLocation = "./images/randomNFT/"

let tokenURIs = [
    "ipfs://QmRY6Fz7rTMbfSDcwrKW4Fspo3zPk5qU9nZvZ9miRMMxF2",
    "ipfs://QmZmZ8cEh7x2y7EcuezyPc2PVxoBbyQKXXtaa1e1w5D2fG",
    "ipfs://QmfJasgERcGaNa2sWAMUfsnTEeyijPJaao7tabNCCswZqd",
]

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
}

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenURIs()
    }

    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        subscriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subscriptionId = networkConfig[chainId].subscriptionId
    }

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenURIs,
        networkConfig[chainId].mintFee,
    ]

    const nftContract = await deploy("RandomIPFSNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.waitConfirmations || 1,
    })

    if (developmentChains.includes(network.name)) {
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, nftContract.address)
    }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying...")
        await verify(nftContract.address, args)
    }
}

async function handleTokenURIs() {
    tokenURIs = []
    // 1. Store the images in IPFS
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)

    // 2. Store their metadata in IPFS
    for (index in imageUploadResponses) {
        // Create metadata
        let metadata = { ...metadataTemplate } // "..." is syntax sugar for "unpack"
        metadata.name = files[index].replace(".png", "").replace(".jpg", "")
        metadata.description = `An adorable ${metadata.name} pup!`
        metadata.image = `ipfs://${imageUploadResponses[index].IpfsHash}`
        // Store metadata to Pinata / IPFS
        const metadataUploadResponse = await storeMetadata(metadata)
        const metadataURI = `ipfs://${metadataUploadResponse.IpfsHash}`
        tokenURIs.push(metadataURI)
    }
    console.log("Token URIs uploaded! They are:")
    console.log(tokenURIs)
    return tokenURIs
}

module.exports.tags = ["all", "randomipfs", "main"]
