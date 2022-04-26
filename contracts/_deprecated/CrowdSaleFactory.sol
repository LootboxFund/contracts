// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./CrowdSale.sol";

contract CrowdSaleFactory is Pausable, AccessControl {
    address internal immutable crowdsaleImplementation;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE"); // GuildFX DAO
    // bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE"); // GuildFX devs
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE"); // GuildFX devs
    bytes32 public constant GUILD_OWNER_ROLE = keccak256("GUILD_OWNER_ROLE"); // People who can create a guild
    bytes32 public constant GFX_STAFF_ROLE = keccak256("GFX_STAFF_ROLE"); // People who can whitelist guild owners

    // GuildFX constants
    address public fxConstants;

    // Points to the crowdsale proxies
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private CROWDSALE_PROXIES;

    event CrowdSaleCreated(
        address indexed crowdsaleAddress,
        address indexed guildToken,
        address indexed dao,
        address developer,
        address treasury,
        uint256 startingPrice,
        address deployer
    );
    event FactoryStaffWhitelist(
        address indexed staffMember,
        address indexed whitelistedBy,
        bool isActive
    );
    event GuildOwnerWhitelist(
        address indexed guildOwner,
        address indexed whitelistedBy,
        bool isActive
    );

    constructor(address dao, address _fxConstants) {
        require(dao != address(0), "DAO address cannot be zero");
        require(
            _fxConstants != address(0),
            "FXConstants address cannot be zero"
        );
        crowdsaleImplementation = address(new CrowdSale());
        fxConstants = _fxConstants;
        _grantRole(DAO_ROLE, dao);
        _grantRole(GFX_STAFF_ROLE, dao);
    }

    function createCrowdSale(
        address guildToken,
        address guildDao,
        address guildDev,
        address guildTreasury,
        uint256 startingPrice // Should be in 8 decimals: For example price of 1 USD = 100,000,000 startingPrice
    ) public onlyRole(GUILD_OWNER_ROLE) whenNotPaused returns (address) {
        // See how to deploy upgradeable token here https://forum.openzeppelin.com/t/deploying-upgradeable-proxies-and-proxy-admin-from-factory-contract/12132/3
        ERC1967Proxy proxy = new ERC1967Proxy(
            crowdsaleImplementation,
            abi.encodeWithSelector(
                CrowdSale(address(0)).initialize.selector,
                guildToken,
                guildDao,
                guildDev,
                fxConstants,
                guildTreasury,
                startingPrice
            )
        );
        CROWDSALE_PROXIES.add(address(proxy));
        emit CrowdSaleCreated(
            address(proxy),
            guildToken,
            guildDao,
            guildDev,
            guildTreasury,
            startingPrice,
            msg.sender
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

    function viewCrowdSales() public view returns (bytes32[] memory) {
        // TODO investigate memory usage if GUILD_TOKEN_PROXIES can be huge
        // > 0xterran: the limit for arrays is ~1,000 to 20,000
        // https://hackernoon.com/how-much-can-i-do-in-a-block-163q3xp2
        return CROWDSALE_PROXIES._inner._values;
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }
}
