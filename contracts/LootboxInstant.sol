// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
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
contract LootboxInstant is Initializable, ERC721Upgradeable, ERC721EnumerableUpgradeable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
  using CountersUpgradeable for CountersUpgradeable.Counter;

  string public variant;
  string public semver;
  string public _tokenURI;  // Something like https://storage.googleapis.com/lootbox-data-staging/{lootboxAddress}.json

  /** ------------------ SETUP & AUTH ------------------
   * 
   */
  // roles
  bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
  bytes32 public constant SUPERSTAFF_ROLE = keccak256("SUPERSTAFF_ROLE");
  bytes32 public constant BULKMINTER_ROLE = keccak256("BULKMINTER_ROLE");
  // decimals
  uint256 public shareDecimals;
  uint256 public feeDecimals;
  // references
  uint256 public deploymentStartTime;

  /** ------------------ FUNDRAISING STATE ------------------
   * 
   */
  address public issuer;
  uint256 public sharePriceWei;  // THIS SHOULD NOT BE MODIFIED (should be equal to 1 microether, i.e. 1000000000000)
  uint256 public sharePriceWeiDecimals; // THIS SHOULD NOT BE MODIFIED (should be equal to 18)
  uint256 public sharesSoldCount;
  uint256 public sharesSoldTarget;
  uint256 public sharesSoldMax;
  uint256 public nativeTokenRaisedTotal;
  mapping(uint256 => address) public purchasers;
  CountersUpgradeable.Counter public purchaserCounter;
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
    uint256 sharesPurchased
  );

  /** ------------------ FEES STATE ------------------
   * 
   */
  address public broker;
  uint256 public ticketPurchaseFee;
  event CompleteFundraiser(
    address indexed issuer,
    address indexed treasury,
    address lootbox,
    uint256 totalAmountRaised,
    uint256 sharesSold
  );

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
    address indexed broker,
    address lootbox,
    uint256 ticketId,
    uint256 nativeTokenRaisedTotal,
    uint256 nativeTokensSentToTreasury,
    uint256 nativeTokensSentToBroker,
    uint256 sharesPurchased,
    uint256 sharePriceWei
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

  /** ------------------ CONSTRUCTOR ------------------
   * 
   */
   /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() initializer {}
  function initialize(
    string memory _name,
    string memory _symbol,
    string memory _baseTokenURI,
    uint256 _targetSharesSold,
    uint256 _maxSharesSold,
    address _treasury,
    address _issuingEntity,
    uint256 _ticketPurchaseFee,
    address _broker,
    address _superstaff
  ) initializer public {
    
    variant = "Instant";
    semver = "0.6.3-prod";

    bytes memory tempEmptyNameTest = bytes(_name);
    bytes memory tempEmptySymbolTest = bytes(_symbol);

    require(tempEmptyNameTest.length != 0, "Name cannot be empty");
    require(tempEmptySymbolTest.length != 0, "Symbol cannot be empty");
    require(bytes(_baseTokenURI).length != 0, "Base token URI cannot be empty");

    require(_ticketPurchaseFee < 100000000, "Purchase ticket fee must be less than 100000000 (100%)");
    require(_treasury != address(0), "Treasury cannot be the zero address");
    require(_issuingEntity != address(0), "Issuer cannot be the zero address");
    require(_maxSharesSold > 0, "Max shares sold must be greater than zero");
    require(_targetSharesSold > 0, "Target shares sold must be greater than zero");
    require(_targetSharesSold <= _maxSharesSold, "Target shares sold must be less than or equal to max shares sold");
    require(_broker != address(0), "Broker cannot be the zero address");        // the broker is LootboxInstant Ltd.
    require(_superstaff != address(0), "Superstaff cannot be the zero address"); // E10 - "Superstaff cannot be the zero address" (the superstaff is a staff member of the lootbox)

    __ERC721_init(_name, _symbol);
    __ERC721Enumerable_init();
    __Pausable_init();
    __AccessControl_init();
    __UUPSUpgradeable_init();

    // solhint-disable-next-line not-rely-on-time
    deploymentStartTime = block.timestamp;
    shareDecimals = 18;
    feeDecimals = 8;
    sharePriceWei = 1000000000000;
    sharePriceWeiDecimals = 18;

    nativeTokenRaisedTotal = 0;
    sharesSoldTarget = _targetSharesSold;
    sharesSoldMax = _maxSharesSold;

    issuer = _issuingEntity;

    isFundraising = true;
    treasury = _treasury;

    ticketPurchaseFee = _ticketPurchaseFee;
    broker = _broker;

    _tokenURI = _baseTokenURI;
    
    _grantRole(DAO_ROLE, _issuingEntity);
    _grantRole(SUPERSTAFF_ROLE,_superstaff);
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
    require(msg.value > 0, "Purchase must be greater than zero");
    require(msg.sender != treasury, "Treasury cannot purchase tickets");
    require(isFundraising == true, "Tickets cannot be purchased after the fundraising period");

    uint256 brokerReceived = msg.value * (ticketPurchaseFee) / (1*10**(8));
    uint256 treasuryReceived = msg.value - brokerReceived;

    // calculate how many shares to buy based on treasuryReceived
    uint256 sharesPurchased = estimateSharesPurchase(treasuryReceived);

    // do not allow selling above sharesSoldMax 
    require(sharesPurchased <= checkMaxSharesRemainingForSale(), "Not enough shares remaining to purchase, try a smaller amount");
    // get an ID
    uint256 ticketId = ticketIdCounter.current();
    ticketIdCounter.increment();
    // update the mapping that tracks how many shares a ticket owns
    sharesInTicket[ticketId] = sharesPurchased;
    purchasers[purchaserCounter.current()] = msg.sender;
    purchaserCounter.increment();
    // update the total count of shares sold
    sharesSoldCount = sharesSoldCount + sharesPurchased;
    nativeTokenRaisedTotal = nativeTokenRaisedTotal + treasuryReceived;
    // emit the Purchase event
    emit MintTicket(
      msg.sender,
      treasury,
      address(this),
      ticketId,
      sharesPurchased
    );
    // emit the InvestmentFundsDispersed event);
    emit InvestmentFundsDispersed(
      msg.sender,
      treasury,
      broker,
      address(this),
      ticketId,
      msg.value,
      treasuryReceived,
      brokerReceived,
      sharesPurchased,
      sharePriceWei
    );
    // collect the payment and send to treasury (should be a multisig)
    (bool tsuccess,) = address(treasury).call{value: treasuryReceived}("");
    require(tsuccess, "Treasury could not receive payment");
    (bool bsuccess,) = address(broker).call{value: brokerReceived}("");
    require(bsuccess, "Broker could not receive payment");
    // mint the NFT ticket
    _safeMint(msg.sender, ticketId);
    // return the ticket ID & sharesPurchased
    return (ticketId, sharesPurchased);
  }
  // external function to estimate how much guild tokens a user will receive
  function estimateSharesPurchase (uint256 nativeTokenAmount) public view returns (uint256) {
    uint256 nativeTokenDecimals = 18;
    uint256 sharesPurchased = convertInputTokenToShares(
      nativeTokenAmount,
      nativeTokenDecimals
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
      uint256 stablecoinDecimals
  ) internal view returns (uint256 sharesAmount) {
      return amountOfStableCoin * 10 ** (shareDecimals + sharePriceWeiDecimals - stablecoinDecimals) / sharePriceWei;
  }
  // bulk mint NFTs
  function bulkMintNFTs (
    address _to,
    uint256 _quantity
  // ) public payable nonReentrant whenNotPaused onlyRole(BULKMINTER_ROLE) {
  ) public payable nonReentrant whenNotPaused {
    require(_to != address(0), "Cannot mint to the zero address"); // E11 - "Cannot mint to the zero address"
    
    require(_quantity > 0, "Must mint a quantity"); // E13 - "Must mint a quantity"

    uint256 brokerReceived = msg.value * (ticketPurchaseFee) / (1*10**(8));
    uint256 treasuryReceived = msg.value - brokerReceived;
    // calculate how many shares to buy based on treasuryReceived
    uint256 sharesPurchased = estimateSharesPurchase(treasuryReceived);
    // do not allow selling above sharesSoldMax 
    require(sharesPurchased <= checkMaxSharesRemainingForSale(), "Not enough shares remaining to purchase"); // E14 - "Not enough shares remaining to purchase"
    sharesSoldCount = sharesSoldCount + sharesPurchased;
    nativeTokenRaisedTotal = nativeTokenRaisedTotal + treasuryReceived;
    // broker gets their cut, the rest stays in the contract for escrow
    (bool bsuccess,) = address(broker).call{value: brokerReceived}("");
    require(bsuccess, "Broker could not receive payment"); // E15 - "Broker could not receive payment"
    purchasers[purchaserCounter.current()] = msg.sender;
    purchaserCounter.increment();
    // loop through bulk minting
    uint256 bulkSharesRemain = sharesPurchased;
    uint256 portionAllocated = sharesPurchased / _quantity;
    for (uint256 i=0; i < _quantity; i++) {
      // update the mapping that tracks how many shares a ticket owns
      if (i+1 < _quantity) {
        sharesInTicket[ticketIdCounter.current()] = portionAllocated;
        bulkSharesRemain = bulkSharesRemain - portionAllocated;
      } else {
        sharesInTicket[ticketIdCounter.current()] = bulkSharesRemain;
        bulkSharesRemain = 0;
      }
      // mint the NFT ticket
      _safeMint(_to, ticketIdCounter.current());
      ticketIdCounter.increment();
    }
    emit MintTicket(
      msg.sender,
      treasury,
      address(this),
      ticketIdCounter.current() - 1,
      sharesPurchased
    );
    return;
  }
  // whitelist bulk minter
  function whitelistBulkMinter (address _addr, bool _allowed) public onlyRole(SUPERSTAFF_ROLE) {
    if (_allowed) {
      _grantRole(BULKMINTER_ROLE, _addr);
    } else {
      _revokeRole(BULKMINTER_ROLE, _addr);
    }
  }

  /**
  * ------------------ END FUNDRAISING PERIOD ------------------
  *
  *   endFundraising()
  */
  function endFundraisingPeriod () public nonReentrant whenNotPaused {
    require(isFundraising == true, "Fundraising period has already ended");
    isFundraising = false;
    emit CompleteFundraiser(
      issuer,
      treasury,
      address(this),
      nativeTokenRaisedTotal,
      sharesSoldCount
    );
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

  // Note: functions using this MUST be wrapped with the `nonReentrant` modifier because it uses risky `.call`
  function _depositEarningsNative (address from, uint256 amount) private {
    require(isFundraising == false, "Deposits cannot be made during fundraising period");
    require(sharesSoldCount > 0, "No shares have been sold. Deposits will not be accepted");
    require(amount > 0, "Deposit amount must be greater than 0");
    // log this payout in sum
    nativeTokenDeposited = nativeTokenDeposited + amount;
    // create the deposit receipt
    uint256 depositId = depositIdCounter.current();
    Deposit memory deposit = Deposit ({
      depositId: depositId,
      blockNumber: block.number,
      nativeTokenAmount: amount,
      erc20Token: address(0),
      erc20TokenAmount: 0,
      timestamp: block.timestamp
    });
    // save deposit receipt to mapping, increment ID
    depositReciepts[depositId] = deposit;
    // emit the DepositEarnings event
    emit DepositEarnings(
      from,
      address(this),
      depositId,
      amount,
      address(0),
      0
    );
    depositIdCounter.increment();
    // transfer the native tokens to this LootboxInstant contract
    (bool success,) = address(this).call{value: amount}("");
    require(success, "Lootbox could not receive payment");
  }
  // Note: functions using this MUST be wrapped with the `nonReentrant` modifier
  function _depositEarningsErc20 (address from, address erc20Token, uint256 erc20Amount) private { 
    require(isFundraising == false, "Deposits cannot be made during fundraising period");
    require(sharesSoldCount > 0, "No shares have been sold. Deposits will not be accepted");
    require(msg.value == 0, "Deposits of erc20 cannot also include native tokens in the same transaction");
    require(erc20Amount > 0, "Deposit amount must be greater than 0");
    // log this to our list of erc20 tokens
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
      from,
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
    token.transferFrom(from, address(this), erc20Amount);
  }
  // do not send native tokens direct to lootbox or it will get stuck. use depositEarningsNative()
  function depositEarningsNative () public payable nonReentrant whenNotPaused {
    _depositEarningsNative(msg.sender, msg.value);
  }

  // do not send erc20 direct to lootbox or it will get stuck. use depositEarningsErc20()
  function depositEarningsErc20 (address erc20Token, uint256 erc20Amount) public payable nonReentrant whenNotPaused { 
    _depositEarningsErc20(msg.sender, erc20Token, erc20Amount);
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
  function rescueTrappedNativeTokens() public nonReentrant whenNotPaused {
    require(isFundraising == false, "Rescue cannot be made during fundraising period");
    uint256 trappedTokens = checkForTrappedNativeTokens();
    if (trappedTokens > 0) {
      _depositEarningsNative(address(this), trappedTokens);
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
  function rescueTrappedErc20Tokens(address erc20Token) public nonReentrant whenNotPaused {
    require(isFundraising == false, "Rescue cannot be made during fundraising period");
    uint256 trappedTokens = checkForTrappedErc20Tokens(erc20Token);
    if (trappedTokens > 0) {
      _depositEarningsErc20(address(this), erc20Token, trappedTokens);
    }
  }

  /**
  * ------------------ TICKET INFO ------------------
  *  
  *  tokenURI(ticketId)
  *  viewProratedDepositsForTicket(ticketId)
  *  viewAllTicketsOfHolder(address)
  */
  // Metadata about token. Path to gbucket file stored off chain. Currently, it does not use the ticketID
  function tokenURI(uint256 ticketId)
    public
    view
    override(ERC721Upgradeable)
    returns (string memory)
  {
    // Note: this converts the address into a LOWERCASE string
    string memory addressStr = Strings.toHexString(uint160(address(this)), 20);
    string memory tokenURIPath = string.concat(_tokenURI, "/", addressStr, "/", Strings.toString(ticketId), ".json");
    return tokenURIPath;
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
  function _burn(uint256 tokenId) internal pure override(ERC721Upgradeable) {}
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
}
