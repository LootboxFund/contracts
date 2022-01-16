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

contract GuildFactory is Pausable, AccessControl {
    address internal immutable tokenImplementation;
    address internal immutable crowdsaleImplementation;

    // Only the DAO (GuildFX) can control token
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // GuildFX constants
    address public fxConstants;

    // Points to the guild token proxies
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private GUILD_TOKEN_PROXIES;

    // Points to the crowdsale proxies
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private CROWD_SALE_PROXIES;

    event GuildCreated(
        address contractAddress,
        string name,
        string token,
        address dao,
        address developer
    );

    event CrowdSaleCreated(
        address contractAddress,
        address guildToken,
        address dao,
        address developer,
        address treasury,
        uint256 startingPriceInUSDCents
    );

    constructor(address dao, address _fxConstants) {
        require(dao != address(0), "DAO address cannot be zero");
        require(
            _fxConstants != address(0),
            "FXConstants address cannot be zero"
        );
        tokenImplementation = address(new GuildToken());
        crowdsaleImplementation = address(new CrowdSale());
        fxConstants = _fxConstants;
        _grantRole(DAO_ROLE, dao); // TODO: Add way to update DAO_ROLE with DEFAULT_ADMIN_ROLE & add function to set DEFAULT_ADMIN_ROLE to 0
    }

    function createGuild(
        string memory guildName,
        string memory guildSymbol,
        address dao,
        address developer
    ) public whenNotPaused returns (address) {
        // TODO does this function need to be payable?
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
            developer
        );
        return address(proxy);
    }

    function createCrowdSale(
        address guildToken,
        address dao,
        address developer,
        address payable treasury,
        uint256 startingPriceInUSDCents
    ) public whenNotPaused returns (address) {
        // TODO does this function need to be payable?
        // require(bytes(guildName).length != 0, "Guild name cannot be empty");
        // require(bytes(guildSymbol).length != 0, "Guild symbol cannot be empty");
        require(guildToken != address(0), "Guild token cannot be zero");
        require(dao != address(0), "DAO address cannot be zero");
        require(developer != address(0), "Developer address cannot be zero");
        require(treasury != address(0), "Treasury address cannot be zero");
        require(
            startingPriceInUSDCents > 0,
            "Starting price should be greater than zero"
        );

        // See how to deploy upgradeable token here https://forum.openzeppelin.com/t/deploying-upgradeable-proxies-and-proxy-admin-from-factory-contract/12132/3
        ERC1967Proxy proxy = new ERC1967Proxy(
            crowdsaleImplementation,
            abi.encodeWithSelector(
                CrowdSale(address(0)).initialize.selector,
                guildToken,
                dao,
                developer,
                treasury,
                startingPriceInUSDCents
            )
        );
        CROWD_SALE_PROXIES.add(address(proxy));
        emit CrowdSaleCreated(
            address(proxy),
            guildToken,
            dao,
            developer,
            treasury,
            startingPriceInUSDCents
        );
        return address(proxy);
    }

    // function createGuildWithCrowdSale(
    //     string memory guildName,
    //     string memory guildSymbol,
    //     address dao,
    //     address developer
    // ) public whenNotPaused returns (address) {
    //     // TODO does this function need to be payable?

    //     address guildToken = this.createGuild(
    //         guildName,
    //         guildSymbol,
    //         dao,
    //         developer
    //     );

    //     // See how to deploy upgradeable token here https://forum.openzeppelin.com/t/deploying-upgradeable-proxies-and-proxy-admin-from-factory-contract/12132/3
    //     ERC1967Proxy proxy = new ERC1967Proxy(
    //         tokenImplementation,
    //         abi.encodeWithSelector(
    //             GuildToken(address(0)).initialize.selector,
    //             guildName,
    //             guildSymbol,
    //             dao,
    //             developer
    //         )
    //     );
    //     GUILD_TOKEN_PROXIES.add(address(proxy));
    //     emit GuildCreated(
    //         address(proxy),
    //         guildName,
    //         guildSymbol,
    //         dao,
    //         developer
    //     );
    //     return address(proxy);
    // }

    function viewGuildTokens() public view returns (bytes32[] memory) {
        // TODO investigate memory usage if GUILD_TOKEN_PROXIES can be huge
        return GUILD_TOKEN_PROXIES._inner._values;
    }

    function viewCrowdSales() public view returns (bytes32[] memory) {
        // TODO investigate memory usage if GUILD_TOKEN_PROXIES can be huge
        return CROWD_SALE_PROXIES._inner._values;
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }
}
