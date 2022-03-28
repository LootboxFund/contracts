// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./LootboxEscrowFactory.sol";

contract TournamentFactory is Pausable, AccessControl {

    using EnumerableSet for EnumerableSet.AddressSet;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE"); // Lootbox Ltd

    address public immutable lootboxDao;
    address public immutable nativeTokenPriceFeed;
    uint256 public immutable ticketPurchaseFee;
    address public immutable brokerAddress;

    // Points to the Tournaments deployed by this factory
    EnumerableSet.AddressSet private TOURNAMENTS;

    // Track all the tournaments created
    LootboxEscrowFactory[] public _tournaments;

    event TournamentCreated(
      string tournamentName,
      address indexed tournamentFactory,
      address indexed issuer,
      address indexed treasury,
      address lootboxDao
    );

    constructor(
      address _lootboxDao,
      address _nativeTokenPriceFeed,
      uint256 _ticketPurchaseFee,
      address _brokerAddress
    ) {
        require(_lootboxDao != address(0), "DAO Lootbox address cannot be zero");
        require(_brokerAddress != address(0), "Broker address cannot be zero");
        require(_nativeTokenPriceFeed != address(0), "nativeTokenPriceFeed address cannot be zero");
        require(_ticketPurchaseFee < 100000000, "Purchase ticket fee must be less than 100000000 (100%)");

        _grantRole(DAO_ROLE, _lootboxDao);
        lootboxDao = _lootboxDao;
        nativeTokenPriceFeed = _nativeTokenPriceFeed;
        ticketPurchaseFee = _ticketPurchaseFee;
        brokerAddress = _brokerAddress;
    }

    function createTournament(
        string memory _tournamentName,
        address _tournamentTreasury
    ) public whenNotPaused returns (address _lootbox) {
        require(bytes(_tournamentName).length != 0, "Tournament name cannot be empty");
        require(_tournamentTreasury != address(0), "Treasury address cannot be zero");

        LootboxEscrowFactory tournament = new LootboxEscrowFactory(
          lootboxDao,
          nativeTokenPriceFeed,
          ticketPurchaseFee,
          brokerAddress,
          _tournamentTreasury
        );
        _tournaments.push(tournament);
        TOURNAMENTS.add(address(tournament));

        emit TournamentCreated(
          _tournamentName,
          address(tournament),
          msg.sender,
          _tournamentTreasury,
          lootboxDao
        );
        return address(tournament);
    }

    function viewTournaments() public view returns (bytes32[] memory) {
        return TOURNAMENTS._inner._values;
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }
}
