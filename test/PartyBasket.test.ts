import { expect } from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import { WHITELISTER_ROLE } from "./helpers/test-helpers";
import { manifest } from "../scripts/manifest";

import { LootboxEscrow, PartyBasket, PartyBasket__factory } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { SUPERSTAFF_ROLE } from "./helpers/test-helpers";

// const BNB_ARCHIVED_PRICE = "41771363251"; // $417.36614642 USD per BNB

describe.only("📦 PartyBasket smart contract", () => {
  let PartyBasket: PartyBasket__factory;
  let partyBasket: PartyBasket;

  let deployer: SignerWithAddress;
  let whitelister: SignerWithAddress;

  beforeEach(async () => {
    PartyBasket = await ethers.getContractFactory("PartyBasket");
    const [_deployer, _treasury] = await ethers.getSigners();

    deployer = _deployer;
    whitelister = _treasury;
  });

  it("reverts when name is empty string", async () => {
    await expect(
      PartyBasket.deploy(
        "",
        "0xf1d92ef22db63bd8590eed61362ee851eec2dbdc",
        "0xf1d92ef22db63bd8590eed61362ee851eec2dbdc"
      )
    ).to.be.revertedWith("Name cannot be empty");
  });

  it("reverts when lootbox is zero address", async () => {
    await expect(
      PartyBasket.deploy(
        "PartyBasket",
        ethers.constants.AddressZero,
        "0xf1d92ef22db63bd8590eed61362ee851eec2dbdc"
      )
    ).to.be.revertedWith("Lootbox address cannot be the zero address");
  });

  it("reverts when whitelister is zero address", async () => {
    await expect(
      PartyBasket.deploy(
        "PartyBasket",
        "0xf1d92ef22db63bd8590eed61362ee851eec2dbdc",
        ethers.constants.AddressZero
      )
    ).to.be.revertedWith("Whitelister cannot be the zero address");
  });

  describe("After construction", () => {
    let lootbox: LootboxEscrow;

    beforeEach(async () => {
      const lootboxFactory = await ethers.getContractFactory("LootboxEscrow");
      lootbox = await lootboxFactory.deploy();

      partyBasket = await PartyBasket.deploy(
        "PartyBasket",
        lootbox.address,
        whitelister.address
      );
    });

    it("has correct name", async () => {
      const name = await partyBasket.name();
      expect(name).to.equal("PartyBasket");
    });

    it("has correct lootbox address", async () => {
      const lootboxAddress = await partyBasket.lootboxAddress();
      expect(lootboxAddress).to.equal(lootbox.address);
    });

    it("grants the whitelister the whitelister role", async () => {
      const isWhitelister = await partyBasket.hasRole(
        WHITELISTER_ROLE,
        whitelister.address
      );
      expect(isWhitelister).to.equal(true);
    });

    it("has the correct DOMAIN_SEPARATOR", async () => {
      const domainSeparator = await partyBasket.DOMAIN_SEPARATOR();
      expect(domainSeparator).to.equal(".");
    });
  });
});
