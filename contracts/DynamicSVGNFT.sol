// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "base64-sol/base64.sol";

contract DynamicSVGNFT is ERC721 {
    uint256 public s_tokenCounter;
    string public i_lowPriceImageURI;
    string public i_highPriceImageURI;
    string private constant BASE_64_ENCODED_SVG_PREFIX = "data:image/svg+xml;base64,";
    string private constant BASE_64_ENCODED_JSON_PREFIX = "data:application/json;base64,";
    AggregatorV3Interface public immutable i_priceFeed;
    mapping(uint256 => int256) public s_tokenIdToHighPriceValue;

    // Events
    event CreatedNFT(uint256 indexed tokenId, int256 highPriceValue);

    constructor(
        address priceFeedAddress,
        string memory lowPriceSVG,
        string memory highPriceSVG
    ) ERC721("Dynamic SVG NFT", "DSN") {
        s_tokenCounter = 0;
        i_lowPriceImageURI = svgToImageURI(lowPriceSVG);
        i_highPriceImageURI = svgToImageURI(highPriceSVG);
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    /// Converts the SVG data (that looks like HTML) into a base64-encoded string.
    /// Example:
    /// - Input: "<svg width="500" height="500" viewBox="0 0 285 350" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="black" d="M150,0,L75,200,L225,200,Z"></path></svg>"
    /// - Output: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgdmlld0JveD0iMCAwIDI4NSAzNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iYmxhY2siIGQ9Ik0xNTAsMCxMNzUsMjAwLEwyMjUsMjAwLFoiPjwvcGF0aD48L3N2Zz4="
    /// Tip: We can paste this return string into the browser URL bar and it'll render the SVG image.
    function svgToImageURI(string memory svg) public pure returns (string memory) {
        // https://github.com/Brechtpd/base64/lob/main/base64.sol (yarn add --dev base64-sol)
        string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(svg))));
        return string(abi.encodePacked(BASE_64_ENCODED_SVG_PREFIX, svgBase64Encoded));
    }

    function mintNFT(int256 highPriceValue) public {
        // When minting an NFT, users decide what is the high price value
        // that determines the image of this NFT (sad vs happy).
        s_tokenIdToHighPriceValue[s_tokenCounter] = highPriceValue;
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter += 1;
        emit CreatedNFT(s_tokenCounter, highPriceValue);
    }

    function _baseURI() internal pure override returns (string memory) {
        return BASE_64_ENCODED_JSON_PREFIX;
    }

    // Here we override from ERC721
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "URI Query for nonexistent token");

        // The token URI will be a base64-encoded string of the JSON
        // containing all the token information which includes
        // the base64-encoded string of the SVG image.

        (, int256 price, , , ) = i_priceFeed.latestRoundData();
        string memory imageURI = i_lowPriceImageURI;
        if (price >= s_tokenIdToHighPriceValue[tokenId]) {
            imageURI = i_highPriceImageURI;
        }

        string memory base64Prefix = _baseURI();
        string memory base64Content = Base64.encode(
            bytes(
                abi.encodePacked(
                    '{"name":"',
                    name(),
                    '", "description":"An NFT that changes based on the Chainlink Feed", ',
                    '"attributes": [{"trait_type": "coolness", "value": 100}], "image":"',
                    imageURI,
                    '"}'
                )
            )
        );
        return string(abi.encodePacked(base64Prefix, base64Content));
    }
}
