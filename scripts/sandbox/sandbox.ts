
// npx hardhat run scripts/sandbox/sandbox.ts  --network binance_testnet

import { ethers, upgrades } from "hardhat";

const CROWDSALE_ADDRESS = "0x7825F177eb695702171BDA06F972A113df882ac1"
const USDC_ADDRESS = "0xFe6794F3eDF4b710D2340C73cCaC539538dC720D"

async function main() {
	const [deployer, treasury, developerAndDao, purchaser] =
	  await ethers.getSigners();

	  console.log(`------------ SANDBOX ------------`)

	const Crowdsale = await ethers.getContractFactory("CrowdSale");
	const crowdsale = await Crowdsale.attach(CROWDSALE_ADDRESS);

	await crowdsale.connect(purchaser).testEventLogging();
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
  });
  