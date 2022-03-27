import * as dotenv from "dotenv";
import "hardhat-contract-sizer";

import { HardhatUserConfig, task } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: { enabled: !process.env.DEBUG },
    },
  },
  networks: {
    binance_mainnet: {
      chainId: 56,
      url: `https://bsc-dataseed.binance.org`,
      accounts: [],
    },
    binance_testnet: {
      chainId: 97,
      url: `https://speedy-nodes-nyc.moralis.io/cfd85a5f6e8635607e954ada/bsc/testnet`,
      accounts: [
        `${process.env.DEV_DEPLOYER_PRIVATE_KEY}`,
        `${process.env.DEV_TREASURY_PRIVATE_KEY}`,
        `${process.env.DEV_DAO_PRIVATE_KEY}`,
        `${process.env.DEV_DEVELOPER_PRIVATE_KEY}`,
        `${process.env.DEV_PURCHASER_PRIVATE_KEY}`,
        `${process.env.DEV_GFX_STAFF_PRIVATE_KEY}`,
        `${process.env.DEV_GUILD_DAO_PRIVATE_KEY}`,
        `${process.env.DEV_GUILD_DEV_PRIVATE_KEY}`,
        `${process.env.DEV_GUILD_TREASURY_PRIVATE_KEY}`,
      ],
    },
    rinkeby: {
      chainId: 4,
      url: `https://speedy-nodes-nyc.moralis.io/f111521389b4b4a5701c6b0b/eth/rinkeby`,
      accounts: [
        `${process.env.DEV_DEPLOYER_PRIVATE_KEY}`,
        `${process.env.DEV_TREASURY_PRIVATE_KEY}`,
        `${process.env.DEV_DAO_PRIVATE_KEY}`,
        `${process.env.DEV_DEVELOPER_PRIVATE_KEY}`,
        `${process.env.DEV_PURCHASER_PRIVATE_KEY}`,
        `${process.env.DEV_GFX_STAFF_PRIVATE_KEY}`,
        `${process.env.DEV_GUILD_DAO_PRIVATE_KEY}`,
        `${process.env.DEV_GUILD_DEV_PRIVATE_KEY}`,
        `${process.env.DEV_GUILD_TREASURY_PRIVATE_KEY}`,
      ],
    },
    hardhat: {
      forking: {
        url: "https://bscrpc.com",
        blockNumber: 16411871,
      },
    },
    mumbai_testnet: {
      chainId: 80001,
      url: `https://speedy-nodes-nyc.moralis.io/cfd85a5f6e8635607e954ada/polygon/mumbai`,
      accounts: [
        `${process.env.DEV_DEPLOYER_PRIVATE_KEY}`,
        `${process.env.DEV_TREASURY_PRIVATE_KEY}`,
        `${process.env.DEV_DAO_PRIVATE_KEY}`,
        `${process.env.DEV_DEVELOPER_PRIVATE_KEY}`,
        `${process.env.DEV_PURCHASER_PRIVATE_KEY}`,
        `${process.env.DEV_GFX_STAFF_PRIVATE_KEY}`,
        `${process.env.DEV_GUILD_DAO_PRIVATE_KEY}`,
        `${process.env.DEV_GUILD_DEV_PRIVATE_KEY}`,
        `${process.env.DEV_GUILD_TREASURY_PRIVATE_KEY}`,
      ],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
