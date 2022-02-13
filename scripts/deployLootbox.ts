
import { ethers, upgrades, network } from "hardhat";
import { logToFile } from "./helpers/logger";
import { Address } from "@guildfx/helpers";
import { addresses, STABLECOINS, CURRENT_SEMVER } from "./constants";

const chainIdHex = `0x${network.config.chainId?.toString(16)}`;

const LOG_FILE_PATH = `${__dirname}/logs/${
  network.name
}_${chainIdHex}-deployLootbox_log_${Date.now()}.dev.txt`;

// Needed to slow down transactions to avoid "replacement fee too low" errors...
const sleep = async (ms = 1000) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

async function main() {
  if (!chainIdHex) {
    throw new Error(
      "Chain ID cannot be undefined! Please specify the chain ID in hardhat.config.json"
    );
  }

  if (Object.keys(addresses).indexOf(chainIdHex) === -1) {
    throw new Error(
      `Please update config.addresses for chain ID ${chainIdHex}`
    );
  }

  if (Object.keys(STABLECOINS).indexOf(chainIdHex) === -1) {
    throw new Error(
      `Please update config.STABLECOINS for chain ID ${chainIdHex}`
    );
  }

  /**
   * IMPORTANT: Our hardhat config uses "untrusted" signers with a single private key.
   *            However, we have "trusted" guild fx accounts which are secure multisigs created in Openzeppelin Defender.
   *            Thus, we prefix the untrusted accounts with "__untrusted" in these scripts. The trusted multisigs are currently
   *            configured in { addresses } from ./constants. Please read the ../README.md for more details.
   */
  const [__untrustedDeployer, _, __untrustedGFXDAO, __, __untrustedPurchaser] =
    await ethers.getSigners();

  // GuildFX multisigs / contracts / addresses (see note above):
  const {
    Oxnewton,
    Oxterran,
    gfxDAO,
    gfxDeveloper,
    gfxTreasury,
    crimson,
    cana,
    mklion,
  } = addresses[chainIdHex];

  logToFile(
    `
  
---------- DEPLOY GUILD FACTORY (development) ----------

---- Script starting

---- Network:                             ${network.name} (Hex ID = ${chainIdHex}, Decimal ID = ${network.config.chainId})

---- 0xnewton:                            ${Oxnewton}

---- 0xterran:                            ${Oxterran}

---- Crimson:                             ${crimson}

---- Cana:                                ${cana}

---- GuildFX DAO (multisig):              ${gfxDAO}

---- GuildFX Treasury (multisig):         ${gfxTreasury}

---- GuildFX Dev (multisig):              ${gfxDeveloper}

---- Deployer (UNTRUSTED):                ${__untrustedDeployer.address}

---- Temporary GuildFX DAO (UNTRUSTED):   ${__untrustedGFXDAO.address}

---- Purchaser (UNTRUSTED):               ${__untrustedPurchaser.address}

  \n`,
    LOG_FILE_PATH
  );
  // --------- Deploy Guild Factory --------- //
  const bnbPriceOracle = "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526"
  const Lootbox = await ethers.getContractFactory("Lootbox");
  const lootbox = await Lootbox.deploy(
    "Artemis Guild",    // string  _name
    "ATMS",             // string  _symbol
    "100000",           // uint256 _maxSharesSold
    "7000000",          // uint256 _sharePriceUSD
    gfxTreasury,        // address _treasury
    gfxDAO,             // address _issuingEntity
    bnbPriceOracle,     // address _nativeTokenPriceFeed
    "2000000",          // uint256 _ticketPurchaseFee,
    "500000",           // uint256 _ticketAffiliateFee,
    Oxnewton,           // address _broker,
    Oxterran            // address _affiliate
  );

  await lootbox.deployed();
  logToFile(
    `Lootbox Contract Address = ${lootbox.address} \n`,
    LOG_FILE_PATH
  );
  await sleep();
}

main().catch((error) => {
  logToFile(error.message, LOG_FILE_PATH);
  console.error(error);
  process.exitCode = 1;
});
