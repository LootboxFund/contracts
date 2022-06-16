import { ethers, upgrades } from "hardhat";

export const generatePermissionRevokeMessage = (
  address: string,
  role: string
) =>
  `AccessControl: account ${address.toLowerCase()} is missing role ${role.toLowerCase()}`;

export const DAO_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["DAO_ROLE"]
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
