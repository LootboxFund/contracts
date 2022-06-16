// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./LootboxEscrow.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./EIP712Whitelisting.sol";

contract PartyBasket is AccessControl, Pausable, EIP712Whitelisting {
    using ECDSA for bytes32;

    address public lootboxAddress;
    string public name;
    string public semver;

    event BountyRedeemed(address bountyHolder, address indexed bountyReceiver, address indexed lootboxAddress, uint256 ticket);

    constructor(string memory _name, address _lootboxAddress, address whitelister) EIP712Whitelisting(whitelister) {
        require(_lootboxAddress != address(0), "Lootbox address cannot be the zero address");
        require(bytes(_name).length != 0, "Name cannot be empty");

        semver = "0.6.1-prod";

        name = _name;

        lootboxAddress = _lootboxAddress;
    }
    
    function redeemBounty (
        bytes calldata signature,
        uint256 nonce
    ) public
      requiresWhitelist(signature, nonce)
      whenNotPaused
    {  
        uint256[] memory listOfNFTsAvailable = LootboxEscrow(payable(lootboxAddress)).viewAllTicketsOfHolder(address(this)); 

        require(listOfNFTsAvailable.length > 0, "No NFTs available");
        
        uint256 nextAvailableNFT = listOfNFTsAvailable[0];

        emit BountyRedeemed(address(this), msg.sender, lootboxAddress, nextAvailableNFT);
        
        LootboxEscrow(payable(lootboxAddress)).transferFrom(address(this), msg.sender, nextAvailableNFT);        
    }

    function viewNFTs () public view returns (uint256[] memory) {
      uint256[] memory listOfNFTsAvailable = LootboxEscrow(payable(lootboxAddress)).viewAllTicketsOfHolder(address(this)); 
      return listOfNFTsAvailable;
    }
}
