const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Random IPFS NFT Unit Tests", function () {
          let randomIPFSNFT, deployer, vrfCoordinatorV2Mock

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["mocks", "randomipfs"])
              randomIPFSNFT = await ethers.getContract("RandomIPFSNFT")
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
          })

          //   describe("constructor", () => {
          //       it("sets starting values correctly", async function () {
          //           const dogTokenUriZero = await randomIPFSNFT.getTokenURIs(0)
          //           const isInitialized = await randomIPFSNFT.getInitialized()
          //           assert(dogTokenUriZero.includes("ipfs://"))
          //           assert.equal(isInitialized, true)
          //       })
          //   })

          describe("requestNFT", () => {
              it("fails if payment isn't sent with the request", async function () {
                  await expect(randomIPFSNFT.requestNFT()).to.be.revertedWith(
                      "RandomIPFSNFT__NeedMoreETHSent"
                  )
              })
              it("reverts if payment amount is less than the mint fee", async function () {
                  const fee = await randomIPFSNFT.getMintFee()
                  await expect(
                      randomIPFSNFT.requestNFT({
                          value: fee.sub(ethers.utils.parseEther("0.001")),
                      })
                  ).to.be.revertedWith("RandomIPFSNFT__NeedMoreETHSent")
              })
              it("emits an event and kicks off a random word request", async function () {
                  const fee = await randomIPFSNFT.getMintFee()
                  await expect(randomIPFSNFT.requestNFT({ value: fee.toString() })).to.emit(
                      randomIPFSNFT,
                      "NFTRequested"
                  )
              })
          })
          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIPFSNFT.once("NFTMinted", async () => {
                          try {
                              const tokenUri = await randomIPFSNFT.tokenURI("0")
                              const tokenCounter = await randomIPFSNFT.s_tokenCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const fee = await randomIPFSNFT.getMintFee()
                          const requestNftResponse = await randomIPFSNFT.requestNFT({
                              value: fee.toString(),
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomIPFSNFT.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })
          describe("getBreedFromModdedRng", () => {
              it("should return pug if moddedRng < 10", async function () {
                  const expectedValue = await randomIPFSNFT.getBreedFromModdedRng(7)
                  assert.equal(0, expectedValue)
              })
              it("should return shiba-inu if moddedRng is between 10 - 39", async function () {
                  const expectedValue = await randomIPFSNFT.getBreedFromModdedRng(21)
                  assert.equal(1, expectedValue)
              })
              it("should return st. bernard if moddedRng is between 40 - 99", async function () {
                  const expectedValue = await randomIPFSNFT.getBreedFromModdedRng(77)
                  assert.equal(2, expectedValue)
              })
              it("should revert if moddedRng > 99", async function () {
                  await expect(randomIPFSNFT.getBreedFromModdedRng(100)).to.be.revertedWith(
                      "RandomIPFSNFT__RangeOutOfBounds"
                  )
              })
          })
      })
