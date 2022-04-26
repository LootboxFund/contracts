// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
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
contract LootboxEscrow is Initializable, ERC721Upgradeable, ERC721EnumerableUpgradeable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
  using CountersUpgradeable for CountersUpgradeable.Counter;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
  
  string public variant;
  string public semver;

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

  /** ------------------ FUNDRAISING STATE ------------------
   * 
   */
  
  
  uint256 public sharePriceWei;  // THIS SHOULD NOT BE MODIFIED (should be equal to 1 gwei, i.e. 1000000000 wei)
  uint256 public sharePriceWeiDecimals;  // THIS SHOULD NOT BE MODIFIED (should be equal to 18)
  uint256 public sharesSoldCount;
  uint256 public sharesSoldTarget;
  uint256 public sharesSoldMax;
  uint256 public nativeTokenRaisedTotal;
  uint256 public escrowNativeAmount;
  EnumerableSetUpgradeable.AddressSet private purchasers;
  bool public isFundraising;
  address public issuer;
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
    uint256 sharePriceWei
  );
  event CompleteFundraiser(
    address indexed issuer,
    address indexed treasury,
    address lootbox,
    uint256 totalAmountRaised,
    uint256 totalAmountReceived,
    uint256 sharesSold
  );
  event CancelFundraiser(
    address indexed issuer,
    address lootbox,
    uint256 totalAmountRaised,
    uint256 totalAmountRefunded,
    uint256 sharesSold
  );

  /** ------------------ FEES STATE ------------------
   * 
   */
  address public broker;
  uint256 public ticketPurchaseFee;

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
    uint256 _targetSharesSold,
    uint256 _maxSharesSold,
    address _treasury,
    address _issuingEntity,
    uint256 _ticketPurchaseFee,
    address _broker
  ) initializer public {

    variant = "Escrow";
    semver = "0.3.0-prod";

    bytes memory tempEmptyNameTest = bytes(_name);
    bytes memory tempEmptySymbolTest = bytes(_symbol);

    require(tempEmptyNameTest.length != 0, "Name cannot be empty");
    require(tempEmptySymbolTest.length != 0, "Symbol cannot be empty");

    require(_ticketPurchaseFee < 100000000, "Purchase ticket fee must be less than 100000000 (100%)");
    require(_treasury != address(0), "Treasury cannot be the zero address");
    require(_issuingEntity != address(0), "Issuer cannot be the zero address");
    require(_maxSharesSold > 0, "Max shares sold must be greater than zero");
    require(_targetSharesSold > 0, "Target shares sold must be greater than zero");
    require(_targetSharesSold <= _maxSharesSold, "Target shares sold must be less than or equal to max shares sold");
    require(_broker != address(0), "Broker cannot be the zero address");        // the broker is LootboxEscrow Ltd.

    __ERC721_init(_name, _symbol);
    __ERC721Enumerable_init();
    __Pausable_init();
    __AccessControl_init();
    __UUPSUpgradeable_init();

    // solhint-disable-next-line not-rely-on-time
    deploymentStartTime = block.timestamp;
    shareDecimals = 18;
    feeDecimals = 8;
    sharePriceWei = 1000000000;
    sharePriceWeiDecimals = 18;

    nativeTokenRaisedTotal = 0;
    sharesSoldTarget = _targetSharesSold;
    sharesSoldMax = _maxSharesSold;

    issuer = _issuingEntity;

    isFundraising = true;
    treasury = _treasury;

    ticketPurchaseFee = _ticketPurchaseFee;
    broker = _broker;

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
    require(sharesPurchased <= checkMaxSharesRemainingForSale(), "Not enough shares remaining to purchase, try a smaller amount");
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
      sharePriceWei
    );
    // emit the InvestmentFundsDispersed event);
    uint256 brokerReceived = msg.value * (ticketPurchaseFee) / (1*10**(8));
    uint256 treasuryReceived = msg.value - brokerReceived;
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
    // sum the cumulative escrow'd amount
    escrowNativeAmount = escrowNativeAmount + treasuryReceived;
    // broker gets their cut
    (bool bsuccess,) = address(broker).call{value: brokerReceived}("");
    require(bsuccess, "Broker could not receive payment");
    // the rest stays in the contract for escrow
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

  /**
  * ------------------ END FUNDRAISING PERIOD ------------------
  *
  *   endFundraising()
  *   cancelFundraising()
  */
  function endFundraisingPeriod () public onlyRole(DAO_ROLE) nonReentrant whenNotPaused {
    require(isFundraising == true, "Fundraising period has already ended");
    require(sharesSoldCount >= sharesSoldTarget, "Fundraising period can only end if the fundraising target has been hit");
    isFundraising = false;
    uint256 finalEscrowedAmount = escrowNativeAmount;
    escrowNativeAmount = 0;
    // emit CompleteFundraiser event
    emit CompleteFundraiser(
      issuer,
      treasury,
      address(this),
      nativeTokenRaisedTotal,
      finalEscrowedAmount,
      sharesSoldCount
    );
    (bool tsuccess,) = address(treasury).call{value: finalEscrowedAmount}("");
    require(tsuccess, "Treasury could not receive payment");
  } 
  function cancelFundraiser() public onlyRole(DAO_ROLE) nonReentrant whenNotPaused{
    require(isFundraising == true, "Fundraising period has already ended");
    isFundraising = false;
    uint256 refundAmount = escrowNativeAmount;
    escrowNativeAmount = 0;
    // log this payout in sum
    nativeTokenDeposited = nativeTokenDeposited + refundAmount;
    // create the deposit receipt
    uint256 depositId = depositIdCounter.current();
    Deposit memory deposit = Deposit ({
      depositId: depositId,
      blockNumber: block.number,
      nativeTokenAmount: refundAmount,
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
      refundAmount,
      address(0),
      0
    );
    depositIdCounter.increment();
    // emit cancel event
    emit CancelFundraiser(
      issuer,
      address(this),
      nativeTokenRaisedTotal,
      refundAmount,
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
    // transfer the native tokens to this LootboxEscrow contract
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
    
    // transfer the erc20 tokens to this LootboxEscrow contract
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
  *  viewProratedDepositsForTicket(ticketId)
  *  viewAllTicketsOfHolder(address)
  */
  // metadata about token. returns only the ticketId. the url is built by frontend & actual data is stored off-chain on GBucket
  function tokenURI(uint256 ticketId)
    public
    pure
    override(ERC721Upgradeable)
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
