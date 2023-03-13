This repo is a code-along for:
- Lesson: https://github.com/smartcontractkit/full-blockchain-solidity-course-js#lesson-14-hardhat-nfts-everything-you-need-to-know-about-nfts
- Original repo: https://github.com/PatrickAlphaC/hardhat-nft-fcc

---

3 contracts

#### 1. Basic NFT

- Mints NFTs locally with basic functionality

#### 2. Random IPFS NFT

- Mints random* NFTs with images and metadata using IPFS nodes as storage
  - Pros: Cheap
  - Cons: Someone needs to pin our data
  
> *Random: There are 3 possible images with different chances of happening.

#### 3. Dynamic SVG NFT (on-chain)
- Mints dynamic* NFTs storing SVG images and metadata on-chain 
  - Pros: The data is on-chain!
  - Cons: MUCH more expensive

> *Dynamic: If price of ETH is above X -> Happy face image :); If price of ETH is below X -> Sad face image :(
