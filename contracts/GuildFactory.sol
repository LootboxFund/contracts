// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./GuildToken.sol";

contract GuildFactory is Pausable, AccessControl {
    address internal immutable tokenImplementation;

    // Only the DAO (GuildFX) can control token
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // GuildFX constants
    address public fxConstants;

    // Points to the guild token proxies
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private GUILD_TOKEN_PROXIES;

    event GuildCreated(
        address tokenAddress,
        string name,
        string token,
        address dao,
        address developer
    );

    constructor(address dao, address _fxConstants) {
        tokenImplementation = address(new GuildToken());
        fxConstants = _fxConstants;
        _grantRole(DAO_ROLE, dao); // TODO: Add way to update DAO_ROLE with DEFAULT_ADMIN_ROLE & add function to set DEFAULT_ADMIN_ROLE to 0
    }

    function createGuild(
        string memory guildName,
        string memory guildSymbol,
        address dao,
        address developer
    ) public payable whenNotPaused returns (address) {
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
