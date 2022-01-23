// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/draft-ERC20PermitUpgradeable.sol";

contract GuildToken is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ERC20PermitUpgradeable,
    ERC20VotesUpgradeable
{
    // roles to trusted smart contracts & the DAO
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); // our mint smart contracts
    // only the DAO can control GuildToken
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant GOVERNOR_ADMIN_ROLE =
        keccak256("GOVERNOR_ADMIN_ROLE");

    // variables
    uint256 public currentSupply;

    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter public cumulativeMintsWhitelisted; // this may double count mints that get whitelisted twice

    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    EnumerableSetUpgradeable.AddressSet private ACTIVE_MINTS; // active mints have the MINTER_ROLE

    // events
    event MintACLUpdated(address indexed _mintAddress, bool _isWhitelisted);
    event MintRequestFulfilled(
        address indexed _fromMint,
        address indexed _toReceiver,
        uint256 _amount
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // ERC1967 UUPS Upgradeable
    function initialize(
        string memory _name,
        string memory _symbol,
        address _dao,
        address _developer
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __ERC20Burnable_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        // set current supply
        currentSupply = 0;

        _grantRole(DAO_ROLE, _dao);
        _grantRole(DEVELOPER_ROLE, _developer);

        _setRoleAdmin(GOVERNOR_ROLE, GOVERNOR_ADMIN_ROLE); // Changes the GOVERNOR_ROLE's admin role from DEFAULT_ADMIN_ROLE to GOVERNOR_ADMIN_ROLE
        _grantRole(GOVERNOR_ADMIN_ROLE, _dao); // Temporary grant the dao permission to assign a governor. This gets removed in grantRole() when setting up the GOVERNOR_ROLE
    }

    // --------- Managing the Mints --------- //
    function whitelistMint(address _mintAddress, bool _isActive)
        external
        onlyRole(DAO_ROLE)
        whenNotPaused
    {
        /** The Mint is deployed in Javascript but useless without being whitelisted
            Only whitelisted Mints can request minting.
            Only the DAO can whitelist Mints. This is a security measure to prevent abuse.
         */
        if (_isActive) {
            ACTIVE_MINTS.add(_mintAddress);
            _grantRole(MINTER_ROLE, _mintAddress);
            cumulativeMintsWhitelisted.increment();
        } else {
            ACTIVE_MINTS.remove(_mintAddress);
            _revokeRole(MINTER_ROLE, _mintAddress);
        }
        emit MintACLUpdated(_mintAddress, _isActive);
    }

    function mintRequest(address _recipient, uint256 _amount)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
    {
        require(
            ACTIVE_MINTS.contains(msg.sender),
            "Address must be whitelisted to request a mint"
        );
        uint256 _addAmount = _amount;
        currentSupply = currentSupply + _addAmount;
        _mint(_recipient, _addAmount);
        emit MintRequestFulfilled(msg.sender, _recipient, _addAmount);
    }

    function viewMintsWhitelist() public view returns (bytes32[] memory) {
        return ACTIVE_MINTS._inner._values;
    }

    function grantRole(bytes32 role, address account)
        public
        virtual
        override
        onlyRole(getRoleAdmin(role))
    {
        // This function can only be called by addresses with the DEFAULT_ADMIN_ROLE or the GOVERNOR_ADMIN_ROLE
        // No-one has been given the DEFAULT_ADMIN_ROLE permission, so in practice, the only callers will be the GOVERNOR_ADMIN_ROLE
        // In this case, we remove the GOVERNOR_ADMIN_ROLE so that there can only be ONE IMUTABLE governor, and this function cannot be called again.
        _grantRole(role, account);
        if (role == GOVERNOR_ROLE) {
            // Revokes GOVERNOR_ADMIN_ROLE so that no one can grant or change the GOVERNOR_ROLE
            _revokeRole(GOVERNOR_ADMIN_ROLE, msg.sender);
        }
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20Upgradeable, ERC20VotesUpgradeable)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20Upgradeable, ERC20VotesUpgradeable)
    {
        super._burn(account, amount);
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20VotesUpgradeable) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEVELOPER_ROLE)
    {}
}
