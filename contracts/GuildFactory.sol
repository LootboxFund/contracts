// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./GuildToken.sol";

contract GuildFactory is Pausable, AccessControl {
    // Points to the guild token proxies
    address internal immutable tokenImplementation;

    // Only the DAO (GuildFX) can control token
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // GuildFX treasury
    address public guildFXTreasury;

    // List of deployed tokens TODO revisit memory costs of using an array
    address[] public deployedContracts;

    event TokenDeployed(address tokenAddress);

    constructor() {
        tokenImplementation = address(new GuildToken());
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
        deployedContracts.push(address(proxy));
        emit TokenDeployed(address(proxy));
        return address(proxy);
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }
}
