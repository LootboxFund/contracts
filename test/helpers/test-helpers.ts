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
export const GUILD_MANAGER_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["GUILD_MANAGER_ROLE"]
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
