// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

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
    bytes32 public constant GUILD_MANAGER_ROLE =
        keccak256("GUILD_MANAGER_ROLE"); // People who can whitelist guild owners

    // GuildFX constants
    address public fxConstants;

    // Points to the crowdsale proxies
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private CROWDSALE_PROXIES;

    event CrowdSaleCreated(
        address crowdsaleAddress,
        address guildToken,
        address dao,
        address developer,
        address treasury,
        uint256 startingPrice,
        address deployer
    );
    event GuildManagerWhitelist(address guildManager, bool isActive);
    event GuildOwnerWhitelist(address guildOwner, bool isActive);

    constructor(address dao, address _fxConstants) {
        require(dao != address(0), "DAO address cannot be zero");
        require(
            _fxConstants != address(0),
            "FXConstants address cannot be zero"
        );
        crowdsaleImplementation = address(new CrowdSale());
        fxConstants = _fxConstants;
        _grantRole(DAO_ROLE, dao);
        _grantRole(GUILD_MANAGER_ROLE, dao);
        _grantRole(GUILD_OWNER_ROLE, dao);
    }

    function createCrowdSale(
        address guildToken,
        address dao,
        address developer,
        address treasury,
        uint256 startingPrice // Should be in 8 decimals: For example price of 1 USD = 100,000,000 startingPrice
    ) public onlyRole(GUILD_OWNER_ROLE) whenNotPaused returns (address) {
        // See how to deploy upgradeable token here https://forum.openzeppelin.com/t/deploying-upgradeable-proxies-and-proxy-admin-from-factory-contract/12132/3
        ERC1967Proxy proxy = new ERC1967Proxy(
            crowdsaleImplementation,
            abi.encodeWithSelector(
                CrowdSale(address(0)).initialize.selector,
                guildToken,
                dao,
                developer,
                fxConstants,
                treasury,
                startingPrice
            )
        );
        CROWDSALE_PROXIES.add(address(proxy));
        emit CrowdSaleCreated(
            address(proxy),
            guildToken,
            dao,
            developer,
            treasury,
            startingPrice,
            msg.sender
        );

        return address(proxy);
    }

    function whitelistGuildOwner(address guildOwner, bool isActive)
        public
        onlyRole(GUILD_MANAGER_ROLE)
        whenNotPaused
    {
        if (isActive) {
            _grantRole(GUILD_OWNER_ROLE, guildOwner);
        } else {
            _revokeRole(GUILD_OWNER_ROLE, guildOwner);
        }
        emit GuildOwnerWhitelist(guildOwner, isActive);
    }

    function whitelistGuildManager(address guildManager, bool isActive)
        public
        onlyRole(DAO_ROLE)
        whenNotPaused
    {
        if (isActive) {
            _grantRole(GUILD_MANAGER_ROLE, guildManager);
        } else {
            _revokeRole(GUILD_MANAGER_ROLE, guildManager);
        }
        emit GuildManagerWhitelist(guildManager, isActive);
    }

    function viewCrowdSales() public view returns (bytes32[] memory) {
        // TODO investigate memory usage if GUILD_TOKEN_PROXIES can be huge
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
