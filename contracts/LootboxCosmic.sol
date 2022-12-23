// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "./EIP712Whitelisting.sol";

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

contract LootboxCosmic is
    ERC721,
    ERC721Enumerable,
    Pausable,
    AccessControl,
    ReentrancyGuard,
    EIP712Whitelisting,
    IERC721Receiver
{
    using Counters for Counters.Counter;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    string public constant VARIANT = "Cosmic";
    string public constant SEMVER = "0.7.2-demo";
    uint256 public maxTickets;
    bool public flushed = false;
    string public _tokenURI; // Something like https://storage.googleapis.com/lootbox-data-staging/{lootboxAddress}/{ticketID}.json

    struct Deposit {
        address depositer;
        uint256 depositId;
        uint256 blockNumber;
        uint256 nativeTokenAmount;
        address erc20Token;
        uint256 erc20TokenAmount;
        uint256 timestamp;
        uint256 maxTicketsSnapshot;
    }

    struct DepositMetadata {
        address depositer;
        uint256 ticketId;
        uint256 depositId;
        bool redeemed;
        uint256 nativeTokenAmount;
        address erc20Token;
        uint256 erc20TokenAmount;
        uint256 timestamp;
        uint256 maxTicketsSnapshot;
    }

    Counters.Counter public ticketIdCounter;
    mapping(uint256 => Deposit) public depositReceipts;
    Counters.Counter public depositIdCounter;
    mapping(address => uint256) public erc20Deposited;
    uint256 public nativeTokenDeposited;
    mapping(uint256 => mapping(uint256 => bool)) public depositRedemptions;
    mapping(uint256 => address) public minters;

    uint256 public immutable createdAt;

    event DepositEarnings(
        address indexed depositor,
        address lootbox,
        uint256 depositId,
        uint256 nativeTokenAmount,
        address erc20Token,
        uint256 erc20Amount,
        uint256 maxTicketsSnapshot
    );

    event MintTicket(
        address indexed redeemer,
        address lootbox,
        uint256 nonce,
        uint256 indexed ticketId,
        bytes32 indexed digest
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
    event MaxTicketsChange(
        address indexed changer,
        address lootbox,
        uint256 oldMaxTickets,
        uint256 indexed newMaxTickets
    );

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseTokenURI,
        uint256 _maxTickets,
        address _issuingEntity,
        address _whitelister
    ) ERC721(_name, _symbol) EIP712Whitelisting(_whitelister, "LootboxCosmic") {
        require(bytes(_name).length != 0, "invalid name");
        require(bytes(_symbol).length != 0, "invalid symbol");
        require(bytes(_baseTokenURI).length != 0, "invalid URI");
        require(_issuingEntity != address(0), "invalid issuer");
        require(_whitelister != address(0), "invalid whitelister");
        require(_maxTickets > 0, "invalid maxTickets");

        maxTickets = _maxTickets;
        _tokenURI = _baseTokenURI;
        createdAt = block.timestamp;

        _grantRole(DAO_ROLE, _issuingEntity);
    }

    function getTicketsLeft() internal view returns (uint256 _ticketsLeft) {
        return maxTickets - ticketIdCounter.current();
    }

    function mint(bytes calldata signature, uint256 nonce)
        public
        requiresWhitelist(signature, nonce)
        nonReentrant
        whenNotPaused
        returns (uint256 _ticketId)
    {
        require(getTicketsLeft() > 0, "Sold out");

        // get an ID
        uint256 ticketId = ticketIdCounter.current();
        minters[ticketId] = msg.sender;
        ticketIdCounter.increment();

        // WARN: duplicated in requiresWhitelist
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(MINTER_TYPEHASH, msg.sender, nonce))
            )
        );

        emit MintTicket(msg.sender, address(this), nonce, ticketId, digest);

        _safeMint(msg.sender, ticketId);
        // return the ticket ID & sharesPurchased
        return (ticketId);
    }

    function changeMaxTickets(uint256 targetMaxTickets)
        public
        nonReentrant
        onlyRole(DAO_ROLE)
    {
        require(targetMaxTickets > 0, "Invalid");
        require(targetMaxTickets != maxTickets, "No change");
        if (depositIdCounter.current() > 0) {
            // If deposits have been made, we can only increase maxTickets...
            require(targetMaxTickets > maxTickets, "Cannot decrease");
        }
        // No deposits have been made yet, so we can change maxTickets
        emit MaxTicketsChange(
            msg.sender,
            address(this),
            maxTickets,
            targetMaxTickets
        );

        maxTickets = targetMaxTickets;
    }

    function withdrawEarnings(uint256 ticketId)
        public
        nonReentrant
        whenNotPaused
    {
        _requireMinted(ticketId);
        require(ownerOf(ticketId) == msg.sender, "Unauthorized"); // You do not own this ticket
        require(depositIdCounter.current() > 0, "No deposits"); // No deposits have been made yet

        // uint256 sharesOwned = sharesInTicket[ticketId];
        // loop through all deposits
        for (uint256 i = 0; i < depositIdCounter.current(); i++) {
            Deposit memory deposit = depositReceipts[i];
            if (
                ticketId < deposit.maxTicketsSnapshot &&
                depositRedemptions[ticketId][deposit.depositId] != true
            ) {
                // mark as redeemed
                depositRedemptions[ticketId][deposit.depositId] = true;
                // handle erc20 tokens
                if (deposit.erc20Token != address(0)) {
                    // calculate how much is owed
                    uint256 owedErc20 = deposit.erc20TokenAmount /
                        deposit.maxTicketsSnapshot;
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
                    token.transferFrom(
                        address(this),
                        ownerOf(ticketId),
                        owedErc20
                    );
                } else {
                    // handle native tokens
                    uint256 owedNative = deposit.nativeTokenAmount /
                        deposit.maxTicketsSnapshot;
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
                    (bool success, ) = address(ownerOf(ticketId)).call{
                        value: owedNative
                    }("");
                    require(success, "Not received");
                }
            }
        }
    }

    function viewTotalDepositOfErc20Token(address erc20Token)
        public
        view
        returns (uint256 _totalDeposit)
    {
        uint256 totalDeposit = 0;
        for (uint256 i = 0; i < depositIdCounter.current(); i++) {
            Deposit memory deposit = depositReceipts[i];
            if (deposit.erc20Token == erc20Token) {
                totalDeposit = totalDeposit + deposit.erc20TokenAmount;
            }
        }
        return totalDeposit;
    }

    function viewTotalDepositOfNativeToken()
        public
        view
        returns (uint256 _totalDeposit)
    {
        uint256 totalDeposit = 0;
        for (uint256 i = 0; i < depositIdCounter.current(); i++) {
            Deposit memory deposit = depositReceipts[i];
            if (deposit.erc20Token == address(0)) {
                totalDeposit = totalDeposit + deposit.nativeTokenAmount;
            }
        }
        return totalDeposit;
    }

    function viewAllDeposits()
        public
        view
        returns (Deposit[] memory _deposits)
    {
        _deposits = new Deposit[](depositIdCounter.current());
        for (uint256 i = 0; i < depositIdCounter.current(); i++) {
            _deposits[i] = depositReceipts[i];
        }
        return _deposits;
    }

    // Metadata about token. Path to gbucket file stored off chain
    function tokenURI(uint256 ticketId)
        public
        view
        override(ERC721)
        returns (string memory)
    {
        string memory tokenURIPath = string.concat(
            _tokenURI,
            "/",
            Strings.toString(ticketId),
            ".json"
        );
        return tokenURIPath;
    }

    function viewAllTicketsOfHolder(address holder)
        public
        view
        returns (uint256[] memory _tickets)
    {
        uint256 ownedByHolder = balanceOf(holder);
        uint256[] memory ticketsOwned = new uint256[](ownedByHolder);
        for (uint256 i = 0; i < ownedByHolder; i++) {
            ticketsOwned[i] = tokenOfOwnerByIndex(holder, i);
        }
        return ticketsOwned;
    }

    function viewProratedDepositsForTicket(uint256 ticketId)
        public
        view
        returns (DepositMetadata[] memory _depositsMetadatas)
    {
        uint256 numApplicableDeposits = 0;
        DepositMetadata[]
            memory _depositsMetadatasUnfiltered = new DepositMetadata[](
                depositIdCounter.current()
            );
        int256[] memory applicableDepositIds = new int256[](
            depositIdCounter.current()
        ); // will be -1 when not applicable to ticket
        for (uint256 i = 0; i < depositIdCounter.current(); i++) {
            if (ticketId < depositReceipts[i].maxTicketsSnapshot) {
                // Since maxTickets is variable, it means that some tickets
                // (if ticketId > deposit.maxTickets) will not be elegible for
                // the return.
                applicableDepositIds[i] = int256(i);
                numApplicableDeposits++;
                uint256 owedNative = depositReceipts[i].nativeTokenAmount /
                    depositReceipts[i].maxTicketsSnapshot;
                uint256 owedErc20 = depositReceipts[i].erc20TokenAmount /
                    depositReceipts[i].maxTicketsSnapshot;
                DepositMetadata memory depositMetadata = DepositMetadata({
                    depositer: depositReceipts[i].depositer,
                    ticketId: ticketId,
                    depositId: depositReceipts[i].depositId,
                    redeemed: depositRedemptions[ticketId][
                        depositReceipts[i].depositId
                    ],
                    nativeTokenAmount: owedNative,
                    erc20Token: depositReceipts[i].erc20Token,
                    erc20TokenAmount: owedErc20,
                    timestamp: depositReceipts[i].timestamp,
                    maxTicketsSnapshot: depositReceipts[i].maxTicketsSnapshot
                });
                _depositsMetadatasUnfiltered[i] = depositMetadata;
            } else {
                applicableDepositIds[i] = -1;
            }
        }

        _depositsMetadatas = new DepositMetadata[](numApplicableDeposits);
        uint256 idxCounter = 0;
        for (uint256 i = 0; i < depositIdCounter.current(); i++) {
            if (applicableDepositIds[i] >= 0) {
                _depositsMetadatas[idxCounter] = _depositsMetadatasUnfiltered[
                    uint256(applicableDepositIds[i])
                ];
                idxCounter++;
            }
        }

        return _depositsMetadatas;
    }

    function viewDeposit(uint256 depositId)
        public
        view
        returns (Deposit memory _deposit)
    {
        return depositReceipts[depositId];
    }

    // Note: functions using this MUST be wrapped with the `nonReentrant` modifier because it uses risky `.call`
    function _depositNative(address from, uint256 amount) private {
        require(amount > 0, "Must be greater than zero");
        // log this payout in sum
        nativeTokenDeposited = nativeTokenDeposited + amount;
        // create the deposit receipt
        uint256 depositId = depositIdCounter.current();
        Deposit memory deposit = Deposit({
            depositer: from,
            depositId: depositId,
            blockNumber: block.number,
            nativeTokenAmount: amount,
            erc20Token: address(0),
            erc20TokenAmount: 0,
            timestamp: block.timestamp,
            maxTicketsSnapshot: maxTickets
        });
        // save deposit receipt to mapping, increment ID
        depositReceipts[depositId] = deposit;
        // emit the DepositEarnings event
        emit DepositEarnings(
            from,
            address(this),
            depositId,
            amount,
            address(0),
            0,
            maxTickets
        );
        depositIdCounter.increment();
        // transfer the native tokens to this LootboxEscrow contract
        (bool success, ) = address(this).call{value: amount}("");
        require(success, "Not received");
    }

    // Note: functions using this MUST be wrapped with the `nonReentrant` modifier
    function _depositErc20(
        address from,
        address erc20Token,
        uint256 erc20Amount
    ) private {
        require(msg.value == 0, "Cannot include native balance");
        require(erc20Amount > 0, "Must be greater than zero");
        erc20Deposited[erc20Token] = erc20Deposited[erc20Token] + erc20Amount;
        // create the deposit receipt
        uint256 depositId = depositIdCounter.current();
        Deposit memory deposit = Deposit({
            depositer: from,
            depositId: depositId,
            blockNumber: block.number,
            nativeTokenAmount: 0,
            erc20Token: erc20Token,
            erc20TokenAmount: erc20Amount,
            timestamp: block.timestamp,
            maxTicketsSnapshot: maxTickets
        });
        // save deposit receipt to mapping, increment ID
        depositReceipts[depositId] = deposit;
        // emit the DepositEarnings event
        emit DepositEarnings(
            from,
            address(this),
            depositId,
            0,
            erc20Token,
            erc20Amount,
            maxTickets
        );
        depositIdCounter.increment();

        // transfer the erc20 tokens to this LootboxEscrow contract
        IERC20 token = IERC20(erc20Token);
        token.approve(address(this), erc20Amount);
        token.transferFrom(from, address(this), erc20Amount);
    }

    function depositEarningsErc20(address erc20Token, uint256 erc20Amount)
        public
        payable
        nonReentrant
        whenNotPaused
    {
        _depositErc20(msg.sender, erc20Token, erc20Amount);
    }

    function depositEarningsNative() public payable nonReentrant whenNotPaused {
        _depositNative(msg.sender, msg.value);
    }

    // flush tokens to a specified address in case of abandoned lootbox with cash inside
    function flushTokens(address target)
        public
        onlyRole(DAO_ROLE)
        nonReentrant
        whenNotPaused
    {
        for (uint256 i = 0; i < depositIdCounter.current(); i++) {
            // handle erc20 tokens
            if (depositReceipts[i].erc20Token != address(0)) {
                IERC20 token = IERC20(depositReceipts[i].erc20Token);
                token.transferFrom(
                    address(this),
                    target,
                    token.balanceOf(address(this))
                );
                // commented out because we dont want to edit past history (should be immutable)
                // however note that after a flush, the deposit history will still show redeemable funds even though they dont exist
                // also, flushes can happen multiple times so its still possible to deposit rewards and redeem them

                // depositReceipts[i].erc20TokenAmount = 0;
            } else {
                // handle native tokens
                (bool success, ) = address(target).call{
                    value: address(this).balance
                }("");
                // depositReceipts[i].nativeTokenAmount = 0;
                require(success, "Not received");
            }
        }
        flushed = true;
    }

    // The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // disable burns
    function _burn(uint256 tokenId) internal pure override(ERC721) {}

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

    // Always returns `IERC721Receiver.onERC721Received.selector`.
    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
