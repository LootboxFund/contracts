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
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract ContractB is
    Initializable,
    ERC20Upgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    AggregatorV3Interface internal priceFeed;

    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter public currentCount;

    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    event EpicEvent(address indexed _from, uint256 _nounce);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // ERC1967 UUPS Upgradeable
    function initialize(address _priceFeed) public initializer {
        __ERC20_init("ContractB", "TEST_CONTRACT_B");
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        priceFeed = AggregatorV3Interface(_priceFeed);

        _revokeRole(DEVELOPER_ROLE, msg.sender);
    }

    function doSomethingEpic() public returns (bool) {
        currentCount.increment();
        emit EpicEvent(msg.sender, currentCount.current());
        return true;
    }

    function getCurrentCount() public view returns (uint256) {
        return currentCount.current();
    }

    // --------- Oracles for prices --------- //
    function getLatestPrice() public view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeed.latestRoundData();
        return price;
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
