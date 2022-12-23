// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./LootboxCosmic.sol";

contract LootboxCosmicFactory is Pausable, AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    string public semver;
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE"); // Lootbox Ltd

    string public baseTokenURI;
    address private immutable whitelister;

    // Points to the Lootboxes deployed by this factory
    EnumerableSet.AddressSet private LOOTBOXES;

    // Event emitted when lootbox is created
    event LootboxCreated(
        string lootboxName,
        address indexed lootbox,
        address indexed issuer,
        uint256 maxTickets,
        string baseTokenURI,
        string lootboxID,
        string indexed _nonce
    );

    constructor(
        address _lootboxDao,
        address _whitelister,
        string memory _baseTokenURI
    ) {
        require(_lootboxDao != address(0), "E1"); // DAO Lootbox address cannot be zero
        require(_whitelister != address(0), "E2"); // Whitelister address cannot be zero
        require(bytes(_baseTokenURI).length != 0, "E3"); // Base token URI cannot be empty

        _grantRole(DAO_ROLE, _lootboxDao);
        whitelister = _whitelister;

        baseTokenURI = _baseTokenURI;
        semver = "0.7.2-prod";
    }

    function createLootbox(
        string memory _lootboxName,
        string memory _lootboxSymbol,
        uint256 _maxTickets,
        string memory _lootboxID,
        string memory _nonce // to identify the lootbox
    ) public whenNotPaused returns (address _lootbox) {
        require(bytes(_lootboxName).length != 0, "E4"); // Name cannot be empty
        require(bytes(_lootboxSymbol).length != 0, "E5"); // Symbol cannot be empty
        require(_maxTickets > 0, "E6"); // Max tickets must be > 0
        require(bytes(_lootboxID).length != 0, "E7"); // Lootbox ID cannot be empty
        require(bytes(_nonce).length != 0, "E8"); // Nonce cannot be empty

        LootboxCosmic newLootbox = new LootboxCosmic(
            _lootboxName,
            _lootboxSymbol,
            string.concat(baseTokenURI, "/", _lootboxID),
            _maxTickets,
            msg.sender,
            whitelister
        );
        address newLootboxAddress = address(newLootbox);

        LOOTBOXES.add(newLootboxAddress);

        emit LootboxCreated(
            _lootboxName,
            newLootboxAddress,
            msg.sender,
            _maxTickets,
            string.concat(baseTokenURI, "/", _lootboxID),
            _lootboxID,
            _nonce
        );

        return newLootboxAddress;
    }

    function viewLootboxes() public view returns (bytes32[] memory) {
        return LOOTBOXES._inner._values;
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }
}
