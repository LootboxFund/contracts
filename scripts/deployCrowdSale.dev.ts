// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, upgrades } from "hardhat";
import { DAI, ETH, USDC, USDT, UST } from "../typechain";

const OxSoil = "0xaC15B26acF4334a62961237a0DCEC90eDFE1B251";
const Oxterran = "0x26dE296ff2DF4eA26aB688B8680531D2B1Bb461F";

// Needed to slow down transactions to avoid "replacement fee too low" errors...
const sleep = async (ms = 1000) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

const STARTING_GUILD_PRICE_IN_USD_CENTS = 7;

// Chainlink addresses from https://docs.chain.link/docs/binance-smart-chain-addresses
const STABLECOINS = {
  development: {
    BNB: {
      priceFeed: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526",
    },
    ETH: {
      priceFeed: "0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7",
    },
    DAI: {
      priceFeed: "0xE4eE17114774713d2De0eC0f035d4F7665fc025D",
    },
    USDC: {
      priceFeed: "0x90c069C4538adAc136E051052E14c1cD799C41B7",
    },
    USDT: {
      priceFeed: "0xEca2605f0BCF2BA5966372C99837b1F182d3D620",
    },
    UST: {
      priceFeed: "0xEca2605f0BCF2BA5966372C99837b1F182d3D620", // Note: chainlink does not have UST on testnet, using USDT for now
    },
  },
};

const ENVIRONMENT = "development";

async function main() {
  const [deployer, treasury, developerAndDao, purchaser] =
    await ethers.getSigners();
  const DEPLOYER_ADDRESS = deployer.address;
  console.log(`---- ${DEPLOYER_ADDRESS} ---> Deployer Address`);

  // --------- Deploy the Stablecoins --------- //
  const Eth = await ethers.getContractFactory("ETH");
  const ethStablecoin = (await Eth.deploy(0)) as ETH;
  await sleep();
  await ethStablecoin.mint(
    purchaser.address,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await ethStablecoin.mint(
    OxSoil,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await ethStablecoin.mint(
    Oxterran,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  console.log(`---- ${ethStablecoin.address} ---> ETH Stablecoin Address`);

  // Needed to slow down transactions to avoid "replacement fee too low" errors...
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });

  const Usdc = await ethers.getContractFactory("USDC");
  const usdcStablecoin = (await Usdc.deploy(0)) as USDC;
  await sleep();
  await usdcStablecoin.mint(
    purchaser.address,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await usdcStablecoin.mint(
    OxSoil,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await usdcStablecoin.mint(
    Oxterran,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  console.log(`---- ${usdcStablecoin.address} ---> USDC Stablecoin Address`);

  const Usdt = await ethers.getContractFactory("USDT");
  const usdtStablecoin = (await Usdt.deploy(0)) as USDT;
  await sleep();
  await usdtStablecoin.mint(
    purchaser.address,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await usdtStablecoin.mint(
    OxSoil,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await usdtStablecoin.mint(
    Oxterran,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  console.log(`---- ${usdtStablecoin.address} ---> USDT Stablecoin Address`);

  const Ust = await ethers.getContractFactory("UST");
  const ustStablecoin = (await Ust.deploy(0)) as UST;
  await sleep();
  await ustStablecoin.mint(
    purchaser.address,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await ustStablecoin.mint(
    OxSoil,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await ustStablecoin.mint(
    Oxterran,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  console.log(`---- ${ustStablecoin.address} ---> UST Stablecoin Address`);

  const Dai = await ethers.getContractFactory("DAI");
  const daiStablecoin = (await Dai.deploy(0)) as DAI;
  await sleep();
  await daiStablecoin.mint(
    purchaser.address,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await daiStablecoin.mint(
    OxSoil,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await daiStablecoin.mint(
    Oxterran,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  console.log(`---- ${daiStablecoin.address} ---> DAI Stablecoin Address`);

  // --------- Deploy GUILD Token --------- //
  const GuildToken = await ethers.getContractFactory("GuildToken");
  const guildtoken = await upgrades.deployProxy(GuildToken, { kind: "uups" });
  await guildtoken.deployed();
  await sleep();
  const GUILD_TOKEN_ADDRESS = guildtoken.address;
  const GUILD = await GuildToken.attach(GUILD_TOKEN_ADDRESS);
  console.log(`---- ${GUILD_TOKEN_ADDRESS} ---> GUILD Token Address`);
  (
    await GUILD.transferOwnershipToDAO(DEPLOYER_ADDRESS, DEPLOYER_ADDRESS)
  ).wait();
  await sleep();

  // --------- Deploy the Crowdsale --------- //
  const Crowdsale = await ethers.getContractFactory("CrowdSale");
  const crowdsale = await upgrades.deployProxy(
    Crowdsale,
    [
      GUILD_TOKEN_ADDRESS,
      developerAndDao.address,
      developerAndDao.address,
      treasury.address,
      STARTING_GUILD_PRICE_IN_USD_CENTS,
    ],
    { kind: "uups" }
  );
  await crowdsale.deployed();
  await sleep();
  const CROWDSALE_ADDRESS = crowdsale.address;
  const CROWDSALE = await Crowdsale.attach(CROWDSALE_ADDRESS);
  await sleep();
  console.log(`---- ${CROWDSALE_ADDRESS} ---> GUILD Crowdsale Address`);

  console.log(`
  
  // ----- Deploy Stablecoins
  ETH = ${ethStablecoin.address}
  USDC = ${usdcStablecoin.address}
  USDT = ${usdtStablecoin.address}
  UST = ${ustStablecoin.address}
  DAI = ${daiStablecoin.address}

  `);
  (
    await CROWDSALE.setStablecoins(
      ethStablecoin.address,
      usdcStablecoin.address,
      usdtStablecoin.address,
      ustStablecoin.address,
      daiStablecoin.address
    )
  ).wait();
  console.log(`---- Set stablecoins!`);
  await sleep();
  (
    await CROWDSALE.setOracles(
      STABLECOINS[ENVIRONMENT].BNB.priceFeed,
      STABLECOINS[ENVIRONMENT].ETH.priceFeed,
      STABLECOINS[ENVIRONMENT].USDC.priceFeed,
      STABLECOINS[ENVIRONMENT].USDT.priceFeed,
      STABLECOINS[ENVIRONMENT].UST.priceFeed,
      STABLECOINS[ENVIRONMENT].DAI.priceFeed
    )
  ).wait();
  console.log(`---- Set oracles!`);
  await sleep();

  // --------- Whitelist the CrowdSale with MINTER_ROLE --------- //
  (await GUILD.whitelistMint(crowdsale.address, true)).wait();
  console.log(`---- Whitelist a mint!`);
  await sleep();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
