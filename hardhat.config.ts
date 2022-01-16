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
    binance_testnet: {
      url: `https://speedy-nodes-nyc.moralis.io/f111521389b4b4a5701c6b0b/bsc/testnet`,
      accounts: [
        `${process.env.DEV_DEPLOYER_PRIVATE_KEY}`,
        `${process.env.DEV_TREASURY_PRIVATE_KEY}`,
        `${process.env.DEV_DAODEV_PRIVATE_KEY}`,
        `${process.env.DEV_ADDR_1_PRIVATE_KEY}`,
      ],
    },
    binance_mainnet: {
      url: `https://bsc-dataseed.binance.org`,
      accounts: [
        `${process.env.DEV_DEPLOYER_PRIVATE_KEY}`,
        `${process.env.DEV_TREASURY_PRIVATE_KEY}`,
        `${process.env.DEV_DAODEV_PRIVATE_KEY}`,
        `${process.env.DEV_ADDR_1_PRIVATE_KEY}`,
      ],
    },
    hardhat: {
      forking: {
        url: "https://speedy-nodes-nyc.moralis.io/27a1e291c662f960ae4245da/bsc/mainnet/archive",
        blockNumber: 13913313,
      },
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
