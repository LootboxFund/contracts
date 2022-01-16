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
    EnumerableSet.AddressSet private GUILD_TOKENS;

    event GuildCreated(address tokenAddress);

    constructor(address _fxConstants) {
        tokenImplementation = address(new GuildToken());
        fxConstants = _fxConstants;
    }

    function createGuild(
        string memory guildName,
        string memory guildSymbol,
        address dao,
        address developer
    ) public payable whenNotPaused returns (address) {
        // TODO: Look more into payable and gas fees

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
        GUILD_TOKENS.add(address(proxy));
        emit GuildCreated(address(proxy));
        return address(proxy);
    }

    function viewGuildTokens() public view returns (bytes32[] memory) {
        return GUILD_TOKENS._inner._values; // TODO investigate memory usage if GUILD_PROXIES can be huge
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }
}
