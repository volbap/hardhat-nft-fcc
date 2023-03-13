// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error RandomIPFSNFT__RangeOutOfBounds();
error RandomIPFSNFT__NeedMoreETHSent();
error RandomIPFSNFT__TransferFailed();

contract RandomIPFSNFT is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    // When we mint an NFT, we'll trigger a Chainlink VRF call to get us a random number.
    // Using that number we'll get a random NFT between these options:
    // - pug (super rare)
    // - shiba inu (sort of rare)
    // - st bernard (pretty common)

    // Types
    enum Breed {
        PUG, // 0
        SHIBA_INU, // 1
        ST_BERNARD // 2
    }

    // Chainlink VRF setup
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // NFT-related
    mapping(uint256 => address) public s_requestIdToSender;
    uint256 public s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_tokenURIs;
    uint256 internal immutable i_mintFee;

    // Events
    event NFTRequested(uint256 indexed requestId, address requester);
    event NFTMinted(Breed breed, address minter);

    constructor(
        address _vrfCoordinatorV2,
        uint64 _subscriptionId,
        bytes32 _gasLane,
        uint32 _callbackGasLimit,
        string[3] memory _tokenURIs,
        uint256 _mintFee
    ) VRFConsumerBaseV2(_vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN") {
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_subscriptionId = _subscriptionId;
        i_gasLane = _gasLane;
        i_callbackGasLimit = _callbackGasLimit;
        s_tokenCounter = 0;
        s_tokenURIs = _tokenURIs;
        i_mintFee = _mintFee;
    }

    // Users have to pay to mint an NFT withdraw.
    // The owner of the contract can withdraw the ETH.
    function requestNFT() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFee) {
            revert RandomIPFSNFT__NeedMoreETHSent();
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requestIdToSender[requestId] = msg.sender;
        emit NFTRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address owner = s_requestIdToSender[requestId];
        uint256 tokenId = s_tokenCounter;
        s_tokenCounter += 1;
        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;
        Breed breed = getBreedFromModdedRng(moddedRng);
        uint256 breedIndex = uint256(breed);
        _safeMint(owner, tokenId);
        _setTokenURI(tokenId, s_tokenURIs[breedIndex]);
        emit NFTMinted(breed, owner);
    }

    /// Allows the owner to withdraw all the funds accumulated from minting fees
    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert RandomIPFSNFT__TransferFailed();
        }
    }

    /// Represents the chances of happening of the different dogs
    function getChanceArray() public pure returns (uint256[3] memory) {
        // index 0 has a 10% chance of happening
        // index 1 has a 20% chance of happening (30 - 10)
        // index 2 has a 60% chance of happening (100 - 10 - 30)
        return [10, 30, MAX_CHANCE_VALUE];
    }

    /// Returns a breed based on the probabilities specified in getChanceArray()
    function getBreedFromModdedRng(uint256 moddedRng) public view returns (Breed) {
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        for (uint256 i = 0; i < chanceArray.length; i++) {
            if (moddedRng >= cumulativeSum && moddedRng < chanceArray[i]) {
                return Breed(i);
            }
            cumulativeSum += chanceArray[i];
        }
        revert RandomIPFSNFT__RangeOutOfBounds();
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getTokenURIs(uint256 _index) public view returns (string memory) {
        return s_tokenURIs[_index];
    }
}
