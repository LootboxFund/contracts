// UUPS Upgradeable (OpenZeppelin ERC1967)
// https://forum.openzeppelin.com/t/uups-proxies-tutorial-solidity-javascript/7786

// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

contract GuildToken is Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, PausableUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    
    // roles to trusted smart contracts & the DAO
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE"); // our mint smart contracts
    // only the DAO can control GuildToken
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    // variables
    uint256 public currentSupply;
    address public originalDeployer;

    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter public cumulativeMintsWhitelisted;  // this may double count mints that get whitelisted twice

    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    EnumerableSetUpgradeable.AddressSet private ACTIVE_MINTS;  // active mints have the MINTER_ROLE

    // events
    event MintACLUpdated(address indexed _mintAddress, bool _isWhitelisted);
    event MintRequestFulfilled(address indexed _fromMint, address indexed _toReceiver, uint _amount);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}
 
    // ERC1967 UUPS Upgradeable
    function initialize() initializer public {
        __ERC20_init("GuildToken", "GUILD");
        __ERC20Burnable_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        // set current supply
        currentSupply = 0;
        
        // mark the original deployer so we can remove all permissions from them later
        originalDeployer = msg.sender;

        // temporarily grant admin / DAO / dev privileges to the original deployer
        // be careful not to lose the original deployer while finishing the entire deploy script
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DAO_ROLE, msg.sender);
        _grantRole(DEVELOPER_ROLE, msg.sender);
    }

    // Sets the production permissions, as a 3rd step
    // 1st step = initialize GuildToken
    // 2nd step = initialize the address of DAO
    // 3rd step = set the GuildToken production permissions to the DAO
    // Be careful not to lose the original deployer while finishing the entire deploy script
    // The same deployer should be used for all 3 steps
    function transferOwnershipToDAO (address _daoAddress, address _developerAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_daoAddress != address(0), "DAO address must not be 0");
        require(_developerAddress != address(0), "Developer address must not be 0");

        // remove the original deployer from DEFAULT_ADMIN_ROLE. Now nobody can be master admin
        _revokeRole(DEFAULT_ADMIN_ROLE, originalDeployer);
        // also remove the original deployer from DAO_ROLE and DEVELOPER_ROLE
        _revokeRole(DAO_ROLE, originalDeployer);
        _revokeRole(DEVELOPER_ROLE, originalDeployer);
        
        // Only the DAO can mint, burn, and pause the token
        _grantRole(DAO_ROLE, _daoAddress);
        // Only the DEV can upgrade the token
        _grantRole(DEVELOPER_ROLE, _developerAddress);
    }

    // --------- Managing the Mints --------- //
    function whitelistMint(address _mintAddress, bool _isActive) external onlyRole(DAO_ROLE) whenNotPaused {
        /** The Mint is deployed in Javascript but useless without being whitelisted
            Only whitelisted Mints can request minting.
            Only the DAO can whitelist Mints. This is a security measure to prevent abuse.
         */
        if (_isActive) {
            ACTIVE_MINTS.add(_mintAddress);
            _grantRole(MINTER_ROLE, _mintAddress);
            cumulativeMintsWhitelisted.increment();
        } else {
            ACTIVE_MINTS.remove(_mintAddress);
            _revokeRole(MINTER_ROLE, _mintAddress);
        }
        emit MintACLUpdated(_mintAddress, _isActive);
    }
    function mintRequest(address _recipient, uint256 _amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(ACTIVE_MINTS.contains(msg.sender), "Address must be whitelisted to request a mint");
        uint256 _addAmount = _amount;
        currentSupply = currentSupply + _addAmount;
        _mint(_recipient, _addAmount);
        emit MintRequestFulfilled(msg.sender, _recipient, _addAmount);
    }
    function viewMintsWhitelist() public view returns (bytes32[] memory) {
        return ACTIVE_MINTS._inner._values;
    }
    
    // --------- Managing the Token ---------
    function pause() public onlyRole(DAO_ROLE) {
        _pause();
    }
    function unpause() public onlyRole(DAO_ROLE) {
        _unpause();
    }
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        whenNotPaused
        override
    {
        super._beforeTokenTransfer(from, to, amount);
    }
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(DEVELOPER_ROLE)
        override
    {}
}
