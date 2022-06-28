// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./PartyBasket.sol";

contract PartyBasketFactory is Pausable, AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    address private immutable whitelister;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    EnumerableSet.AddressSet private PartyBaskets;

    event PartyBasketCreated(address indexed partyBasket, address indexed issuer, string name, address lootboxAddress);

    constructor(address dao, address _whitelister) {
        require(dao != address(0), "DAO address cannot be the zero address");
        require(_whitelister != address(0), "Whitelister address cannot be the zero address");
        _grantRole(DAO_ROLE, dao);
        whitelister = _whitelister;
    }

    function createPartyBasket (string memory _name, address _lootboxAddress, address admin) public whenNotPaused returns (address partyBasket) {
        PartyBasket newPartyBasket = new PartyBasket(_name, _lootboxAddress, admin, whitelister);
        address newPartyBasketAddress = address(newPartyBasket);
        PartyBaskets.add(newPartyBasketAddress);

        emit PartyBasketCreated(
            newPartyBasketAddress,
            msg.sender,
            _name,
            _lootboxAddress
        );

        return newPartyBasketAddress;
    }

    function viewPartyBaskets() public view returns (bytes32[] memory) {
        return PartyBaskets._inner._values;
    }

    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }
    function unpause() public onlyRole(DAO_ROLE) {
      _unpause();
    }

}