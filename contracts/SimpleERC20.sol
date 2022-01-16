pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/presets/ERC20PresetFixedSupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

// TODO: put a limit on tokens allowed to be minted

contract SimpleERC20 is
    ERC20PresetFixedSupplyUpgradeable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner
    ) public override initializer {
        __ERC20PresetFixedSupply_init(name, symbol, initialSupply, owner);
        __Ownable_init();
        transferOwnership(owner);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}
}
