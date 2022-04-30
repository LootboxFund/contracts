// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./LootboxInstant.sol";

contract LootboxInstantFactory is Pausable, AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;
    string public semver;

    address public immutable lootboxImplementation;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE"); // Lootbox Ltd

    string public baseTokenURI;
    uint256 public immutable ticketPurchaseFee;
    address public immutable brokerAddress;

    // Points to the Lootboxes deployed by this factory
    EnumerableSet.AddressSet private LOOTBOXES;

    event LootboxCreated(
        string lootboxName,
        address indexed lootbox,
        address indexed issuer,
        address indexed treasury,
        uint256 targetSharesSold,
        uint256 maxSharesSold,
        string _data
    );

    constructor(
        address _lootboxDao,
        uint256 _ticketPurchaseFee,
        address _brokerAddress,
        string memory _baseTokenURI
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
        require(
            bytes(_baseTokenURI).length != 0,
            "Base token URI cannot be empty"
        );

        lootboxImplementation = address(new LootboxInstant());

        _grantRole(DAO_ROLE, _lootboxDao);

        ticketPurchaseFee = _ticketPurchaseFee;
        brokerAddress = _brokerAddress;

        baseTokenURI = _baseTokenURI;

        semver = "0.4.0-prod";
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
                baseTokenURI,
                _targetSharesSold,
                _maxSharesSold, // uint256 _maxSharesSold,
                _treasury, // address _treasury,
                msg.sender, // address _issuingEntity,
                ticketPurchaseFee, // uint256 _ticketPurchaseFee,
                brokerAddress // address _broker,
            )
        );

        LOOTBOXES.add(address(proxy));

        emit LootboxCreated(
            _lootboxName,
            address(proxy),
            msg.sender,
            _treasury,
            _targetSharesSold,
            _maxSharesSold,
            _data
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
