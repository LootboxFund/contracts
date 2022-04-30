// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./BadgeBCS.sol";


contract BadgeFactoryBCS is Pausable, AccessControl {

    using EnumerableSet for EnumerableSet.AddressSet;
    address public immutable badgeImplementation;
    address public paymentToken;
    string public semver;
    address public developer;
    string public baseTokenURI;

    bytes32 public constant DEV_ROLE = keccak256("DEV_ROLE"); // Lootbox Ltd

    // Points to the Badges deployed by this factory
    EnumerableSet.AddressSet private BADGES;

    event BadgeCreated(
      string badgeName,
      address indexed badge,
      address indexed issuer,
      string _data
    );
 
    constructor(
      address _developer,
      // address _paymentToken,
      string memory _baseTokenURI
    ) {
      // require(_paymentToken != address(0), "Payment token cannot be zero address");
      require(bytes(_baseTokenURI).length != 0, "Base token URI cannot be empty");

      // paymentToken = _paymentToken;
      semver = "0.0.1";

      _grantRole(DEV_ROLE, _developer);
      developer = _developer;

      badgeImplementation = address(new BadgeBCS());
      baseTokenURI = _baseTokenURI;
    }
    
    function createBadge(
        string memory _guildName,
        string memory _guildSymbol,
        string memory _logoImageUrl,
        string memory _data
    ) public whenNotPaused returns (address _lootbox) {
        require(bytes(_guildName).length != 0, "Guild name cannot be empty");
        require(bytes(_guildSymbol).length != 0, "Guild symbol cannot be empty");

        // IERC20 token = IERC20(paymentToken);

        // require(token.balanceOf(msg.sender) >= 200000000000000000000, "Must have at least 200 GUILD tokens to create a badge");

        // See how to deploy upgradeable token here https://forum.openzeppelin.com/t/deploying-upgradeable-proxies-and-proxy-admin-from-factory-contract/12132/3
        ERC1967Proxy proxy = new ERC1967Proxy(
            badgeImplementation,
            abi.encodeWithSelector(
              BadgeBCS(payable(address(0))).initialize.selector,
              _guildName,
              _guildSymbol,
              _logoImageUrl,
              developer,
              baseTokenURI
            )
        );
        BADGES.add(address(proxy));
        emit BadgeCreated(
          _guildName,
          address(proxy),
          msg.sender,
          _data
        );
        return address(proxy);
    }

    function viewBadges() public view returns (bytes32[] memory) {
        return BADGES._inner._values;
    }

    // --------- Managing the Token ---------
    function pause() public onlyRole(DEV_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(DEV_ROLE) {
        _unpause();
    }
}
