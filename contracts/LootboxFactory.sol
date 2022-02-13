// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./Lootbox.sol";


contract LootboxFactory is Pausable, AccessControl {

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE"); // Lootbox Ltd
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE"); // GuildFX devs

    address public immutable nativeTokenPriceFeed;
    uint256 internal immutable ticketPurchaseFee;
    address internal immutable brokerAddress;

    // affiliate => ticketAffiliateFee
    mapping(address => uint256) internal affiliateFees;

    // Points to the Lootboxes deployed by this factory
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet private LOOTBOXES;

    event LootboxCreated(
      string lootboxName,
      address indexed lootbox,
      address indexed issuer,
      address indexed treasury,
      uint256 maxSharesSold,
      uint256 sharePriceUSD
    );

    event AffiliateReceipt(
      address indexed lootbox,
      address indexed affiliate,
      uint256 affiliateFee,
      uint256 ticketPurchaseFee,
      address lootboxIssuer,
      address lootboxTreasury
    );

    constructor(
      address _daoLootbox,
      address _nativeTokenPriceFeed,
      uint256 _ticketPurchaseFee,
      address _brokerAddress
    ) {
        require(_daoLootbox != address(0), "DAO Lootbox address cannot be zero");
        require(_nativeTokenPriceFeed != address(0), "nativeTokenPriceFeed address cannot be zero");
        require(_ticketPurchaseFee < 100000000, "Purchase ticket fee must be less than 100000000 (100%)");
        

        _grantRole(DAO_ROLE, _daoLootbox);

        nativeTokenPriceFeed = _nativeTokenPriceFeed;
        ticketPurchaseFee = _ticketPurchaseFee;
        brokerAddress = _brokerAddress;
       
    }

    function addAffiliate (address affiliate, uint256 ticketAffiliateFee) public onlyRole(DAO_ROLE) {
      require(ticketAffiliateFee <= ticketPurchaseFee , "Affiliate ticket fee must be less than or equal to purchase ticket fee");
      affiliateFees[affiliate] = ticketAffiliateFee;
    }

    function createLootbox(
        string memory _lootboxName,
        string memory _lootboxSymbol,
        address _issuingEntity,
        uint256 _maxSharesSold,
        uint256 _sharePriceUSD,
        address _treasury,
        address _affiliate
    ) public whenNotPaused returns (address _lootbox) {
        require(bytes(_lootboxName).length != 0, "Lootbox name cannot be empty");
        require(bytes(_lootboxSymbol).length != 0, "Lootbox symbol cannot be empty");
        require(_issuingEntity != address(0), "Issuer address cannot be zero");
        require(_maxSharesSold > 0, "Max shares sold must be greater than zero");
        require(_sharePriceUSD > 0, "Share price must be greater than zero");
 
        Lootbox lootbox = new Lootbox(
          _lootboxName,
          _lootboxSymbol,
          _maxSharesSold,
          _sharePriceUSD,
          _treasury,
          msg.sender,
          nativeTokenPriceFeed,
          ticketPurchaseFee,
          affiliateFees[_affiliate],
          brokerAddress,
          _affiliate
        );
        LOOTBOXES.add(address(lootbox));
        emit LootboxCreated(
            _lootboxName,
            address(lootbox),
            msg.sender,
            _treasury,
            _maxSharesSold,
            _sharePriceUSD
        );
        emit AffiliateReceipt(
            address(lootbox),
            _affiliate,
            affiliateFees[_affiliate],
            ticketPurchaseFee,
            msg.sender,
            _treasury
        );
        return address(lootbox);
    }

    function viewLootboxes() public view returns (bytes32[] memory) {
        // TODO investigate memory usage if LOOTBOXES can be huge
        return LOOTBOXES._inner._values;
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }
}
