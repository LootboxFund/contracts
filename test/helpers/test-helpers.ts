import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, upgrades } from "hardhat";
import { randomBytes } from "crypto";
import { BigNumberish } from "ethers";

export const generatePermissionRevokeMessage = (
  address: string,
  role: string
) =>
  `AccessControl: account ${address.toLowerCase()} is missing role ${role.toLowerCase()}`;

export const DAO_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["DAO_ROLE"]
);
export const LOGGER_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["LOGGER_ROLE"]
);
export const REBASE_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["REBASE_ROLE"]
);
export const DEVELOPER_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["DEVELOPER_ROLE"]
);
export const MINTER_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["MINTER_ROLE"]
);
export const GFX_STAFF_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["GFX_STAFF_ROLE"]
);
export const GUILD_OWNER_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["GUILD_OWNER_ROLE"]
);
export const GOVERNOR_ADMIN_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["GOVERNOR_ADMIN_ROLE"]
);
export const GOVERNOR_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["GOVERNOR_ROLE"]
);

export const GUILD_MANAGER_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["GUILD_MANAGER_ROLE"]
);

export const SUPERSTAFF_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["SUPERSTAFF_ROLE"]
);

export const BULKMINTER_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["BULKMINTER_ROLE"]
);

export const WHITELISTER_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["WHITELISTER_ROLE"]
);

export const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export const padAddressTo32Bytes = (address: string) =>
  ethers.utils.hexZeroPad(address, 32).toLowerCase();

// Opposite of padAddressTo32Bytes
export const stripZeros = (address: string) => {
  const desiredHexLength = 40; // Not including "0x"
  return `0x${address.slice(address.length - desiredHexLength)}`;
};

export const generateMockAddress = (value: string) =>
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(value)).slice(0, 42);

export const testLootboxURI = {
  address: "lootbox",
  name: "lootboxName",
  description: "sick ass motherfucking lootbox",
  image: "https://ychef.files.bbci.co.uk/1600x900/p07ryyyj.webp",
  backgroundColor: "#000000",
  backgroundImage: "https://ychef.files.bbci.co.uk/1600x900/p07ryyyj.webp",
  lootbox: {
    address: "0x2j34bl12kj3b1l2kj3b1l2",
    chainIdHex: "0x35",
    chainIdDecimal: "BSC",
    chainName: "Binance Sex Cootie",
    targetPaybackDate: new Date(),
    fundraisingTarget: "1000000x",
    basisPointsReturnTarget: "5000000",
    returnAmountTarget: "12312312312312",
    pricePerShare: "4323423423423",
    lootboxThemeColor: "#000000",
    transactionHash: "0x234lk1j23nl12kjn3",
    blockNumber: 12312312312,
  },
  socials: {
    twitter: "socialState.twitter",
    email: "socialState.email",
    instagram: "socialState.instagram",
    tiktok: "socialState.tiktok",
    facebook: "socialState.facebook",
    discord: "socialState.discord",
    youtube: "socialState.youtube",
    snapchat: "socialState.snapchat",
    twitch: "socialState.twitch",
    web: "socialState.web",
  },
};

export const signWhitelist = async (
  chainId: number,
  contractAddress: string,
  whitelistKey: SignerWithAddress,
  mintingAddress: string,
  nonce: string, // should be a stringified uint256 number
  contractName = "PartyBasket"
) => {
  // Domain data should match whats specified in the DOMAIN_SEPARATOR constructed in the contract
  // https://github.com/msfeldstein/EIP712-whitelisting/blob/main/contracts/EIP712Whitelisting.sol#L33-L43
  const domain = {
    name: contractName,
    version: "1",
    chainId,
    verifyingContract: contractAddress,
  };

  // The types should match the TYPEHASH specified in the contract
  // https://github.com/msfeldstein/EIP712-whitelisting/blob/main/contracts/EIP712Whitelisting.sol#L27-L28
  const types = {
    Minter: [
      { name: "wallet", type: "address" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const sig = await whitelistKey._signTypedData(domain, types, {
    wallet: mintingAddress,
    nonce,
  });

  return sig;
};

export const generateNonce = () => {
  const hexToDec = (s: string) => {
    var i,
      j,
      digits = [0],
      carry;
    for (i = 0; i < s.length; i += 1) {
      carry = parseInt(s.charAt(i), 16);
      for (j = 0; j < digits.length; j += 1) {
        digits[j] = digits[j] * 16 + carry;
        carry = (digits[j] / 10) | 0;
        digits[j] %= 10;
      }
      while (carry > 0) {
        digits.push(carry % 10);
        carry = (carry / 10) | 0;
      }
    }
    return digits.reverse().join("");
  };
  const bytes = randomBytes(16);
  return hexToDec(bytes.toString("hex"));
};

export const randomBN = (max: BigNumberish) => {
  return ethers.BigNumber.from(ethers.utils.randomBytes(32)).mod(max);
};
