// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Constants is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{

    // only the DAO (GuildFX) can control token
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // Fee GuildFX charges on mintRequests as a fraction (3 decimals).
    // Examples: 1000 = 100%, 500 = 50%, 20 = 2%, 1 = 0.1% fees
    uint256 public INITIAL_MINT_TO_GUILD;
    uint256 public GUILD_FX_MINTING_FEE;
    uint8 public constant GUILD_FX_MINTING_FEE_DECIMALS = 8;
    address payable public TREASURY;  // GuildFX treasury

    // Addresses for crowdsale stable coins
    address public ETH_ADDRESS;
    address public USDC_ADDRESS;
    address public USDT_ADDRESS;
    address public UST_ADDRESS;
    address public DAI_ADDRESS;
    // Addresses for crowdsale price feed
    address public BNB_PRICE_FEED;
    address public ETH_PRICE_FEED;
    address public USDC_PRICE_FEED;
    address public USDT_PRICE_FEED;
    address public UST_PRICE_FEED;
    address public DAI_PRICE_FEED;

    // ------------------------------------------------------------------
    // Insert any new state variables below here when upgrading
    // If you change any lines above when upgrading, you will fuck up shit
    // https://docs.openzeppelin.com/learn/upgrading-smart-contracts
    // ------------------------------------------------------------------





    // ------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // ERC1967 UUPS Upgradeable
    function initialize(
        address dao,
        address developer,
        address payable _treasury
    ) public initializer {
        require(dao != address(0), "DAO cannot be zero");
        require(developer != address(0), "Developer cannot be zero");
        require(_treasury != address(0), "Treasury cannot be zero");

        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DAO_ROLE, dao);
        _grantRole(DEVELOPER_ROLE, developer);
        TREASURY = _treasury;

        GUILD_FX_MINTING_FEE = 20; // in GUILD_FX_MINTING_FEE_DECIMALS (ex: 20 = 2% fee)
        INITIAL_MINT_TO_GUILD = 980;
    }

    function setCrowdSaleStableCoins(
        address eth,
        address usdc,
        address usdt,
        address ust,
        address dai
    ) public onlyRole(DAO_ROLE) whenNotPaused {
        require(eth != address(0), "ETH cannot be zero");
        require(usdc != address(0), "USDC cannot be zero");
        require(usdt != address(0), "USDT cannot be zero");
        require(ust != address(0), "UST cannot be zero");
        require(dai != address(0), "DAI cannot be zero");

        ETH_ADDRESS = eth;
        USDC_ADDRESS = usdc;
        USDT_ADDRESS = usdt;
        UST_ADDRESS = ust;
        DAI_ADDRESS = dai;
    }

    function setOraclePriceFeeds(
        address bnbPriceFeed,
        address ethPriceFeed,
        address usdcPriceFeed,
        address usdtPriceFeed,
        address ustPriceFeed,
        address daiPriceFeed
    ) public onlyRole(DAO_ROLE) whenNotPaused {
        require(bnbPriceFeed != address(0), "BNB price feed cannot be zero");
        require(ethPriceFeed != address(0), "ETH price feed cannot be zero");
        require(usdcPriceFeed != address(0), "USDC price feed cannot be zero");
        require(usdtPriceFeed != address(0), "USDT price feed cannot be zero");
        require(ustPriceFeed != address(0), "UST price feed cannot be zero");
        require(daiPriceFeed != address(0), "DAI price feed cannot be zero");
        BNB_PRICE_FEED = bnbPriceFeed;
        ETH_PRICE_FEED = ethPriceFeed;
        USDC_PRICE_FEED = usdcPriceFeed;
        USDT_PRICE_FEED = usdtPriceFeed;
        UST_PRICE_FEED = ustPriceFeed;
        DAI_PRICE_FEED = daiPriceFeed;
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEVELOPER_ROLE)
    {}
}
