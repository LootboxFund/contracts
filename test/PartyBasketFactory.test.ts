import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers as _ethers } from "ethers";
import { ethers, upgrades } from "hardhat";
import {
  PartyBasketFactory__factory,
  PartyBasketFactory,
  LootboxEscrow,
  PartyBasket,
} from "../typechain";
import { DAO_ROLE, stripZeros } from "./helpers/test-helpers";

describe.only("📦 PartyBasketFactory smart contract", () => {
  let PartyBasketFactory: PartyBasketFactory__factory;
  let partyBasketFactory: PartyBasketFactory;
  let partyBasket: PartyBasket;

  let deployer: SignerWithAddress;
  let whitelistKey: SignerWithAddress;
  let maliciousKey: SignerWithAddress;
  let mintingKey: SignerWithAddress;
  let admin: SignerWithAddress;
  let lootboxDAO: SignerWithAddress;

  beforeEach(async () => {
    PartyBasketFactory = await ethers.getContractFactory("PartyBasketFactory");
    const accounts = await ethers.getSigners();

    deployer = accounts[0];
    whitelistKey = accounts[1];
    maliciousKey = accounts[2];
    mintingKey = accounts[3];
    admin = accounts[4];
    lootboxDAO = accounts[5];
  });

  it("reverts if dao is zero address", async () => {
    await expect(
      PartyBasketFactory.deploy(
        ethers.constants.AddressZero,
        whitelistKey.address
      )
    ).to.be.revertedWith("DAO address cannot be the zero address");
  });

  it("reverts if whitelister is zero address", async () => {
    await expect(
      PartyBasketFactory.deploy(
        lootboxDAO.address,
        ethers.constants.AddressZero
      )
    ).to.be.revertedWith("Whitelister address cannot be the zero address");
  });

  it("grants the dao the DAO_ROLE", async () => {
    const partyBasketFactory = await PartyBasketFactory.deploy(
      lootboxDAO.address,
      whitelistKey.address
    );

    expect(await partyBasketFactory.hasRole(DAO_ROLE, lootboxDAO.address)).to.be
      .true;
  });

  describe("createPartyBasket()", () => {
    let lootbox: LootboxEscrow;

    beforeEach(async () => {
      const lootboxFactory = await ethers.getContractFactory("LootboxEscrow");

      lootbox = (await upgrades.deployProxy(
        lootboxFactory,
        [
          "NAME",
          "SYMBOL",
          "base",
          ethers.BigNumber.from("100000"),
          ethers.utils.parseUnits("5000000", "18"), // 50k shares, 18 decimals
          deployer.address,
          deployer.address,
          "2000000",
          deployer.address,
          deployer.address,
        ],
        { kind: "uups" }
      )) as LootboxEscrow;

      partyBasketFactory = await PartyBasketFactory.deploy(
        lootboxDAO.address,
        whitelistKey.address
      );
    });

    it("reverts with pausable error if contract is paused", async () => {
      await partyBasketFactory.connect(lootboxDAO).pause();
      await expect(
        partyBasketFactory.createPartyBasket(
          "name",
          lootbox.address,
          admin.address
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("assigns the party basket params correctly", async () => {
      await partyBasketFactory.createPartyBasket(
        "name",
        lootbox.address,
        admin.address
      );

      const addresses = await partyBasketFactory.viewPartyBaskets();

      expect(addresses.length).to.eq(1);
      const partyBasketAddress = stripZeros(addresses[0]);

      const partyBasket = await ethers.getContractAt(
        "PartyBasket",
        partyBasketAddress
      );

      expect(await partyBasket.name()).to.eq("name");
      expect(await partyBasket.lootboxAddress()).to.eq(lootbox.address);
      expect(await partyBasket.hasRole(DAO_ROLE, admin.address)).to.be.true;
    });
  });
});
