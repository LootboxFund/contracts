//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.13;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract EIP712Whitelisting is AccessControl {
    using ECDSA for bytes32;

    bytes32 public constant WHITELISTER_ROLE = keccak256("WHITELISTER_ROLE");

    // Domain Separator is the EIP-712 defined structure that defines what contract
    // and chain these signatures can be used for.  This ensures people can't take
    // a signature used to mint on one contract and use it for another, or a signature
    // from testnet to replay on mainnet.
    // It has to be created in the constructor so we can dynamically grab the chainId.
    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md#definition-of-domainseparator
    bytes32 public DOMAIN_SEPARATOR;

    // The typehash for the data type specified in the structured data
    // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md#rationale-for-typehash
    // This should match whats in the client side whitelist signing code
    // https://github.com/msfeldstein/EIP712-whitelisting/blob/main/test/signWhitelist.ts#L22
    bytes32 public constant MINTER_TYPEHASH =
        keccak256("Minter(address wallet,uint256 nonce)");

    mapping(bytes32 => bool) private signatureUsed;

    constructor(address whitelister, string memory contractName) {
        require(
            whitelister != address(0),
            "Whitelister cannot be the zero address"
        );

        // This should match whats in the client side whitelist signing code
        // https://github.com/msfeldstein/EIP712-whitelisting/blob/main/test/signWhitelist.ts#L12
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                // This should match the domain you set in your client side signing.
                keccak256(bytes(contractName)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
        _grantRole(WHITELISTER_ROLE, whitelister);
    }

    modifier requiresWhitelist(bytes calldata signature, uint256 nonce) {
        // Verify EIP-712 signature by recreating the data structure
        // that we signed on the client side, and then using that to recover
        // the address that signed the signature for this data.
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(MINTER_TYPEHASH, msg.sender, nonce))
            )
        );
        require(!signatureUsed[digest], "signature used");
        signatureUsed[digest] = true;
        // Use the recover method to see what address was used to create
        // the signature on this data.
        // Note that if the digest doesn't exactly match what was signed we'll
        // get a random recovered address.
        address recoveredAddress = digest.recover(signature);
        require(
            hasRole(WHITELISTER_ROLE, recoveredAddress),
            "Invalid Signature"
        );
        _;
    }
}
