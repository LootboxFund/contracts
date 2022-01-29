// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
//
// THIS SCRIPT ASSUMES YOU HAVE RAN ./deployCrowdSaleFactory.dev.ts which would have
// created a constants file which we hardcode for now
//
// Run this script as:
// npm run deploy:testnet:crowdsale-factory [GUILD_TOKEN_ADDRESS] [GFX_CONSTANTS_ADDRESS] [GUILD_TOKEN_STARTING_PRICE]
// where:
//    GUILD_TOKEN_ADDRESS - Address of the token you want to start a crowdsale for
//    GFX_CONSTANTS_ADDRESS - Address of internal GuildFX constants contract
//    GUILD_TOKEN_STARTING_PRICE - Starting price in USD (8 decimals)

import { ethers, network } from "hardhat";
import { stripZeros } from "../test/helpers/test-helpers";
import { sleep } from "./helpers/helpers";
import { logToFile } from "./helpers/logger";

const DEFAULT_GFX_CONSTANTS_ADDRESS =
  "0x1Beb201015aDa838243500b4a630d73C9665E3BF";
const DEFAULT_GUILD_TOKEN_ADDRESS =
  "0x39c2cf6ce66310359e1e103afa2668b34bfc2394";
const DEFAULT_GUILD_TOKEN_STARTING_PRICE = "7000000"; // 7 USD cents

const LOG_FILE_PATH = `${__dirname}/logs/deployCrowdSaleFactory_log_${Date.now()}.dev.txt`;

let gfxConstants: string,
  guildTokenAddress: string,
  guildTokenStartingPrice: string;

[guildTokenAddress, gfxConstants, guildTokenStartingPrice] =
  process.argv.slice(2);

async function main() {
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

---- Network = ${network.name} (Decimal ID = ${network.config.chainId})

---- Params:

     Guild Token Address         ${guildTokenAddress}

     GuildFX Constants:          ${gfxConstants}

     Guild Token Starting Price: ${guildTokenStartingPrice}

  \n`,
    LOG_FILE_PATH
  );

  if (!guildTokenAddress) {
    guildTokenAddress = DEFAULT_GUILD_TOKEN_ADDRESS;
  }

  if (!gfxConstants) {
    gfxConstants = DEFAULT_GFX_CONSTANTS_ADDRESS;
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
