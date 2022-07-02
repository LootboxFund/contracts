// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./LootboxEscrow.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./EIP712Whitelisting.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract PartyBasket is AccessControl, Pausable, EIP712Whitelisting, IERC721Receiver {
    using ECDSA for bytes32;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    address public lootboxAddress;
    string public name;
    string public semver;

    event BountyRedeemed(address bountyHolder, address indexed bountyReceiver, address indexed lootboxAddress, uint256 ticket);

    constructor(string memory _name, address _lootboxAddress, address admin, address whitelister) EIP712Whitelisting(whitelister) {
        require(_lootboxAddress != address(0), "Lootbox address cannot be the zero address");
        require(admin != address(0), "Admin address cannot be the zero address");
        require(bytes(_name).length != 0, "Name cannot be empty");

        semver = "0.6.3-demo";

        name = _name;

        lootboxAddress = _lootboxAddress;

        _grantRole(DAO_ROLE, admin);
    }
    
    function redeemBounty (
        bytes calldata signature,
        uint256 nonce
    ) public
      requiresWhitelist(signature, nonce)
      whenNotPaused
    {  
        uint256[] memory listOfNFTsAvailable = this.viewNFTs(); 

        require(listOfNFTsAvailable.length > 0, "No NFTs available");
        
        uint256 nextAvailableNFT = listOfNFTsAvailable[0];

        emit BountyRedeemed(address(this), msg.sender, lootboxAddress, nextAvailableNFT);
        
        LootboxEscrow(payable(lootboxAddress)).transferFrom(address(this), msg.sender, nextAvailableNFT);        
    }

    function viewNFTs () public view returns (uint256[] memory) {
      uint256[] memory listOfNFTsAvailable = LootboxEscrow(payable(lootboxAddress)).viewAllTicketsOfHolder(address(this)); 
      return listOfNFTsAvailable;
    }

    /**
     * Always returns `IERC721Receiver.onERC721Received.selector`.
     */
    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }
    function unpause() public onlyRole(DAO_ROLE) {
      _unpause();
    }
}
