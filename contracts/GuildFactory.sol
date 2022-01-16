// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./SimpleERC20.sol";

contract GuildFactory is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // only the DAO (GuildFX) can control token
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // GuildFX treasury
    address public guildFXTreasury;

    // List of deployed tokens TODO revisit memory costs of using an array
    SimpleERC20[] public deployedContracts;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // ERC1967 UUPS Upgradeable
    function initialize() public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
    }

    function createGuild(string memory guildName, string memory guildSymbol)
        public
        payable
        whenNotPaused
    {
        SimpleERC20 token = new SimpleERC20(guildName, guildSymbol);
        deployedContracts.push(token);
    }

    // // --------- Managing the Mint --------- //
    // function mint(address _recipient, uint256 _amount)
    //     public
    //     onlyRole(DAO_ROLE)
    //     whenNotPaused
    // {
    //     uint256 _addAmount = _amount;
    //     currentSupply = currentSupply + _addAmount;
    //     _mint(_recipient, _addAmount);
    //     emit AdminMintRequestFulfilled(msg.sender, _recipient, _addAmount);
    // }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }

    // TODO: fix this import
    // function _beforeTokenTransfer(
    //     address from,
    //     address to,
    //     uint256 amount
    // ) internal override whenNotPaused {
    //     super._beforeTokenTransfer(from, to, amount);
    // }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEVELOPER_ROLE)
    {}
}
