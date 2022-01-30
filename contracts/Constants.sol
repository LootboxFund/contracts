// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Constants is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // only the DAO (GuildFX) can control token
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // Fee GuildFX charges on mintRequests as a fraction (3 decimals).
    // Examples: 1000 = 100%, 500 = 50%, 20 = 2%, 1 = 0.1% fees
    uint256 public GUILD_FX_MINTING_FEE;
    uint8 public constant GUILD_FX_MINTING_FEE_DECIMALS = 3;
    address payable public TREASURY; // GuildFX treasury

    // Addresses for crowdsale stable coins
    address public ETH_ADDRESS;
    address public USDC_ADDRESS;
    address public USDT_ADDRESS;
    // Addresses for crowdsale price feed
    address public BNB_PRICE_FEED;
    address public ETH_PRICE_FEED;
    address public USDC_PRICE_FEED;
    address public USDT_PRICE_FEED;

    // ------------------------------------------------------------------
    // Insert any new state variables below here when upgrading
    // If you change any lines above when upgrading, you will fuck up shit
    // https://docs.openzeppelin.com/learn/upgrading-smart-contracts
    // ------------------------------------------------------------------

    // ------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // ERC1967 UUPS Upgradeable
    function initialize(
        address dao,
        address developer,
        address payable _treasury
    ) public initializer {
        require(dao != address(0), "DAO cannot be zero");
        require(developer != address(0), "Developer cannot be zero");
        require(_treasury != address(0), "Treasury cannot be zero");

        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DAO_ROLE, dao);
        _grantRole(DEVELOPER_ROLE, developer);
        _setRoleAdmin(DAO_ROLE, DAO_ROLE); // Changes the DAO_ROLE's admin role to itself, so that DAOs can assign new DAOs

        TREASURY = _treasury;

        GUILD_FX_MINTING_FEE = 20; // in GUILD_FX_MINTING_FEE_DECIMALS (ex: 20 = 2% fee)
    }

    /**
     * WARNING: This function will revoke the DAO_ROLE from the caller if granting the DAO_ROLE.
     *          Please see overide in .grantRole() for more details
     */
    function transferGuildFXDAOAdminPrivileges(address account)
        public
        onlyRole(DAO_ROLE)
    {
        grantRole(DAO_ROLE, account);
    }

    /**
     * Only addresses with the DEFAULT_ADMIN_ROLE or the DAO_ROLE (which is it's own admin) can call this.
     * In practice, only the DAO_ROLE will be able to call this becau se no-one has the DEFAULT_ADMIN_ROLE.
     * WARNING: This function will revoke the DAO_ROLE from the caller if granting the DAO_ROLE.
     *          This is to ensure that only one DAO_ROLE (and it's admin) can exist.
     */
    function grantRole(bytes32 role, address account)
        public
        virtual
        override
        onlyRole(getRoleAdmin(role)) /** onlyRole() and getRoleAdmin() are inherited from AccessControlUpgradeable */
    {
        require(account != msg.sender, "Account already has DAO_ROLE"); // To safeguard against locking access out

        super.grantRole(role, account);
        if (role == DAO_ROLE) {
            // Revokes GOVERNOR_ROLE so that there can only be at most one GOVERNOR_ADMIN
            _revokeRole(DAO_ROLE, msg.sender);
        }
    }

    function setCrowdSaleStableCoins(
        address eth,
        address usdc,
        address usdt
    ) public onlyRole(DAO_ROLE) whenNotPaused {
        require(eth != address(0), "ETH cannot be zero");
        require(usdc != address(0), "USDC cannot be zero");
        require(usdt != address(0), "USDT cannot be zero");

        ETH_ADDRESS = eth;
        USDC_ADDRESS = usdc;
        USDT_ADDRESS = usdt;
    }

    function setOraclePriceFeeds(
        address bnbPriceFeed,
        address ethPriceFeed,
        address usdcPriceFeed,
        address usdtPriceFeed
    ) public onlyRole(DAO_ROLE) whenNotPaused {
        require(bnbPriceFeed != address(0), "BNB price feed cannot be zero");
        require(ethPriceFeed != address(0), "ETH price feed cannot be zero");
        require(usdcPriceFeed != address(0), "USDC price feed cannot be zero");
        require(usdtPriceFeed != address(0), "USDT price feed cannot be zero");
        BNB_PRICE_FEED = bnbPriceFeed;
        ETH_PRICE_FEED = ethPriceFeed;
        USDC_PRICE_FEED = usdcPriceFeed;
        USDT_PRICE_FEED = usdtPriceFeed;
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
        override
        onlyRole(DEVELOPER_ROLE)
    {}
}
