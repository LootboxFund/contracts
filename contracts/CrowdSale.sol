
// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";


interface IERC20GAMER {
	function mintRequest(address _recipient, uint256 _amount) external;
    function transfer(address recipient, uint256 amount) external returns (bool);
    function whitelistMint(address _mintAddress, bool _isActive) external;
}

interface IERC20 {
    function decimals() external view returns (uint8);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);

    event Approval(address indexed owner, address indexed spender, uint256 value);
}


contract CrowdSale is Initializable, ERC20Upgradeable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    
    AggregatorV3Interface internal priceFeedBNB;
    AggregatorV3Interface internal priceFeedETH;
	AggregatorV3Interface internal priceFeedUSDC;
	AggregatorV3Interface internal priceFeedUSDT;
	AggregatorV3Interface internal priceFeedUST;
    AggregatorV3Interface internal priceFeedDAI;

    // only the DAO can control Treasury
    bytes32 constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");
    bytes32 constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

	uint currentPriceUSDCents;

    address payable public TREASURY;
	address public GAMER;

    address public ETH;
    address public USDC;
    address public USDT;
    address public UST; // Mainnet UST 0x23396cf899ca06c4472205fc903bdb4de249d6fc
    address public DAI;

    uint256 deploymentStartTime;
    uint256 deploymentEndTime;

    bool public isRetired;

    event Purchase(address indexed _buyer, address indexed _stablecoin, uint _stablecoinPaid, uint _gamerReceived, uint _priceInUSDCents);
    event ErrorLog(string _error);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // ERC1967 UUPS Upgradeable
    function initialize(
        address _gamerToken,
        address _daoAddress, 
        address _developerAddress, 
        address payable _treasuryAddress,
        uint _startingPriceInUSDCents
    ) initializer public {
        __ERC20_init("CrowdSale", "CROWDSALE_GAMER_TOKEN");
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
 
        deploymentStartTime = block.timestamp;
        currentPriceUSDCents = _startingPriceInUSDCents;

        TREASURY = _treasuryAddress;
		GAMER = _gamerToken;

        _grantRole(DAO_ROLE, _daoAddress);
        _grantRole(GOVERNOR_ROLE, _daoAddress);
        _grantRole(GOVERNOR_ROLE, msg.sender);
        _grantRole(DEVELOPER_ROLE, _developerAddress);

	}

	function setStablecoins(
        address _eth,
        address _usdc,
        address _usdt,
        address _ust,
        address _dai
	) public onlyRole(DAO_ROLE) {
        USDC = _usdc;
        USDT = _usdt;
        UST = _ust;
        ETH = _eth;
        DAI = _dai;
	}

    function setOracles(
        address _priceFeedBNB,
        address _priceFeedETH,
        address _priceFeedUSDC,
        address _priceFeedUSDT,
        address _priceFeedUST,
        address _priceFeedDAI
    ) public onlyRole(DAO_ROLE) {
        priceFeedBNB = AggregatorV3Interface(_priceFeedBNB);
        priceFeedETH = AggregatorV3Interface(_priceFeedETH);
        priceFeedUSDC = AggregatorV3Interface(_priceFeedUSDC);
        priceFeedUSDT = AggregatorV3Interface(_priceFeedUSDT);
        priceFeedUST = AggregatorV3Interface(_priceFeedUST);
        priceFeedDAI = AggregatorV3Interface(_priceFeedDAI);
    }

    function setCurrentUSDPriceInCents (uint _price) public onlyRole(DAO_ROLE) {
        currentPriceUSDCents = _price;
    }

    function getCurrentUSDPriceInCents () external view returns (uint) {
        return currentPriceUSDCents;
    }

    // price is to 8th decimal
    // https://ethereum.stackexchange.com/questions/92508/do-all-chainlink-feeds-return-prices-with-8-decimals-of-precision
    function getUSDCPrice() public view returns (int) {
        (
            uint80 roundID, 
			int price,
			uint startedAt,
			uint timeStamp,
			uint80 answeredInRound
        ) = priceFeedUSDC.latestRoundData();
        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");
        return price;
    }

    function getUSDTPrice() public view returns (int) {
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeedUSDT.latestRoundData();
        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");
        return price;
    }
    
    function getUSTPrice() public view returns (int) {
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeedUST.latestRoundData();
        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");
        return price;
    }

    function getBNBPrice() public view returns (int) {
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeedBNB.latestRoundData();
        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");
        return price;
    }

    function getETHPrice() public view returns (int) {
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeedETH.latestRoundData();
        // console.log("ETH price in USD: %s", price);
        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");
        return price;
    }

    function getDAIPrice() public view returns (int) {
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeedDAI.latestRoundData();
        // If the round is not complete yet, timestamp is 0
        require(timeStamp > 0, "Round not complete");
        return price;
    }

	function buyInUSDC(uint256 _amount) public payable whenNotPaused {
        // get USD price from oracle
		(
			uint80 roundID, 
			int price,
			uint startedAt,
			uint timeStamp,
			uint80 answeredInRound
		) = priceFeedUSDC.latestRoundData();
        uint gamerTokenDecimals = 18;
        uint oracleDecimals = 8;
        IERC20 tokenUSDC = IERC20(USDC);
        // calculate the received GAMER at the current prices of USDC & GAMER
		uint gamerPurchasedAmount = _amount * uint(price) * 10**(gamerTokenDecimals - uint(tokenUSDC.decimals())) / (currentPriceUSDCents * 10**(oracleDecimals - 2));
        // transfer stablecoin from buyer wallet to treasury
        tokenUSDC.transferFrom(msg.sender, TREASURY, _amount);

        // transfer GAMER from newly minted, to buyer wallet
        IERC20GAMER tokenGAMER = IERC20GAMER(GAMER);
        tokenGAMER.mintRequest(msg.sender, gamerPurchasedAmount);
        // emit purchase event
        emit Purchase(msg.sender, USDC, _amount, gamerPurchasedAmount, currentPriceUSDCents);
	}

    function buyInUSDT(uint256 _amount) public payable whenNotPaused {
        // get USDT price from oracle
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeedUSDT.latestRoundData();
        uint gamerTokenDecimals = 18;
        uint oracleDecimals = 8;
        IERC20 tokenUSDT = IERC20(USDT);
        // calculate the received GAMER at the current prices of USDT & GAMER
        uint gamerPurchasedAmount = _amount * uint(price) * 10**(gamerTokenDecimals - uint(tokenUSDT.decimals())) / (currentPriceUSDCents * 10**(oracleDecimals - 2));
        // transfer stablecoin from buyer wallet to treasury
        tokenUSDT.transferFrom(msg.sender, TREASURY, _amount);
        // transfer GAMER from newly minted, to buyer wallet
        IERC20GAMER tokenGAMER = IERC20GAMER(GAMER);
        tokenGAMER.mintRequest(msg.sender, gamerPurchasedAmount);
        // emit purchase event
        emit Purchase(msg.sender, USDT, _amount, gamerPurchasedAmount, currentPriceUSDCents);
    }

    function buyInUST(uint256 _amount) public payable whenNotPaused {
        // get UST price from oracle
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeedUST.latestRoundData();
        uint gamerTokenDecimals = 18;
        uint oracleDecimals = 8;
        IERC20 tokenUST = IERC20(UST);
        // calculate the received GAMER at the current prices of USDT & GAMER
        uint gamerPurchasedAmount = _amount * uint(price) * 10**(gamerTokenDecimals - uint(tokenUST.decimals())) / (currentPriceUSDCents * 10**(oracleDecimals - 2));
        // transfer stablecoin from buyer wallet to treasury
        tokenUST.transferFrom(msg.sender, TREASURY, _amount);
        // transfer GAMER from newly minted, to buyer wallet
        IERC20GAMER tokenGAMER = IERC20GAMER(GAMER);
        tokenGAMER.mintRequest(msg.sender, gamerPurchasedAmount);
        // emit purchase event
        emit Purchase(msg.sender, UST, _amount, gamerPurchasedAmount, currentPriceUSDCents);
    }

    function buyInETH(uint256 _amount) public payable whenNotPaused {
        // get ETH price from oracle
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeedETH.latestRoundData();
        uint gamerTokenDecimals = 18;
        uint oracleDecimals = 8;
        IERC20 tokenETH = IERC20(ETH);
        // calculate the received GAMER at the current prices of ETH & GAMER
        uint gamerPurchasedAmount = _amount * uint(price) * 10**(gamerTokenDecimals - uint(tokenETH.decimals())) / (currentPriceUSDCents * 10**(oracleDecimals - 2));
        // transfer stablecoin from buyer wallet to treasury
        tokenETH.transferFrom(msg.sender, TREASURY, _amount);
        // transfer GAMER from newly minted, to buyer wallet
        IERC20GAMER tokenGAMER = IERC20GAMER(GAMER);
        tokenGAMER.mintRequest(msg.sender, gamerPurchasedAmount);
        // emit purchase event
        emit Purchase(msg.sender, ETH, _amount, gamerPurchasedAmount, currentPriceUSDCents);
    }

    function buyInDAI(uint256 _amount) public payable whenNotPaused {
        // get DAI price from oracle
        (
            uint80 roundID,
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeedDAI.latestRoundData();
        uint gamerTokenDecimals = 18;
        uint oracleDecimals = 8;
        IERC20 tokenDAI = IERC20(DAI);
        // calculate the received GAMER at the current prices of ETH & GAMER
        uint gamerPurchasedAmount = _amount * uint(price) * 10**(gamerTokenDecimals - uint(tokenDAI.decimals())) / (currentPriceUSDCents * 10**(oracleDecimals - 2));
        // transfer stablecoin from buyer wallet to treasury
        tokenDAI.transferFrom(msg.sender, TREASURY, _amount);
        // transfer GAMER from newly minted, to buyer wallet
        IERC20GAMER tokenGAMER = IERC20GAMER(GAMER);
        tokenGAMER.mintRequest(msg.sender, gamerPurchasedAmount);
        // emit purchase event
        emit Purchase(msg.sender, DAI, _amount, gamerPurchasedAmount, currentPriceUSDCents);
    }
    
    function buyInBNB(address payable _beneficiary) public payable whenNotPaused {
        // get BNB price from oracle
        (
            uint80 roundID, 
            int price,
            uint startedAt,
            uint timeStamp, 
            uint80 answeredInRound
        ) = priceFeedBNB.latestRoundData();
        uint gamerTokenDecimals = 18;
        uint bnbDecimals = 18;
        uint oracleDecimals = 8;
        // calculate the received GAMER at the current prices of BNB & GAMER
        uint gamerPurchasedAmount = msg.value * uint(price) * 10**(gamerTokenDecimals - bnbDecimals) / (currentPriceUSDCents * 10**(oracleDecimals - 2));

        // forward BNB to beneficiary
        TREASURY.transfer(msg.value); 

        // transfer GAMER from newly minted, to buyer wallet
        IERC20GAMER tokenGAMER = IERC20GAMER(GAMER);
        tokenGAMER.mintRequest(_beneficiary, gamerPurchasedAmount);
        // emit purchase event
        emit Purchase(_beneficiary, address(0), msg.value, gamerPurchasedAmount, currentPriceUSDCents);
    }
    
    function pause() public onlyRole(GOVERNOR_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(GOVERNOR_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(DEVELOPER_ROLE)
        override
    {}
}
