// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./GuildToken.sol";

interface IERC20GUILD {
    function grantRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function mintRequest(address _recipient, uint256 _amount) external;

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function whitelistMint(address _mintAddress, bool _isActive) external;
}

interface GUILD_GOVERNOR {
  function transferOwnership(address newOwner) external;
}

contract GuildFactory is Pausable, AccessControl {
    address internal immutable tokenImplementation;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE"); // GuildFX DAO
    // bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE"); // GuildFX devs
    bytes32 public constant GUILD_TOKEN_GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE"); // GuildFX devs
    bytes32 public constant GUILD_OWNER_ROLE = keccak256("GUILD_OWNER_ROLE"); // People who can create a guild
    bytes32 public constant GFX_STAFF_ROLE =
        keccak256("GFX_STAFF_ROLE"); // GuildFX Staff members who can whitelist guild owners

    // GuildFX constants
    address public fxConstants;

    // Points to the guild token proxies
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private GUILD_TOKEN_PROXIES;

    event GuildCreated(
        address contractAddress,
        string name,
        string token,
        address dao,
        address developer,
        address creator,
        address guildFactory
    );
    event FactoryStaffWhitelist(address staffMember, address whitelistedBy, bool isActive);
    event GuildOwnerWhitelist(address guildOwner, address whitelistedBy, bool isActive);

    constructor(address dao, address _fxConstants) {
        require(dao != address(0), "DAO address cannot be zero");
        require(
            _fxConstants != address(0),
            "FXConstants address cannot be zero"
        );
        tokenImplementation = address(new GuildToken());
        fxConstants = _fxConstants;
        _grantRole(DAO_ROLE, dao);
        _grantRole(GFX_STAFF_ROLE, dao);
    }

    function createGuild(
        string memory guildName,
        string memory guildSymbol,
        address guildDao,
        address guildDev
    )
        public
        onlyRole(GUILD_OWNER_ROLE)
        whenNotPaused
        returns (address _guildToken)
    {
        address guildToken = _createGuildToken(
            guildName,
            guildSymbol,
            guildDao,
            guildDev
        );
        
        return (address(guildToken));
    }

    function _createGuildToken(
        string memory guildName,
        string memory guildSymbol,
        address guildDao,
        address guildDev
    ) internal returns (address _guildToken) {
        require(bytes(guildName).length != 0, "Guild name cannot be empty");
        require(bytes(guildSymbol).length != 0, "Guild symbol cannot be empty");
        require(guildDao != address(0), "DAO address cannot be zero");
        require(guildDev != address(0), "Developer address cannot be zero");
 
        // See how to deploy upgradeable token here https://forum.openzeppelin.com/t/deploying-upgradeable-proxies-and-proxy-admin-from-factory-contract/12132/3
        ERC1967Proxy proxy = new ERC1967Proxy(
            tokenImplementation,
            abi.encodeWithSelector(
                GuildToken(address(0)).initialize.selector,
                guildName,
                guildSymbol,
                guildDao,
                guildDev
            )
        );
        GUILD_TOKEN_PROXIES.add(address(proxy));
        emit GuildCreated(
            address(proxy),
            guildName,
            guildSymbol,
            guildDao,
            guildDev,
            msg.sender,
            address(this)
        );
        return address(proxy);
    }

    function whitelistGuildOwner(address guildOwner, bool isActive)
        public
        onlyRole(GFX_STAFF_ROLE)
        whenNotPaused
    {
        if (isActive) {
            _grantRole(GUILD_OWNER_ROLE, guildOwner);
        } else {
            _revokeRole(GUILD_OWNER_ROLE, guildOwner);
        }
        emit GuildOwnerWhitelist(guildOwner, msg.sender, isActive);
    }

    function whitelistGFXStaff(address staffMember, bool isActive)
        public
        onlyRole(DAO_ROLE)
        whenNotPaused
    {
        if (isActive) {
            _grantRole(GFX_STAFF_ROLE, staffMember);
        } else {
            _revokeRole(GFX_STAFF_ROLE, staffMember);
        }
        emit FactoryStaffWhitelist(staffMember, msg.sender, isActive);
    }

    function viewGuildTokens() public view returns (bytes32[] memory) {
        // TODO investigate memory usage if GUILD_TOKEN_PROXIES can be huge
        return GUILD_TOKEN_PROXIES._inner._values;
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }
}
