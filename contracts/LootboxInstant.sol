// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

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

// solhint-disable-next-line max-states-count
contract LootboxInstant is Initializable, ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
  using CountersUpgradeable for CountersUpgradeable.Counter;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

  string public variant;

  /** ------------------ SETUP & AUTH ------------------
   * 
   */
  // roles
  bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
  // decimals
  uint256 public shareDecimals;
  uint256 public feeDecimals;
  // references
  uint256 public deploymentStartTime;
  AggregatorV3Interface internal nativeTokenPriceFeed;

  /** ------------------ FUNDRAISING STATE ------------------
   * 
   */
  address public issuer;
  uint256 public sharePriceUSD; // THIS SHOULD NOT BE MODIFIED (8 decimals)
  uint256 public sharesSoldCount;
  uint256 public sharesSoldMax;
  uint256 public nativeTokenRaisedTotal;
  EnumerableSetUpgradeable.AddressSet private purchasers;
  bool public isFundraising;
  address public treasury;
  // ticketId => numShares
  mapping(uint256 => uint256) public sharesInTicket;
  CountersUpgradeable.Counter public ticketIdCounter;
  event MintTicket(
    address indexed purchaser,
    address indexed treasury,
    address lootbox,
    uint256 ticketId,
    uint256 sharesPurchased,
    uint256 sharePriceUSD
  );

  /** ------------------ FEES STATE ------------------
   * 
   */
  address public broker;
  address public affiliate;
  uint256 public ticketPurchaseFee;
  uint256 public ticketAffiliateFee;

  /** ------------------ DEPOSITS ------------------
   * 
   */
  struct Deposit {
    uint256 depositId;
    uint256 blockNumber;
    uint256 nativeTokenAmount;
    address erc20Token;
    uint256 erc20TokenAmount;
    uint256 timestamp;
  }
  // depositId => Deposit
  mapping(uint256 => Deposit) public depositReciepts;
  CountersUpgradeable.Counter public depositIdCounter;
  // token => totalDeposited
  mapping(address => uint256) public erc20Deposited;
  EnumerableSetUpgradeable.AddressSet private erc20TokensDeposited;
  uint256 public nativeTokenDeposited;
  event DepositEarnings(
    address indexed depositor,
    address lootbox,
    uint256 depositId,
    uint256 nativeTokenAmount,
    address erc20Token,
    uint256 erc20Amount
  );
  struct DepositMetadata {
    uint256 ticketId;
    uint256 depositId;
    bool redeemed;
    uint256 nativeTokenAmount;
    address erc20Token;
    uint256 erc20TokenAmount;
    uint256 timestamp;
  }

  /** ------------------ WITHDRAWALS ------------------
   * 
   */
  // ticketID => depositID => redeemed
  mapping(uint256 => mapping(uint256 => bool)) public depositRedemptions;
  event InvestmentFundsDispersed(
    address indexed purchaser,
    address indexed treasury,
    address indexed affiliate,
    address broker,
    address lootbox,
    uint256 ticketId,
    uint256 nativeTokenRaisedTotal,
    uint256 nativeTokensSentToTreasury,
    uint256 nativeTokensSentToBroker,
    uint256 nativeTokensSentToAffiliate,
    uint256 sharesPurchased,
    uint256 sharePriceUSD
  );
  event WithdrawEarnings(
    address indexed withdrawer,
    address lootbox,
    uint256 ticketId,
    uint256 depositId,
    uint256 nativeTokenAmount,
    address erc20Token,
    uint256 erc20Amount
  );
  // TODO: Obscure affiliate information (hide it)
  // hide it by refactoring InvestmentFundsDispersed into two events,
  // one for public (sharable event ABI), another for private (affiliate rates & wallets)
  

  /** ------------------ CONSTRUCTOR ------------------
   * 
   */
   /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() initializer {}
  function initialize(
    string memory _name,
    string memory _symbol,
    uint256 _maxSharesSold,
    uint256 _sharePriceUSD,
    address _treasury,
    address _issuingEntity,
    address _nativeTokenPriceFeed,
    uint256 _ticketPurchaseFee,
    uint256 _ticketAffiliateFee,
    address _broker,
    address _affiliate
  ) initializer public {
    
    variant = "Instant";

    bytes memory tempEmptyNameTest = bytes(_name);
    bytes memory tempEmptySymbolTest = bytes(_symbol);

    require(tempEmptyNameTest.length != 0, "Name cannot be empty");
    require(tempEmptySymbolTest.length != 0, "Symbol cannot be empty");

    require(_ticketPurchaseFee < 100000000, "Purchase ticket fee must be less than 100000000 (100%)");
    require(_ticketAffiliateFee <= _ticketPurchaseFee , "Affiliate ticket fee must be less than or equal to purchase ticket fee");
    require(_treasury != address(0), "Treasury cannot be the zero address");
    require(_issuingEntity != address(0), "Issuer cannot be the zero address");
    require(_nativeTokenPriceFeed != address(0), "Native token price feed is required");
    require(_maxSharesSold > 0, "Max shares sold must be greater than zero");
    require(_sharePriceUSD > 0, "Share price must be greater than zero");
    require(_broker != address(0), "Broker cannot be the zero address");        // the broker is LootboxInstant Ltd.
    require(_affiliate != address(0), "Affiliate cannot be the zero address");  // if there is no affiliate, set affiliate to the broker

    __ERC721_init(_name, _symbol);
    __ERC721Enumerable_init();
    __ERC721URIStorage_init();
    __Pausable_init();
    __AccessControl_init();
    __UUPSUpgradeable_init();

    // solhint-disable-next-line not-rely-on-time
    deploymentStartTime = block.timestamp;
    shareDecimals = 18;
    feeDecimals = 8;

    nativeTokenRaisedTotal = 0;
    sharePriceUSD = _sharePriceUSD;
    sharesSoldMax = _maxSharesSold;

    issuer = _issuingEntity;
    nativeTokenPriceFeed = AggregatorV3Interface(_nativeTokenPriceFeed);

    isFundraising = true;
    treasury = _treasury;

    ticketPurchaseFee = _ticketPurchaseFee;
    ticketAffiliateFee = _ticketAffiliateFee;
    broker = _broker;

    // we can set the broker to a designated smart contract that handles splitting with affiliate fees
    affiliate = _affiliate;

    _grantRole(DAO_ROLE, _issuingEntity);
  }



  /**
  * ------------------ PURCHASE TICKET ------------------
  *
  *   purchaseTicket()
  *
  *   estimateSharesPurchase(nativeTokenAmount)
  *   checkMaxSharesRemainingForSale()
  */
  // buy in native tokens only. use purchaseTicket(), do not directly send $ to lootbox
  function purchaseTicket () public payable nonReentrant whenNotPaused returns (uint256 _ticketId, uint256 _sharesPurchased) {
    require(msg.sender != treasury, "Treasury cannot purchase tickets");
    require(isFundraising == true, "Tickets cannot be purchased after the fundraising period");
    // calculate how many shares to buy based on msg.value
    uint256 sharesPurchased = estimateSharesPurchase(msg.value);

    // do not allow selling above sharesSoldMax 
    require(sharesPurchased < checkMaxSharesRemainingForSale(), "Not enough shares remaining to purchase, try a smaller amount");
    // get an ID
    uint256 ticketId = ticketIdCounter.current();
    ticketIdCounter.increment();
    // update the mapping that tracks how many shares a ticket owns
    sharesInTicket[ticketId] = sharesPurchased;
    purchasers.add(msg.sender);
    // update the total count of shares sold
    sharesSoldCount = sharesSoldCount + sharesPurchased;
    nativeTokenRaisedTotal = nativeTokenRaisedTotal + msg.value;
    // emit the Purchase event
    emit MintTicket(
      msg.sender,
      treasury,
      address(this),
      ticketId,
      sharesPurchased,
      sharePriceUSD
    );
    // emit the InvestmentFundsDispersed event);
    uint256 affiliateReceived = msg.value * ticketAffiliateFee / (1*10**(8));
    uint256 brokerReceived = msg.value * (ticketPurchaseFee - ticketAffiliateFee) / (1*10**(8));
    uint256 treasuryReceived = msg.value - brokerReceived - affiliateReceived;
    emit InvestmentFundsDispersed(
      msg.sender,
      treasury,
      affiliate,
      broker,
      address(this),
      ticketId,
      msg.value,
      treasuryReceived,
      brokerReceived,
      affiliateReceived,
      sharesPurchased,
      sharePriceUSD
    );
    // collect the payment and send to treasury (should be a multisig)
    (bool tsuccess,) = address(treasury).call{value: treasuryReceived}("");
    require(tsuccess, "Treasury could not receive payment");
    (bool bsuccess,) = address(broker).call{value: brokerReceived}("");
    require(bsuccess, "Broker could not receive payment");
    (bool asuccess,) = address(affiliate).call{value: affiliateReceived}("");
    require(asuccess, "Affiliate could not receive payment");
    // mint the NFT ticket
    _safeMint(msg.sender, ticketId);
    // return the ticket ID & sharesPurchased
    return (ticketId, sharesPurchased);
  }
  // external function to estimate how much guild tokens a user will receive
  function estimateSharesPurchase (uint256 nativeTokenAmount) public view returns (uint256) {
    // get price feed of native token
    (
      uint80 roundID,
      int256 price,
      uint256 startedAt,
      uint256 timeStamp,
      uint80 answeredInRound
    ) = nativeTokenPriceFeed.latestRoundData();
    uint256 nativeTokenDecimals = 18;
    // If the round is not complete yet, timestamp is 0
    require(timeStamp > 0, "Round not complete");
    uint256 sharesPurchased = convertInputTokenToShares(
      nativeTokenAmount,
      nativeTokenDecimals,
      uint256(price)
    );
    return sharesPurchased;
  }
  // external function to check how many shares are remaining for sale
  function checkMaxSharesRemainingForSale () public view returns (uint256) {
    return sharesSoldMax - sharesSoldCount;
  }
  // internal helper function that converts stablecoin amount to guild token amount
  function convertInputTokenToShares(
      uint256 amountOfStableCoin,
      uint256 stablecoinDecimals,
      uint256 stableCoinPrice
  ) internal view returns (uint256 guildTokenAmount) {
      return
          (amountOfStableCoin *
              stableCoinPrice *
              10**(shareDecimals - stablecoinDecimals)) /
          sharePriceUSD;
  }



  /**
  * ------------------ END FUNDRAISING PERIOD ------------------
  *
  *   endFundraising()
  */
  function endFundraisingPeriod () public onlyRole(DAO_ROLE) nonReentrant whenNotPaused {
    require(isFundraising == true, "Fundraising period has already ended");
    isFundraising = false;
  }



  /**
  * ------------------ DEPOSIT DIVIDENDS ------------------
  *
  *   depositEarningsNative()
  *   depositEarningsErc20(address, amount)
  *
  *   viewDeposit(depositId)
  *
  *   checkForTrappedNativeTokens()
  *   rescueTrappedNativeTokens()
  *   checkForTrappedErc20Tokens(address)
  *   rescueTrappedErc20Tokens(address)
  */
  // do not send native tokens direct to lootbox or it will get stuck. use depositEarningsNative()
  function depositEarningsNative () public payable nonReentrant whenNotPaused {
    require(isFundraising == false, "Deposits cannot be made during fundraising period");
    require(sharesSoldCount > 0, "No shares have been sold. Deposits will not be accepted");
    // log this payout in sum
    nativeTokenDeposited = nativeTokenDeposited + msg.value;
    // create the deposit receipt
    uint256 depositId = depositIdCounter.current();
    Deposit memory deposit = Deposit ({
      depositId: depositId,
      blockNumber: block.number,
      nativeTokenAmount: msg.value,
      erc20Token: address(0),
      erc20TokenAmount: 0,
      timestamp: block.timestamp
    });
    // save deposit receipt to mapping, increment ID
    depositReciepts[depositId] = deposit;
    // emit the DepositEarnings event
    emit DepositEarnings(
      msg.sender,
      address(this),
      depositId,
      msg.value,
      address(0),
      0
    );
    depositIdCounter.increment();
    // transfer the native tokens to this LootboxInstant contract
    (bool success,) = address(this).call{value: msg.value}("");
    require(success, "Lootbox could not receive payment");
  }
  // do not send erc20 direct to lootbox or it will get stuck. use depositEarningsErc20()
  function depositEarningsErc20 (address erc20Token, uint256 erc20Amount) public payable nonReentrant whenNotPaused { 
    require(isFundraising == false, "Deposits cannot be made during fundraising period");
    require(sharesSoldCount > 0, "No shares have been sold. Deposits will not be accepted");
    require(msg.value == 0, "Deposits of erc20 cannot also include native tokens in the same transaction");
    // log this to our list of erc20 tokens
    erc20TokensDeposited.add(erc20Token);
    erc20Deposited[erc20Token] = erc20Deposited[erc20Token] + erc20Amount;
    // create the deposit receipt
    uint256 depositId = depositIdCounter.current();
    Deposit memory deposit = Deposit ({
      depositId: depositId,
      blockNumber: block.number,
      nativeTokenAmount: 0,
      erc20Token: erc20Token,
      erc20TokenAmount: erc20Amount,
      // solhint-disable-next-line not-rely-on-time
      timestamp: block.timestamp
    });
    // save deposit receipt to mapping, increment ID
    depositReciepts[depositId] = deposit;
    // emit the DepositEarnings event
    emit DepositEarnings(
      msg.sender,
      address(this),
      depositId,
      0,
      erc20Token,
      erc20Amount
    );
    depositIdCounter.increment();
    
    // transfer the erc20 tokens to this LootboxInstant contract
    IERC20 token = IERC20(erc20Token);
    token.approve(address(this), erc20Amount);
    token.transferFrom(msg.sender, address(this), erc20Amount);
  }
  function viewDeposit(uint depositId) public view returns (Deposit memory _deposit) {
    return depositReciepts[depositId];
  }
  function checkForTrappedNativeTokens() public view returns (uint256 _trappedTokens) {
    uint256 depositedTokens = 0;
    for (uint256 i=0; i < depositIdCounter.current(); i++) {
      Deposit memory deposit = depositReciepts[i];
      if (deposit.erc20Token == address(0)) {
        depositedTokens = depositedTokens + deposit.nativeTokenAmount;
      }
    }
    uint256 trappedTokens = address(this).balance - depositedTokens;
    return trappedTokens;
  }
  function rescueTrappedNativeTokens() public onlyRole(DAO_ROLE) nonReentrant whenNotPaused {
    require(isFundraising == false, "Rescue cannot be made during fundraising period");
    uint256 trappedTokens = checkForTrappedNativeTokens();
    if (trappedTokens > 0) {
      (bool success,) = address(treasury).call{value: trappedTokens}("");
      require(success, "Trasury could not receive trapped tokens");
    }
  }
  function checkForTrappedErc20Tokens(address erc20Token) public view returns (uint256 _trappedTokens) {
    uint256 depositedTokens = 0;
    for (uint256 i=0; i < depositIdCounter.current(); i++) {
      Deposit memory deposit = depositReciepts[i];
      if (deposit.erc20Token == erc20Token) {
        depositedTokens = depositedTokens + deposit.erc20TokenAmount;
      }
    }
    IERC20 token = IERC20(erc20Token);
    uint256 trappedTokens = token.balanceOf(address(this)) - depositedTokens;
    return trappedTokens;
  }
  function rescueTrappedErc20Tokens(address erc20Token) public onlyRole(DAO_ROLE) nonReentrant whenNotPaused {
    require(isFundraising == false, "Rescue cannot be made during fundraising period");
    uint256 trappedTokens = checkForTrappedErc20Tokens(erc20Token);
    IERC20 token = IERC20(erc20Token);
    if (trappedTokens > 0) {
      token.transfer(treasury, trappedTokens);
    }
  }

  /**
  * ------------------ TICKET INFO ------------------
  *  
  *  tokenURI(ticketId)
  *  viewTicketInfo(ticketId)
  *  viewProratedDepositsForTicket(ticketId)
  *  viewOwedOfNativeTokenToTicket(ticketId)
  *  viewOwedErc20TokensToTicket(ticketId, erc20address)
  *  viewAllTicketsOfHolder(address)
  */
  // metadata about token. returns only the ticketId. the url is built by frontend & actual data is stored off-chain on GBucket
  function tokenURI(uint256 ticketId)
    public
    pure
    override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    returns (string memory)
  {
    return uint2str(ticketId);
  }
  function viewProratedDepositsForTicket(uint256 ticketId) public view returns (DepositMetadata[] memory _depositsMetadatas) {
    uint sharesOwned = sharesInTicket[ticketId]; 
    _depositsMetadatas = new DepositMetadata[](depositIdCounter.current());
    for (uint256 i=0; i < depositIdCounter.current(); i++) {
      uint256 owedNative = depositReciepts[i].nativeTokenAmount * sharesOwned / sharesSoldCount;
      uint256 owedErc20 = depositReciepts[i].erc20TokenAmount * sharesOwned / sharesSoldCount;
      DepositMetadata memory depositMetadata = DepositMetadata ({
        ticketId: ticketId,
        depositId: depositReciepts[i].depositId,
        redeemed: depositRedemptions[ticketId][depositReciepts[i].depositId],
        nativeTokenAmount: owedNative,
        erc20Token: depositReciepts[i].erc20Token,
        erc20TokenAmount: owedErc20,
        timestamp: depositReciepts[i].timestamp
      });
      _depositsMetadatas[i] = depositMetadata;
    }
    return _depositsMetadatas;
  }
  // info about the ticket shares owned, % owned, and share price
  function viewTicketInfo(uint256 ticketId) public view returns (uint256 _sharesOwned, uint256 _percentageOwned, uint256 _sharePriceUSD) {
    uint256 sharesOwned = sharesInTicket[ticketId];
    uint256 percentageDecimals = 8;
    uint256 percentageOwned = sharesOwned * 1*(10**percentageDecimals) / sharesSoldCount;
    return (
      sharesOwned,
      percentageOwned,
      sharePriceUSD
    );
  }
  function viewOwedOfNativeTokenToTicket (uint256 ticketId) public view returns (uint256 _owed) {
    uint sharesOwned = sharesInTicket[ticketId]; 
    uint256 owed = 0;
    for(uint256 i=0; i < depositIdCounter.current(); i++){
      Deposit memory deposit = depositReciepts[i];
      if (depositRedemptions[ticketId][deposit.depositId] != true) {
        if (deposit.erc20Token == address(0)) {
          owed = owed + (deposit.nativeTokenAmount * sharesOwned / sharesSoldCount);
        }
      }
    }
    return owed;
  }
  function viewOwedErc20TokensToTicket (uint256 ticketId, address erc20Token) public view returns (uint256 _owed) {
    uint sharesOwned = sharesInTicket[ticketId]; 
    uint256 owed = 0;
    for(uint256 i=0; i < depositIdCounter.current(); i++){
      Deposit memory deposit = depositReciepts[i];
      if (depositRedemptions[ticketId][deposit.depositId] != true) {
        if (deposit.erc20Token == erc20Token) {
          owed = owed + (deposit.erc20TokenAmount * sharesOwned / sharesSoldCount);
        }
      }
    }
    return owed;
  }
  function viewAllTicketsOfHolder(address holder) public view returns (uint256[] memory _tickets) {
    uint256 ownedByHolder = balanceOf(holder);
    uint256[] memory ticketsOwned = new uint256[](ownedByHolder);
    for(uint256 i=0; i < ownedByHolder; i++){
      ticketsOwned[i] = tokenOfOwnerByIndex(holder, i);
    }
    return ticketsOwned;
  }



  /**
  * ------------------ WITHDRAW EARNINGS ------------------
  * 
  *  withdrawEarnings(ticketId)
  */
  function withdrawEarnings (uint256 ticketId) public nonReentrant whenNotPaused {
    require(isFundraising == false, "Withdrawals cannot be made during fundraising period");
    require(ownerOf(ticketId) == msg.sender, "You do not own this ticket");
    uint sharesOwned = sharesInTicket[ticketId]; 
    // loop through all deposits
    for(uint256 i=0; i < depositIdCounter.current(); i++){
      Deposit memory deposit = depositReciepts[i];
      if (depositRedemptions[ticketId][deposit.depositId] != true) {
        // mark as redeemed
        depositRedemptions[ticketId][deposit.depositId] = true;
        // handle erc20 tokens
        if (deposit.erc20Token != address(0)) {
          // calculate how much is owed
          uint256 owedErc20 = deposit.erc20TokenAmount * sharesOwned / sharesSoldCount;
          // emit the WithdrawEarnings event
          emit WithdrawEarnings(
            msg.sender,
            address(this),
            ticketId,
            deposit.depositId,
            0,
            deposit.erc20Token,
            owedErc20
          );
          // transfer the erc20 tokens to the sender
          IERC20 token = IERC20(deposit.erc20Token);
          token.transferFrom(address(this), ownerOf(ticketId), owedErc20);
        } else {
          // handle native tokens
          uint256 owedNative = deposit.nativeTokenAmount * sharesOwned / sharesSoldCount;
          // emit the WithdrawEarnings event
          emit WithdrawEarnings(
            msg.sender,
            address(this),
            ticketId,
            deposit.depositId,
            owedNative,
            address(0),
            0
          );
          (bool success,) = address(ownerOf(ticketId)).call{value: owedNative}("");
          require(success, "Ticket holder could not receive earnings");
        }
      }
    }
  }



  /**
  * ------------------ LOOTBOX INFO ------------------
  *  
  *  viewAllDeposits()
  *  viewDepositedTokens()
  *  viewPurchasers()
  *  viewTotalDepositOfNativeToken()
  *  viewTotalDepositOfErc20Token(address)
  */
  function viewAllDeposits() public view returns (Deposit[] memory _deposits) {
    _deposits = new Deposit[](depositIdCounter.current());
    for (uint256 i=0; i < depositIdCounter.current(); i++) {
      _deposits[i] = depositReciepts[i];
    }
    return _deposits;
  }
  function viewDepositedTokens() public view returns (bytes32[] memory) {
    return erc20TokensDeposited._inner._values;
  }
  function viewPurchasers() public view returns (bytes32[] memory) {
    return purchasers._inner._values;
  }
  function viewTotalDepositOfNativeToken() public view returns (uint256 _totalDeposit) {
    uint256 totalDeposit = 0;
    for (uint256 i=0; i < depositIdCounter.current(); i++) {
      Deposit memory deposit = depositReciepts[i];
      if (deposit.erc20Token == address(0)) {
        totalDeposit = totalDeposit + deposit.nativeTokenAmount;
      }
    }
    return totalDeposit;
  }
  function viewTotalDepositOfErc20Token(address erc20Token) public view returns (uint256 _totalDeposit) {
    uint256 totalDeposit = 0;
    for (uint256 i=0; i < depositIdCounter.current(); i++) {
      Deposit memory deposit = depositReciepts[i];
      if (deposit.erc20Token == erc20Token) {
        totalDeposit = totalDeposit + deposit.erc20TokenAmount;
      }
    }
    return totalDeposit;
  }



  /**
  * ------------------ CLASS INHERITANCE OVERHEAD ------------------
  *  
  * 
  */
  // The following functions are overrides required by Solidity.
  function _beforeTokenTransfer(address from, address to, uint256 tokenId)
    internal
    whenNotPaused
    override(ERC721Upgradeable,ERC721EnumerableUpgradeable)
  {
    super._beforeTokenTransfer(from, to, tokenId);
  }
  // disable burns
  function _burn(uint256 tokenId) internal pure override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {}
  function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal override(ERC721URIStorageUpgradeable) {
    super._setTokenURI(tokenId, _tokenURI);
  }
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721Upgradeable,ERC721EnumerableUpgradeable, AccessControlUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
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
      onlyRole(DAO_ROLE)
      override
  {}
  receive() external payable {}
  // --------- Misc Helpers ---------
  function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
    if (_i == 0) {
        return "0";
    }
    uint j = _i;
    uint len;
    while (j != 0) {
        len++;
        j /= 10;
    }
    bytes memory bstr = new bytes(len);
    uint k = len;
    while (_i != 0) {
        k = k-1;
        uint8 temp = (48 + uint8(_i - _i / 10 * 10));
        bytes1 b1 = bytes1(temp);
        bstr[k] = b1;
        _i /= 10;
    }
    return string(bstr);
  }
}
