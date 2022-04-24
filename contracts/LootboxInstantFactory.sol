// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./LootboxInstant.sol";

contract LootboxInstantFactory is Pausable, AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    address public immutable lootboxImplementation;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE"); // Lootbox Ltd

    uint256 public immutable ticketPurchaseFee;
    address public immutable brokerAddress;

    // affiliate => ticketAffiliateFee
    mapping(address => uint256) internal affiliateFees;
    // lootbox => affiliate
    mapping(address => address) internal lootboxAffiliates;
    EnumerableSet.AddressSet private AFFILIATES;

    // Points to the Lootboxes deployed by this factory
    EnumerableSet.AddressSet private LOOTBOXES;

    event AffiliateWhitelisted(
        address indexed affiliate,
        address indexed whitelistedBy,
        uint256 ticketAffiliateFee,
        uint256 timestamp
    );

    event LootboxCreated(
        string lootboxName,
        address indexed lootbox,
        address indexed issuer,
        address indexed treasury,
        uint256 maxSharesSold,
        string _data
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
        address _lootboxDao,
        uint256 _ticketPurchaseFee,
        address _brokerAddress
    ) {
        require(
            _lootboxDao != address(0),
            "DAO Lootbox address cannot be zero"
        );
        require(_brokerAddress != address(0), "Broker address cannot be zero");
        require(
            _ticketPurchaseFee < 100000000,
            "Purchase ticket fee must be less than 100000000 (100%)"
        );

        lootboxImplementation = address(new LootboxInstant());

        _grantRole(DAO_ROLE, _lootboxDao);

        ticketPurchaseFee = _ticketPurchaseFee;
        brokerAddress = _brokerAddress;
    }

    function addAffiliate(address affiliate, uint256 ticketAffiliateFee)
        public
        onlyRole(DAO_ROLE)
    {
        require(
            ticketAffiliateFee <= ticketPurchaseFee,
            "Affiliate ticket fee must be less than or equal to purchase ticket fee"
        );
        affiliateFees[affiliate] = ticketAffiliateFee;
        AFFILIATES.add(affiliate);
        emit AffiliateWhitelisted(
            affiliate,
            msg.sender,
            ticketAffiliateFee,
            block.timestamp
        );
    }

    function listAffiliates()
        public
        view
        onlyRole(DAO_ROLE)
        returns (bytes32[] memory _affiliates)
    {
        return AFFILIATES._inner._values;
    }

    function checkLootboxAffiliate(address lootbox)
        public
        view
        onlyRole(DAO_ROLE)
        returns (address)
    {
        return lootboxAffiliates[lootbox];
    }

    // function checkFactoryPrivateDetails() public view onlyRole(DAO_ROLE) returns (address _brokerAddress, uint256 _ticketPurchaseFee) {
    //   return (brokerAddress, ticketPurchaseFee);
    // }

    function createLootbox(
        string memory _lootboxName,
        string memory _lootboxSymbol,
        uint256 _targetSharesSold,
        uint256 _maxSharesSold,
        address _treasury,
        address _affiliate,
        string memory _data
    ) public whenNotPaused returns (address _lootbox) {
        require(
            bytes(_lootboxName).length != 0,
            "Lootbox name cannot be empty"
        );
        require(
            bytes(_lootboxSymbol).length != 0,
            "Lootbox symbol cannot be empty"
        );
        require(_treasury != address(0), "Treasury address cannot be zero");
        require(_affiliate != address(0), "Affiliate address cannot be zero");
        require(
            _targetSharesSold > 0,
            "Target shares sold must be greater than zero"
        );
        require(
            _maxSharesSold > 0,
            "Max shares sold must be greater than zero"
        );
        require(
            _maxSharesSold >= _targetSharesSold,
            "Max shares sold must be greater than or equal to target shares sold"
        );

        // See how to deploy upgradeable token here https://forum.openzeppelin.com/t/deploying-upgradeable-proxies-and-proxy-admin-from-factory-contract/12132/3
        ERC1967Proxy proxy = new ERC1967Proxy(
            lootboxImplementation,
            abi.encodeWithSelector(
                LootboxInstant(payable(address(0))).initialize.selector,
                _lootboxName, // string memory _name,
                _lootboxSymbol, // string memory _symbol,
                _targetSharesSold,
                _maxSharesSold, // uint256 _maxSharesSold,
                _treasury, // address _treasury,
                msg.sender, // address _issuingEntity,
                ticketPurchaseFee, // uint256 _ticketPurchaseFee,
                affiliateFees[_affiliate], // uint256 _ticketAffiliateFee,
                brokerAddress, // address _broker,
                _affiliate // address _affiliate
            )
        );
        LOOTBOXES.add(address(proxy));
        lootboxAffiliates[address(proxy)] = _affiliate;

        emit LootboxCreated(
            _lootboxName,
            address(proxy),
            msg.sender,
            _treasury,
            _maxSharesSold,
            _data
        );
        emit AffiliateReceipt(
            address(proxy),
            _affiliate,
            affiliateFees[_affiliate],
            ticketPurchaseFee,
            msg.sender,
            _treasury
        );
        return address(proxy);
    }

    function viewLootboxes() public view returns (bytes32[] memory) {
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
