// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./LootboxCosmic.sol";

contract LootboxEscrowFactory is Pausable, AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    string public semver;
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE"); // Lootbox Ltd
    bytes32 public constant LOGGER_ROLE = keccak256("LOGGER_ROLE");

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
        string _data
    );

    // Event emitted when child Lootbox ticket (AKA NFT) minted
    event LootboxMint(
        address indexed lootboxAddress,
        address indexed minterAddress,
        uint256 ticketId
    );

    // Event emitted when a deposit is made into a Lootbox
    event LootboxDeposit(
        address indexed lootboxAddress,
        address indexed depositor,
        uint256 indexed depositId,
        uint256 nativeTokenAmount,
        address erc20Token,
        uint256 erc20Amount
    );

    // Event emitted when child Lootbox has NFT payed out
    event LootboxWithdrawEarnings(
        address indexed lootboxAddress,
        address indexed withdrawer,
        uint256 ticketId,
        uint256 nativeTokenAmount,
        address erc20Token,
        uint256 erc20Amount
    );

    constructor(
        address _lootboxDao,
        address _whitelister,
        string memory _baseTokenURI
    ) {
        require(
            _lootboxDao != address(0),
            "DAO Lootbox address cannot be zero"
        );
        require(
            _whitelister != address(0),
            "Whitelister address cannot be the zero address"
        );
        require(
            bytes(_baseTokenURI).length != 0,
            "Base token URI cannot be empty"
        );

        _grantRole(DAO_ROLE, _lootboxDao);
        whitelister = _whitelister;

        baseTokenURI = _baseTokenURI;
        semver = "0.7.0-demo";
    }

    function createLootbox(
        string memory _lootboxName,
        string memory _lootboxSymbol,
        uint256 _maxTickets,
        string memory _data
    ) public whenNotPaused returns (address _lootbox) {
        require(
            bytes(_lootboxName).length != 0,
            "Lootbox name cannot be empty"
        );
        require(
            bytes(_lootboxSymbol).length != 0,
            "Lootbox symbol cannot be empty"
        );
        require(_maxTickets > 0, "Max tickets must be greater than zero");
        LootboxCosmic newLootbox = new LootboxCosmic(
            _lootboxName,
            _lootboxSymbol,
            baseTokenURI,
            _maxTickets,
            msg.sender,
            whitelister
        );
        address newLootboxAddress = address(newLootbox);
        grantRole(LOGGER_ROLE, newLootboxAddress);

        LOOTBOXES.add(newLootboxAddress);

        emit LootboxCreated(
            _lootboxName,
            newLootboxAddress,
            msg.sender,
            _maxTickets,
            _data
        );

        return newLootboxAddress;
    }

    function emitMint(address minter, uint256 ticketID)
        public
        onlyRole(LOGGER_ROLE)
    {
        emit LootboxMint(msg.sender, minter, ticketID);
    }

    function emitWithdrawEarnings(
        address withdrawer,
        uint256 ticketID,
        uint256 nativeTokenAmount,
        address erc20Token,
        uint256 erc20TokenAmount
    ) public onlyRole(LOGGER_ROLE) {
        emit LootboxWithdrawEarnings(
            msg.sender,
            withdrawer,
            ticketID,
            nativeTokenAmount,
            erc20Token,
            erc20TokenAmount
        );
    }

    function emitDeposit(
        address lootboxAddress,
        address depositor,
        uint256 depositId, 
        uint256 nativeTokenAmount,
        address erc20Token,
        uint256 erc20TokenAmount
    ) public onlyRole(LOGGER_ROLE) {
        emit LootboxDeposit(lootboxAddress, depositor, depositId, nativeTokenAmount, erc20Token, erc20TokenAmount);
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
