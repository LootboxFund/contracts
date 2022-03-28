// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

interface IERC20GUILD {
    function mintRequest(address _recipient, uint256 _amount) external;

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function whitelistMint(address _mintAddress, bool _isActive) external;
}

interface IERC20 {
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

interface ICONSTANTS {
    function ETH_ADDRESS() external view returns (address);

    function USDC_ADDRESS() external view returns (address);

    function USDT_ADDRESS() external view returns (address);

    function BNB_PRICE_FEED() external view returns (address);

    function ETH_PRICE_FEED() external view returns (address);

    function USDC_PRICE_FEED() external view returns (address);

    function USDT_PRICE_FEED() external view returns (address);
}

contract CrowdSale is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    AggregatorV3Interface internal priceFeedBNB;
    AggregatorV3Interface internal priceFeedETH;
    AggregatorV3Interface internal priceFeedUSDC;
    AggregatorV3Interface internal priceFeedUSDT;

    // only the DAO can control Treasury
    bytes32 private constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 private constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // stablecoins we accept
    bytes32 private constant _ETH = keccak256("ETH");
    bytes32 private constant _BNB = keccak256("BNB");
    bytes32 private constant _USDC = keccak256("USDC");
    bytes32 private constant _USDT = keccak256("USDT");

    uint256 public currentPriceUSD; // THIS SHOULD NOT BE MODIFIED (8 decimals)

    address payable public TREASURY;
    address public GUILD;
    address public CONSTANTS;

    uint256 public deploymentStartTime;
    uint256 public deploymentEndTime;

    bool public isRetired;

    // counts how many stablecoins this crowdsale has received
    mapping(bytes32 => uint256) public amountRaised;

    event Purchase(
        address indexed _buyer,
        address indexed _stablecoin,
        uint256 _stablecoinPaid,
        uint256 _guildReceived,
        uint256 _priceInUSD,
        int256 _stablecoinPriceInUSD
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // UUPS Upgradeable
    function initialize(
        address _guildToken,
        address _daoAddress,
        address _developerAddress,
        address _constantsAddress,
        address payable _treasuryAddress,
        uint256 _startingPriceInUSD
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        // solhint-disable-next-line not-rely-on-time
        deploymentStartTime = block.timestamp;
        currentPriceUSD = _startingPriceInUSD;

        TREASURY = _treasuryAddress;
        GUILD = _guildToken;
        CONSTANTS = _constantsAddress;

        amountRaised[_ETH] = 0;
        amountRaised[_BNB] = 0;
        amountRaised[_USDC] = 0;
        amountRaised[_USDT] = 0;

        _grantRole(DAO_ROLE, _daoAddress);
        _grantRole(DEVELOPER_ROLE, _developerAddress);

        setOracles();
    }

    function setOracles() private {
        ICONSTANTS constants = ICONSTANTS(CONSTANTS);
        priceFeedBNB = AggregatorV3Interface(constants.BNB_PRICE_FEED());
        priceFeedETH = AggregatorV3Interface(constants.ETH_PRICE_FEED());
        priceFeedUSDC = AggregatorV3Interface(constants.USDC_PRICE_FEED());
        priceFeedUSDT = AggregatorV3Interface(constants.USDT_PRICE_FEED());
    }

    // converts stablecoin amount to guild token amount
    function getGuildTokenPurchaseAmount(
        uint256 amountOfStableCoin,
        uint256 stablecoinDecimals,
        uint256 stableCoinPrice
    ) internal view returns (uint256 guildTokenAmount) {
        // Assumes currentPriceUSD & stableCoinPrice is 8 decimals
        uint256 guildTokenDecimals = 18;
        return
            (amountOfStableCoin *
                stableCoinPrice *
                10**(guildTokenDecimals - stablecoinDecimals)) /
            currentPriceUSD;
    }

    // price is to 8th decimal
    // https://ethereum.stackexchange.com/questions/92508/do-all-chainlink-feeds-return-prices-with-8-decimals-of-precision
    function getUSDCPrice() public view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeedUSDC.latestRoundData();
        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");
        return price;
    }

    function getUSDTPrice() public view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeedUSDT.latestRoundData();
        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");
        return price;
    }

    function getBNBPrice() public view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeedBNB.latestRoundData();
        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");
        return price;
    }

    function getETHPrice() public view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeedETH.latestRoundData();
        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");
        return price;
    }

    function amountRaisedUSDC() public view returns (uint256) {
        return amountRaised[_USDC];
    }

    function amountRaisedUSDT() public view returns (uint256) {
        return amountRaised[_USDT];
    }

    function amountRaisedETH() public view returns (uint256) {
        return amountRaised[_ETH];
    }

    function amountRaisedBNB() public view returns (uint256) {
        return amountRaised[_BNB];
    }

    function totalAmountRaisedInUSD() public view returns (uint256) {
        uint256 stablecoinDecimals = 18;
        return
            (amountRaisedUSDC() *
                uint256(getUSDCPrice()) +
                amountRaisedUSDT() *
                uint256(getUSDTPrice()) +
                amountRaisedETH() *
                uint256(getETHPrice()) +
                amountRaisedBNB() *
                uint256(getBNBPrice())) / (10**stablecoinDecimals);
    }

    function buyInUSDC(uint256 _amount) public payable whenNotPaused {
        // get USD price from oracle
        int256 price = getUSDCPrice();
        ICONSTANTS constants = ICONSTANTS(CONSTANTS);
        address USDC = constants.USDC_ADDRESS();
        IERC20 tokenUSDC = IERC20(USDC);
        uint256 guildPurchasedAmount = getGuildTokenPurchaseAmount(
            _amount,
            tokenUSDC.decimals(),
            uint256(price)
        );
        amountRaised[_USDC] += _amount;
        // transfer stablecoin from buyer wallet to treasury
        tokenUSDC.transferFrom(msg.sender, TREASURY, _amount);

        // transfer GUILD from newly minted, to buyer wallet
        IERC20GUILD tokenGUILD = IERC20GUILD(GUILD);
        tokenGUILD.mintRequest(msg.sender, guildPurchasedAmount);

        // emit purchase event
        emit Purchase(
            msg.sender,
            USDC,
            _amount,
            guildPurchasedAmount,
            currentPriceUSD,
            price
        );
    }

    function buyInUSDT(uint256 _amount) public payable whenNotPaused {
        // get USDT price from oracle
        int256 price = getUSDTPrice();
        ICONSTANTS constants = ICONSTANTS(CONSTANTS);
        address USDT = constants.USDT_ADDRESS();
        IERC20 tokenUSDT = IERC20(USDT);
        // calculate the received GUILD at the current prices of USDT & GUILD
        uint256 guildPurchasedAmount = getGuildTokenPurchaseAmount(
            _amount,
            tokenUSDT.decimals(),
            uint256(price)
        );
        amountRaised[_USDT] += _amount;
        // transfer stablecoin from buyer wallet to treasury
        tokenUSDT.transferFrom(msg.sender, TREASURY, _amount);
        // transfer GUILD from newly minted, to buyer wallet
        IERC20GUILD tokenGUILD = IERC20GUILD(GUILD);
        tokenGUILD.mintRequest(msg.sender, guildPurchasedAmount);

        // emit purchase event
        emit Purchase(
            msg.sender,
            USDT,
            _amount,
            guildPurchasedAmount,
            currentPriceUSD,
            price
        );
    }

    function buyInETH(uint256 _amount) public payable whenNotPaused {
        // get ETH price from oracle
        int256 price = getETHPrice();
        ICONSTANTS constants = ICONSTANTS(CONSTANTS);
        address ETH = constants.ETH_ADDRESS();
        IERC20 tokenETH = IERC20(ETH);
        // calculate the received GUILD at the current prices of ETH & GUILD
        uint256 guildPurchasedAmount = getGuildTokenPurchaseAmount(
            _amount,
            tokenETH.decimals(),
            uint256(price)
        );

        amountRaised[_ETH] += _amount;

        // transfer stablecoin from buyer wallet to treasury
        tokenETH.transferFrom(msg.sender, TREASURY, _amount);
        // transfer GUILD from newly minted, to buyer wallet
        IERC20GUILD tokenGUILD = IERC20GUILD(GUILD);
        tokenGUILD.mintRequest(msg.sender, guildPurchasedAmount);

        // emit purchase event
        emit Purchase(
            msg.sender,
            ETH,
            _amount,
            guildPurchasedAmount,
            currentPriceUSD,
            price
        );
    }

    function buyInBNB() public payable whenNotPaused {
        // get BNB price from oracle
        int256 price = getBNBPrice();
        uint256 bnbDecimals = 18;
        // calculate the received GUILD at the current prices of BNB & GUILD
        uint256 guildPurchasedAmount = getGuildTokenPurchaseAmount(
            msg.value,
            bnbDecimals,
            uint256(price)
        );

        amountRaised[_BNB] += msg.value;

        // forward BNB to beneficiary
        TREASURY.transfer(msg.value);

        // transfer GUILD from newly minted, to buyer wallet
        IERC20GUILD tokenGUILD = IERC20GUILD(GUILD);
        tokenGUILD.mintRequest(msg.sender, guildPurchasedAmount);

        // emit purchase event
        emit Purchase(
            msg.sender,
            address(0),
            msg.value,
            guildPurchasedAmount,
            currentPriceUSD,
            price
        );
    }

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