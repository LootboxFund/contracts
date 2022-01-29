// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
//
// THIS SCRIPT ASSUMES YOU HAVE RAN ./deployCrowdSaleFactory.dev.ts which would have
// created a constants file which we hardcode for now
//
//
// Run this script as:
// npm run deploy:testnet:crowdsale-factory
//
// TODO:
// Currently you can't call this script with args because of how it is called with hardhat.
// Ideally, we would like to call this script as such:
// EXAMPLE: npm run deploy:testnet:crowdsale-factory --arg1 [GUILD_TOKEN_ADDRESS] --arg2 [GFX_CONSTANTS_ADDRESS] --arg3 [GUILD_TOKEN_STARTING_PRICE]
// It would be nice to change the call signature to this.

import { ethers, network } from "hardhat";
import { stripZeros } from "../test/helpers/test-helpers";
import { sleep } from "./helpers/helpers";
import { logToFile } from "./helpers/logger";

interface IAddressesByChain {
  guildTokenAddress: string;
  gfxConstants: string;
}

interface IAddresses {
  [key: number]: IAddressesByChain;
}

const addresses: IAddresses = {
  // BSC MAINNET
  // 56: {},
  // BSC TESTNET
  97: {
    guildTokenAddress: "0x63693bd1ba571035dde710ae2862e7f970fbe9dd",
    gfxConstants: "0x56ae9253E0311FfdEf27Aa53c8F8318D71b43699",
  },
  // Rinkeby
  4: {
    guildTokenAddress: "0xf9d82fad77e65651c12606d12d749e1cbe2cf4d1",
    gfxConstants: "0x01e4f496C2eBA3E868785E5cF87A0037D9a765Dc",
  },
};

const DEFAULT_GUILD_TOKEN_STARTING_PRICE = "7000000"; // 7 USD cents

const LOG_FILE_PATH = `${__dirname}/logs/${network.name}_${
  network.config.chainId
}-deployCrowdSaleFactory_log_${Date.now()}.dev.txt`;

async function main() {
  let gfxConstants: string,
    guildTokenAddress: string,
    guildTokenStartingPrice: string;

  /**
   * TODO: currently argv does not work with how the script is called via hardhat. Please update this.
   */
  [guildTokenAddress, gfxConstants, guildTokenStartingPrice] =
    process?.argv.slice(2) || [];

  const chainId = network.config.chainId;

  if (!chainId) {
    throw new Error(
      "Chain ID cannot be undefined! Please specify the chain ID in hardhat.config.json"
    );
  }

  if (!(chainId in Object.keys(addresses))) {
    throw new Error(`Please update config for chain ID ${chainId}`);
  }

  const [
    deployer,
    treasury,
    dao,
    developer,
    purchaser,
    gfxStaff,
    guildDao,
    guildDev,
    guildTreasury,
  ] = await ethers.getSigners();
  const DEPLOYER_ADDRESS = deployer.address;
  logToFile(
    ` 
  
---------- DEPLOY CROWDSALE FACTORY (development) ----------
  
---- Script starting

---- Network = ${network.name} (Decimal ID = ${chainId})

---- Params:

     Guild Token Address         ${guildTokenAddress}

     GuildFX Constants:          ${gfxConstants}

     Guild Token Starting Price: ${guildTokenStartingPrice}

  \n`,
    LOG_FILE_PATH
  );

  if (!guildTokenAddress) {
    guildTokenAddress = addresses[chainId]?.guildTokenAddress;
  }

  if (!gfxConstants) {
    gfxConstants = addresses[chainId]?.gfxConstants;
  }
  if (!guildTokenStartingPrice) {
    guildTokenStartingPrice = DEFAULT_GUILD_TOKEN_STARTING_PRICE;
  }

  logToFile("----\n", LOG_FILE_PATH);

  logToFile(`---- ${DEPLOYER_ADDRESS} ---> Deployer Address \n`, LOG_FILE_PATH);
  logToFile(
    `---- ${guildTokenAddress} ---> GuildFX Gamer Token \n`,
    LOG_FILE_PATH
  );
  logToFile(`---- ${gfxConstants} ---> GuildFX Constants \n`, LOG_FILE_PATH);
  logToFile(
    `---- ${guildTokenStartingPrice} ---> Crowdsale Starting Price $USD (8 decimals) \n`,
    LOG_FILE_PATH
  );

  // --------- Deploy CrowdSale Factory --------- //
  const CrowdSaleFactory = await ethers.getContractFactory("CrowdSaleFactory");
  const crowdSaleFactory = await CrowdSaleFactory.deploy(
    dao.address,
    gfxConstants
  );
  await crowdSaleFactory.deployed();
  logToFile(
    `---- ${crowdSaleFactory.address} ---> Crowsale Factory Contract Address\n`,
    LOG_FILE_PATH
  );
  await sleep();

  // --------- Authorize GFX Staff --------- //
  const txWhitelistGFXStaff = await crowdSaleFactory
    .connect(dao)
    .whitelistGFXStaff(gfxStaff.address, true);

  await txWhitelistGFXStaff.wait();

  logToFile(
    `---- ${gfxStaff.address} ---> Whitelisted GuildFX staff \n`,
    LOG_FILE_PATH
  );

  // --------- Authorize a Guild Owner --------- //
  const txWhitelistGuildOwner = await crowdSaleFactory
    .connect(gfxStaff)
    .whitelistGuildOwner(guildDao.address, true);

  await txWhitelistGuildOwner.wait();

  logToFile(
    `---- ${guildDao.address} ---> Whitelisted guild's DAO \n`,
    LOG_FILE_PATH
  );

  // --------- Create the CrowdSale --------- //
  const tx = await crowdSaleFactory
    .connect(guildDao)
    .createCrowdSale(
      guildTokenAddress,
      guildDao.address,
      guildDev.address,
      guildTreasury.address,
      guildTokenStartingPrice
    );

  await tx.wait();
  // TODO Manually you will need to .whitelistMint() via the defender UI + multisig

  const [crowdsaleAddress] = (await crowdSaleFactory.viewCrowdSales()).map(
    stripZeros
  );

  logToFile(
    `---- ${crowdsaleAddress} ---> Crowsale Contract Address\n`,
    LOG_FILE_PATH
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  logToFile(error.message, LOG_FILE_PATH);
  console.error(error);
  process.exitCode = 1;
});
