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

interface ICONSTANTS {
    function TREASURY() external view returns (address);

    function GUILD_FX_MINTING_FEE() external view returns (uint256);

    function GUILD_FX_MINTING_FEE_DECIMALS() external view returns (uint8);
}

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
    address public fxConstants; // GuildFX constants smart contract

    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter public cumulativeMintsWhitelisted; // this may double count mints that get whitelisted twice

    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    EnumerableSetUpgradeable.AddressSet private ACTIVE_MINTS; // active mints have the MINTER_ROLE

    uint256 public outstandingSupply;

    // events
    event MintACLUpdated(address indexed _mintAddress, bool _isWhitelisted);
    event MintRequestFulfilled(
        address indexed _fromMint,
        address indexed _toReceiver,
        address _guildFXTreasury,
        uint256 _receiverAmount,
        uint256 _mintFeeRate,
        uint256 _totalAmount
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // ERC1967 UUPS Upgradeable
    function initialize(
        string memory _name,
        string memory _symbol,
        address _dao,
        address _developer,
        address _fxConstants
    ) public initializer {
        require(
            _fxConstants != address(0),
            "FXConstants address cannot be zero"
        );

        __ERC20_init(_name, _symbol);
        __ERC20Permit_init(_name);
        __ERC20Burnable_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DAO_ROLE, _dao);
        _grantRole(DEVELOPER_ROLE, _developer);

        _setRoleAdmin(GOVERNOR_ROLE, GOVERNOR_ADMIN_ROLE); // Changes the GOVERNOR_ROLE's admin role from DEFAULT_ADMIN_ROLE to GOVERNOR_ADMIN_ROLE
        _grantRole(GOVERNOR_ADMIN_ROLE, msg.sender); // Temporary grant the caller (most likely the guildFactory) permission to assign a governor.

        fxConstants = _fxConstants;

        uint256 initialMintToDao = 980 * 10**decimals(); // Sends the Guild 1000 tokens

        // _mint(_dao, initialMintToDao);
        // (uint256 _mintFeeAmount, uint256 _mintFeeRate, address _guildFXTreasury) = mintGuildAllocation(initialMintToDao);
        // emit MintRequestFulfilled(
        //     msg.sender,
        //     _dao,
        //     _guildFXTreasury,
        //     initialMintToDao,
        //     _mintFeeRate,
        //     initialMintToDao + _mintFeeAmount
        // );
    }

    // --------- Managing the Mints --------- //
    function whitelistMint(address _mintAddress, bool _isActive)
        external
        onlyRole(GOVERNOR_ROLE)
        whenNotPaused
    {
        /** The Mint is deployed in Javascript but useless without being whitelisted
            Only whitelisted Mints can request minting.
            Only the GOVERNOR_ROLE can whitelist Mints. This is a security measure to prevent abuse.
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
        require(_amount > 0, "Cannot mint zero tokens");

        // Mints provided amount of tokens to the desired resipient
        uint256 _addAmount = _amount;   // does this need to incur a new variable? (gas cost)
        _mint(_recipient, _addAmount);

        // Mints a fee to GuildFX - fee set and treasury address set by the GuildFXConstants Contract
        (uint256 _mintFeeAmount, uint256 _mintFeeRate, address _guildFXTreasury) = mintGuildAllocation(_amount);
        emit MintRequestFulfilled(
            msg.sender,
            _recipient,
            _guildFXTreasury,
            _addAmount,
            _mintFeeRate,
            _addAmount + _mintFeeAmount
        );
    }

    function testMintRequest (address _recipient, uint256 _amount) external onlyRole(MINTER_ROLE) whenNotPaused {
      require(
        ACTIVE_MINTS.contains(msg.sender),
        "Address must be whitelisted to request a mint"
      );
      require(_amount > 0, "Cannot mint zero tokens");

      // Mints provided amount of tokens to the desired resipient
      uint256 _addAmount = _amount;   // does this need to incur a new variable? (gas cost)
      _mint(_recipient, _addAmount);

      // Mints a fee to GuildFX - fee set and treasury address set by the GuildFXConstants Contract
        (uint256 _mintFeeAmount, uint256 _mintFeeRate, address _guildFXTreasury) = mintGuildAllocation(_amount);
        emit MintRequestFulfilled(
            msg.sender,
            _recipient,
            _guildFXTreasury,
            _addAmount,
            _mintFeeRate,
            _addAmount + _mintFeeAmount
        );
    }

    function grantRole(bytes32 role, address account)
        public
        virtual
        override
        onlyRole(getRoleAdmin(role)) /** where does getRoleAdmin() come from? */
    {
        /**
            WARNING: This function will revoke the GOVERNOR_ADMIN_ROLE role and render itself useless.
            Only addresses with the DEFAULT_ADMIN_ROLE or the GOVERNOR_ADMIN_ROLE can call this.
            In practice, only the GOVERNOR_ADMIN_ROLE will be able to call this because no-one has the DEFAULT_ADMIN_ROLE.
            In this case, the GOVERNOR_ADMIN_ROLE is revoked after assigning a GOVERNOR_ROLE rendering the governor immutable.
         */

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
      outstandingSupply = outstandingSupply + amount;
      // Mints provided amount of tokens to the desired recipient
      ERC20VotesUpgradeable._mint(to, amount);
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

    function mintGuildAllocation(uint256 _mintAmount)
        internal
        returns (uint256 mintFeeAmount, uint256 mintFeeRate, address guildFXTreasury)
    {
        (uint256 _mintFeeAmount, uint256 _mintFeeRate, address _guildFXTreasury) = calculateGuildFXMintFee(_mintAmount);
        _mint(_guildFXTreasury, _mintFeeAmount);

        return (_mintFeeAmount, _mintFeeRate, _guildFXTreasury);
    }

    function calculateGuildFXMintFee(uint256 _mintAmount) public view returns (uint256 mintFeeAmount, uint256 mintFeeRate, address guildFXTreasury) {
        ICONSTANTS guildFXConstantsContract = ICONSTANTS(fxConstants);
        address _guildFXTreasury = guildFXConstantsContract.TREASURY();

        uint256 _mintFeeRate = guildFXConstantsContract.GUILD_FX_MINTING_FEE();
        uint8 _mintFeeDecimals = guildFXConstantsContract
            .GUILD_FX_MINTING_FEE_DECIMALS();
        uint256 _mintFeeAmount = (_mintAmount / ((10**_mintFeeDecimals) - _mintFeeRate) * (10**_mintFeeDecimals)) - _mintAmount;
        return (_mintFeeAmount, _mintFeeRate, _guildFXTreasury);
    }

    function viewMintsWhitelist() public view returns (bytes32[] memory) {
        return ACTIVE_MINTS._inner._values;
    }
}
