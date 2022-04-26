// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

interface IERC20ContractB {
    function doSomethingEpic() external returns (bool);

    function decimals() external view returns (uint8);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

contract ContractA is
    Initializable,
    ERC20Upgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter public currentCount;

    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    EnumerableSetUpgradeable.AddressSet private enumOfAddresses;

    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    event EpicEvent(address indexed _from, uint256 _nounce);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // ERC1967 UUPS Upgradeable
    function initialize() public initializer {
        __ERC20_init("ContractA", "TEST_CONTRACT_A");
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEVELOPER_ROLE, msg.sender);
    }

    function initialMint(address _addressAlpha, address _addressBravo)
        public
        onlyRole(DEVELOPER_ROLE)
    {
        _mint(_addressAlpha, 100);
        _mint(_addressBravo, 200);
    }

    function triggerSomethingEpic(address _TOKEN) public {
        currentCount.increment();
        IERC20ContractB(_TOKEN).doSomethingEpic();
        enumOfAddresses.add(msg.sender);
    }

    function viewAllAddresses() public view returns (bytes32[] memory) {
        return enumOfAddresses._inner._values;
    }

    function pause() public onlyRole(DEVELOPER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEVELOPER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEVELOPER_ROLE)
    {}
}
