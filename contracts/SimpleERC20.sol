// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleERC20 is ERC20 {
    // address public guildFXTreasury;
    // uint256 currentSupply;

    constructor(string memory tokenName, string memory tokenSymbol)
        ERC20(tokenName, tokenSymbol)
    {
        // guildFXTreasury = _guildFXTreasury;
        // _mint(guildFXTreasury, initialSupply * )
        // _mint(msg.sender, initialSupply);
    }
}
