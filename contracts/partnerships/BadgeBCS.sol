// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
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
contract BadgeBCS is Initializable, ERC721Upgradeable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
  using CountersUpgradeable for CountersUpgradeable.Counter;

  string public semver;

  /** ------------------ SETUP & AUTH ------------------
   * 
   */
  // roles
  bytes32 public constant DEV_ROLE = keccak256("DEV_ROLE");
  uint256 public deploymentStartTime;
  string public logoImageUrl;
  CountersUpgradeable.Counter public mintedCount;

  mapping(address => bool) public whoMintedMapping;
  event MintBadge(
    address indexed purchaser,
    uint256 ticketId
  );

  /** ------------------ CONSTRUCTOR ------------------
   * 
   */
   /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() initializer {}
  function initialize(
    string memory _name,
    string memory _symbol,
    string memory _logoImageUrl,
    address _developer
  ) initializer public {
    
    bytes memory tempEmptyNameTest = bytes(_name);
    bytes memory tempEmptySymbolTest = bytes(_symbol);
    bytes memory tempEmptyLogoTest = bytes(_logoImageUrl);

    require(tempEmptyNameTest.length != 0, "Name cannot be empty");
    require(tempEmptySymbolTest.length != 0, "Symbol cannot be empty");
    require(tempEmptyLogoTest.length != 0, "Logo URL cannot be empty");
    require(_developer != address(0), "Developer cannot be zero address");

    __ERC721_init(_name, _symbol);
    __Pausable_init();
    __AccessControl_init();
    __UUPSUpgradeable_init();

    // solhint-disable-next-line not-rely-on-time
    deploymentStartTime = block.timestamp;
    semver = "0.0.1";
    logoImageUrl = _logoImageUrl;

    _grantRole(DEV_ROLE, _developer);
  }

  // mint badge
  function mintBadge () public payable nonReentrant whenNotPaused returns (uint256 _badgeId) {
    require(whoMintedMapping[msg.sender] != true, "Each address can only mint a badge once.");
    uint256 badgeId = mintedCount.current();
    mintedCount.increment();
    // mint the NFT ticket
    _safeMint(msg.sender, badgeId);
    return (badgeId);
  }

  // metadata about token. returns only the ticketId. the url is built by frontend & actual data is stored off-chain on GBucket
  function tokenURI(uint256 ticketId)
    public
    pure
    override(ERC721Upgradeable)
    returns (string memory)
  {
    return uint2str(ticketId);
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
    override(ERC721Upgradeable)
  {
    super._beforeTokenTransfer(from, to, tokenId);
  }
  // disable burns
  function _burn(uint256 tokenId) internal pure override(ERC721Upgradeable) {}
  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721Upgradeable, AccessControlUpgradeable)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
  // --------- Managing the Token ---------
  function pause() public onlyRole(DEV_ROLE) {
    _pause();
  }
  function unpause() public onlyRole(DEV_ROLE) {
      _unpause();
  }
  function _authorizeUpgrade(address newImplementation)
      internal
      onlyRole(DEV_ROLE)
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
