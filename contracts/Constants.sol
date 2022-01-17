// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// TODO: Add management to role DAO_ROLE with DEFAULT_ADMIN_ROLE and add function to set DEFAULT_ADMIN_ROLE to 0
contract Constants is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // only the DAO (GuildFX) can control token
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // GuildFX treasury
    address payable public treasury;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // ERC1967 UUPS Upgradeable
    function initialize(
        address dao,
        address developer,
        address payable _treasury
    ) public initializer {
        require(dao != address(0), "DAO cannot be zero");
        require(developer != address(0), "Developer cannot be zero");
        require(_treasury != address(0), "Treasury cannot be zero");

        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DAO_ROLE, dao);
        _grantRole(DEVELOPER_ROLE, developer);
        treasury = _treasury;
    }

    function updateTreasuryAddress(address payable _treasury)
        public
        onlyRole(DAO_ROLE)
        whenNotPaused
    {
        require(_treasury != address(0), "Treasury cannot be zero");
        treasury = _treasury;
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEVELOPER_ROLE)
    {}
}
