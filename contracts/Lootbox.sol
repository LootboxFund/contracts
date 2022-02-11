// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;


import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";


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

contract Lootbox is ERC721, ERC721Enumerable, ERC721URIStorage, Pausable, AccessControl {
  using Counters for Counters.Counter;
  using EnumerableSet for EnumerableSet.AddressSet;

  bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
  bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

  uint256 public deploymentStartTime;

  AggregatorV3Interface internal nativeTokenPriceFeed;

  uint256 public sharePriceUSD; // THIS SHOULD NOT BE MODIFIED (8 decimals)
  uint256 public sharesSoldGoal;
  uint256 public sharesSoldCount;
  uint256 public nativeTokenRaisedTotal;
  EnumerableSet.AddressSet private purchasers;

  mapping(uint256 => uint256) public sharesInTicket;
  Counters.Counter public ticketIdCounter;

  bool public isFundraising;
  address public treasury;

  struct Deposit {
    uint256 depositId;
    uint256 blockNumber;
    uint256 nativeTokenAmount;
    address erc20Token;
    uint256 erc20TokenAmount;
  }
  mapping(uint256 => Deposit) public depositReciepts;
  Counters.Counter public depositIdCounter;

  mapping(address => uint256) public erc20Deposited;
  EnumerableSet.AddressSet private erc20TokensDeposited;
  uint256 public nativeTokenDeposited;

  mapping(uint256 => mapping(uint256 => bool)) public depositRedemptions;

  event MintTicket(
    address indexed purchaser,
    address indexed treasury,
    address lootbox,
    uint256 ticketId,
    uint256 sharesPurchased,
    uint256 sharePriceUSD
  );

  event DepositEarnings(
    address indexed depositor,
    address lootbox,
    uint256 nativeTokenAmount,
    address erc20Token,
    uint256 erc20Amount
  );

  event WithdrawEarnings(
    address indexed withdrawer,
    address lootbox,
    uint256 ticketId,
    uint256 nativeTokenAmount,
    address erc20Token,
    uint256 erc20Amount
  );

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _sharesSoldGoal,
    uint256 _sharePriceUSD,
    address _treasury,
    address _issuingEntity,
    address _nativeTokenPriceFeed
  ) ERC721(_name, _symbol) {
    // solhint-disable-next-line not-rely-on-time
    deploymentStartTime = block.timestamp;
    nativeTokenRaisedTotal = 0;

    sharePriceUSD = _sharePriceUSD;
    sharesSoldGoal = _sharesSoldGoal;

    nativeTokenPriceFeed = AggregatorV3Interface(_nativeTokenPriceFeed);

    isFundraising = true;
    treasury = _treasury;

    _grantRole(DAO_ROLE, _issuingEntity);
  }

  // only accepts native token
  function purchaseTicket () public payable returns (uint256 _ticketId) {
    require(isFundraising == true, "Tickets cannot be purchased after the fundraising period");
    // get an ID
    uint256 ticketId = ticketIdCounter.current();
    ticketIdCounter.increment();
    // calculate how many shares to buy based on msg.value
    uint256 sharesPurchased = calculateSharesPurchase();
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
    // collect the payment and send to treasury (should be a multisig)
    payable(treasury).transfer(msg.value);
    // mint the NFT ticket
    _safeMint(msg.sender, ticketId);
    // return the ticket ID
    return ticketId;
  }

  // internal implementation function to handle conversion of msg.value to shares
  function calculateSharesPurchase () internal returns (uint256 _sharesPurchased) {
    // get price feed of native token
    (
      uint80 roundID,
      int256 price,
      uint256 startedAt,
      uint256 timeStamp,
      uint80 answeredInRound
    ) = nativeTokenPriceFeed.latestRoundData();
    // If the round is not complete yet, timestamp is 0
    require(timeStamp > 0, "Round not complete");
    uint256 sharesPurchased = getSharePurchaseAmount(
      msg.value,
      18,
      uint256(price)
    );
    return sharesPurchased;
  }

  // internal helper function that converts stablecoin amount to guild token amount
  function getSharePurchaseAmount(
      uint256 amountOfStableCoin,
      uint256 stablecoinDecimals,
      uint256 stableCoinPrice
  ) internal view returns (uint256 guildTokenAmount) {
      uint256 ticketDecimals = 18;
      return
          (amountOfStableCoin *
              stableCoinPrice *
              10**(ticketDecimals - stablecoinDecimals)) /
          sharePriceUSD;
  }

  // external function to estimate how much guild tokens a user will receive
  function estimateSharesPurchase (uint256 amount) public view returns (uint256) {
    // get price feed of native token
    (
      uint80 roundID,
      int256 price,
      uint256 startedAt,
      uint256 timeStamp,
      uint80 answeredInRound
    ) = nativeTokenPriceFeed.latestRoundData();
    // If the round is not complete yet, timestamp is 0
    require(timeStamp > 0, "Round not complete");
    uint256 sharesPurchased = getSharePurchaseAmount(
      amount,
      18,
      uint256(price)
    );
    return sharesPurchased;
  }

  function endFundraisingPeriod () public onlyRole(DAO_ROLE) {
    require(isFundraising == true, "Fundraising period has already ended");
    isFundraising = false;
  }

  function depositEarningsErc20 (address erc20Token, uint256 erc20Amount) public payable {
    require(isFundraising == false, "Deposits cannot be made during fundraising period");
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
      erc20TokenAmount: erc20Amount
    });
    // save deposit receipt to mapping, increment ID
    depositReciepts[block.number] = deposit;
    depositIdCounter.increment();
    // emit the DepositEarnings event
    emit DepositEarnings(
      msg.sender,
      address(this),
      0,
      erc20Token,
      erc20Amount
    );
    
    // transfer the erc20 tokens to this Lootbox contract
    IERC20 token = IERC20(erc20Token);
    token.approve(address(this), erc20Amount);
    token.transferFrom(msg.sender, address(this), erc20Amount);
  }

  function depositEarningsNative () public payable {
    require(isFundraising == false, "Deposits cannot be made during fundraising period");
    // log this payout in sum
    nativeTokenDeposited = nativeTokenDeposited + msg.value;
    // create the deposit receipt
    uint256 depositId = depositIdCounter.current();
    Deposit memory deposit = Deposit ({
      depositId: depositId,
      blockNumber: block.number,
      nativeTokenAmount: msg.value,
      erc20Token: address(0),
      erc20TokenAmount: 0
    });
    // save deposit receipt to mapping, increment ID
    depositReciepts[block.number] = deposit;
    depositIdCounter.increment();
    // emit the DepositEarnings event
    emit DepositEarnings(
      msg.sender,
      address(this),
      msg.value,
      address(0),
      0
    );
    // transfer the native tokens to this Lootbox contract
    address payable lootbox = payable(address(this));
    lootbox.transfer(msg.value);
  }

  function withdrawEarnings (uint256 ticketId) public {
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
            0,
            deposit.erc20Token,
            owedErc20
          );
          // transfer the erc20 tokens to the sender
          IERC20 token = IERC20(deposit.erc20Token);
          token.transferFrom(address(this), ownerOf(ticketId), owedErc20);
        } else {
          // handle native tokens
          uint256 owedNative = deposit.nativeTokenAmount * sharesSoldCount / sharesOwned;
          // emit the WithdrawEarnings event
          emit WithdrawEarnings(
            msg.sender,
            address(this),
            ticketId,
            owedNative,
            address(0),
            0
          );
          payable(ownerOf(ticketId)).transfer(owedNative);
        }
      }
    }
  }

  function viewTicketInfo(uint256 ticketId) public view returns (uint256 _sharesOwned, uint256 _percentageOwned, uint256 _sharePriceUSD) {
    uint256 sharesOwned = sharesInTicket[ticketId];
    uint256 percentageOwned = sharesOwned * 1*(10**8) / sharesSoldCount;
    return (
      sharesOwned,
      percentageOwned,
      sharePriceUSD
    );
  }

  function viewOwedOfErc20Token (uint256 ticketId, address erc20Token) public returns (uint256 _owed) {
    // TODO: implement
    // returns the total of this erc20 that is owed to the ticket
    // frontend should use this in conjunction with viewDepositedTokens()
  }

  function viewOwedOfNativeToken (uint256 ticketId) public returns (uint256 _owed) {
    // TODO: implement
    // returns the total amount of native tokens that is owed to the ticket
  }

  function viewDepositedTokens() public view returns (bytes32[] memory) {
    return erc20TokensDeposited._inner._values;
  }

  function viewPurchasers() public view returns (bytes32[] memory) {
    return purchasers._inner._values;
  }

  function viewAllTicketsOfHolder(address holder) public view returns (uint256[] memory _tickets) {
    uint256 ownedByHolder = balanceOf(holder);
    uint256[] memory tokensOwned = new uint256[](ownedByHolder);
    for(uint256 i=0; i < ownedByHolder; i++){
      tokensOwned[i] = (tokenOfOwnerByIndex(holder, i));
    }
    return tokensOwned;
  }

  function sweepAllDeposits () public {
    // TODO: implement
    // this should send all deposits to their holders
  }

  // The following functions are overrides required by Solidity.
  function _beforeTokenTransfer(address from, address to, uint256 tokenId)
    internal
    whenNotPaused
    override(ERC721, ERC721Enumerable)
  {
    super._beforeTokenTransfer(from, to, tokenId);
  }

  function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
    super._burn(tokenId);
  }

  function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal override(ERC721URIStorage) {
    super._setTokenURI(tokenId, _tokenURI);
  }

  function tokenURI(uint256 tokenId)
    public
    view
    override(ERC721, ERC721URIStorage)
    returns (string memory)
  {
    return super.tokenURI(tokenId);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, ERC721Enumerable, AccessControl)
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

  receive() external payable {}
}
