// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./GuildToken.sol";
import "./CrowdSale.sol";
import "./Governor.sol";

contract GuildFactory is Pausable, AccessControl {
    address internal immutable tokenImplementation;
    address internal immutable governorImplementation;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE"); // GuildFX DAO
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE"); // GuildFX devs
    bytes32 public constant GUILD_OWNER_ROLE = keccak256("GUILD_OWNER_ROLE"); // People who can create a guild
    bytes32 public constant GUILD_MANAGER_ROLE =
        keccak256("GUILD_MANAGER_ROLE"); // People who can whitelist guild owners

    // GuildFX constants
    address public fxConstants;

    // Points to the guild token proxies
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private GUILD_TOKEN_PROXIES;

    // Points to the crowdsale proxies
    // using EnumerableSet for EnumerableSet.AddressSet;
    // EnumerableSet.AddressSet private CROWD_SALE_PROXIES;
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private GOVERNOR_PROXIES;

    event GuildCreated(
        address contractAddress,
        string name,
        string token,
        address dao,
        address developer,
        address creator
    );
    event GovernorCreated(address governorAddress, address creator);
    // event CrowdSaleCreated(
    //     address contractAddress,
    //     address guildToken,
    //     address dao,
    //     address developer,
    //     address fxConstants,
    //     address treasury,
    //     uint256 startingPriceInUSD,
    //     address creator
    // );
    // event GuildCrowdsalePairCreated(
    //     address guildToken,
    //     address crowdsale,
    //     address creator
    // );
    event GuildManagerWhitelist(address guildManager, bool isActive);
    event GuildOwnerWhitelist(address guildOwner, bool isActive);

    constructor(address dao, address _fxConstants) {
        require(dao != address(0), "DAO address cannot be zero");
        require(
            _fxConstants != address(0),
            "FXConstants address cannot be zero"
        );
        tokenImplementation = address(new GuildToken());
        governorImplementation = address(new Governor());
        fxConstants = _fxConstants;
        _grantRole(DAO_ROLE, dao);
        _grantRole(GUILD_MANAGER_ROLE, dao);
        _grantRole(GUILD_OWNER_ROLE, dao);
    }

    function createGuild(
        string memory guildName,
        string memory guildSymbol,
        address dao,
        address developer
    ) internal returns (address) {
        require(bytes(guildName).length != 0, "Guild name cannot be empty");
        require(bytes(guildSymbol).length != 0, "Guild symbol cannot be empty");
        require(dao != address(0), "DAO address cannot be zero");
        require(developer != address(0), "Developer address cannot be zero");

        // See how to deploy upgradeable token here https://forum.openzeppelin.com/t/deploying-upgradeable-proxies-and-proxy-admin-from-factory-contract/12132/3
        ERC1967Proxy proxy = new ERC1967Proxy(
            tokenImplementation,
            abi.encodeWithSelector(
                GuildToken(address(0)).initialize.selector,
                guildName,
                guildSymbol,
                dao,
                developer
            )
        );
        GUILD_TOKEN_PROXIES.add(address(proxy));
        emit GuildCreated(
            address(proxy),
            guildName,
            guildSymbol,
            dao,
            developer,
            msg.sender
        );
        return address(proxy);
    }

    function createGovernor(address token) internal returns (address) {
        // See how to deploy upgradeable token here https://forum.openzeppelin.com/t/deploying-upgradeable-proxies-and-proxy-admin-from-factory-contract/12132/3
        ERC1967Proxy proxy = new ERC1967Proxy(
            governorImplementation,
            abi.encodeWithSelector(
                // TODO: investigate if payable here will affect anything
                Governor(payable(address(0))).initialize.selector,
                token
            )
        );
        GOVERNOR_PROXIES.add(address(proxy));
        emit GovernorCreated(address(proxy), msg.sender);
        return address(proxy);
    }

    // function createCrowdSale(
    //     address guildToken,
    //     address dao,
    //     address developer,
    //     address payable treasury,
    //     uint256 startingPriceInUSD
    // ) internal returns (address) {
    //     require(guildToken != address(0), "Guild token cannot be zero");
    //     require(dao != address(0), "DAO address cannot be zero");
    //     require(developer != address(0), "Developer address cannot be zero");
    //     require(treasury != address(0), "Treasury address cannot be zero");
    //     require(
    //         startingPriceInUSD > 0,
    //         "Starting price should be greater than zero"
    //     );

    //     // See how to deploy upgradeable token here https://forum.openzeppelin.com/t/deploying-upgradeable-proxies-and-proxy-admin-from-factory-contract/12132/3
    //     ERC1967Proxy proxy = new ERC1967Proxy(
    //         crowdsaleImplementation,
    //         abi.encodeWithSelector(
    //             CrowdSale(address(0)).initialize.selector,
    //             guildToken,
    //             dao,
    //             developer,
    //             fxConstants,
    //             treasury,
    //             startingPriceInUSD
    //         )
    //     );
    //     CROWD_SALE_PROXIES.add(address(proxy));
    //     emit CrowdSaleCreated(
    //         address(proxy),
    //         guildToken,
    //         dao,
    //         developer,
    //         fxConstants,
    //         treasury,
    //         startingPriceInUSD,
    //         msg.sender
    //     );
    //     return address(proxy);
    // }

    // function createGuildWithCrowdSale(
    //     string memory guildName,
    //     string memory guildSymbol,
    //     address dao,
    //     address developer,
    //     address payable treasury,
    //     uint256 startingPriceInUSD
    // )
    //     public
    //     onlyRole(GUILD_OWNER_ROLE)
    //     whenNotPaused
    //     returns (address, address)
    // {
    //     address guildToken = createGuild(
    //         guildName,
    //         guildSymbol,
    //         dao,
    //         developer
    //     );

    //     address crowdSale = createCrowdSale(
    //         guildToken,
    //         dao,
    //         developer,
    //         treasury,
    //         startingPriceInUSD
    //     );

    //     emit GuildCrowdsalePairCreated(guildToken, crowdSale, msg.sender);
    //     return (address(guildToken), address(crowdSale));
    // }

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

    function viewGuildTokens() public view returns (bytes32[] memory) {
        // TODO investigate memory usage if GUILD_TOKEN_PROXIES can be huge
        return GUILD_TOKEN_PROXIES._inner._values;
    }

    // function viewCrowdSales() public view returns (bytes32[] memory) {
    //     // TODO investigate memory usage if GUILD_TOKEN_PROXIES can be huge
    //     return CROWD_SALE_PROXIES._inner._values;
    // }
    function viewGovernors() public view returns (bytes32[] memory) {
        return GOVERNOR_PROXIES._inner._values;
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }
}
