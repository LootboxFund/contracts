import { ethers, upgrades } from "hardhat";
import {
  CrowdSaleFactory,
  CrowdSaleFactory__factory,
  Constants,
  Constants__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractTransaction } from "ethers";
import {
  DAO_ROLE,
  GFX_STAFF_ROLE,
  GUILD_OWNER_ROLE,
  generatePermissionRevokeMessage,
} from "./helpers/test-helpers";

describe("📦 CrowdSaleFactory", () => {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let gfxStaff: SignerWithAddress;
  let guildDao: SignerWithAddress;
  let guildDev: SignerWithAddress;
  let guildTreasury: SignerWithAddress;

  let CrowdSaleFactory: CrowdSaleFactory__factory;
  let guildFactory: CrowdSaleFactory;
  let Constants: Constants__factory;
  let constants: Constants;

  before(async () => {
    CrowdSaleFactory = await ethers.getContractFactory("CrowdSaleFactory");
    Constants = await ethers.getContractFactory("Constants");
  });

  beforeEach(async () => {
    const [
      _deployer,
      _treasury,
      _dao,
      _developer,
      _purchaser,
      _gfxStaff,
      _guildDao,
      _guildDev,
      _guildTreasury,
    ] = await ethers.getSigners();

    deployer = _deployer;
    treasury = _treasury;
    dao = _dao;
    developer = _developer;
    purchaser = _purchaser;
    gfxStaff = _gfxStaff;
    guildDao = _guildDao;
    guildDev = _guildDev;
    guildTreasury = _guildTreasury;

    constants = (await upgrades.deployProxy(
      Constants,
      [dao.address, developer.address, treasury.address],
      {
        kind: "uups",
      }
    )) as Constants;
    await constants.deployed();

    guildFactory = await CrowdSaleFactory.deploy(
      dao.address,
      constants.address
    );
    await guildFactory.deployed();
  });

  it("initialization reverts if DAO address is zero", async () => {
    await expect(
      CrowdSaleFactory.deploy(ethers.constants.AddressZero, constants.address)
    ).to.be.revertedWith("DAO address cannot be zero");
  });

  it("initialization reverts if FXConstants address is zero", async () => {
    await expect(
      CrowdSaleFactory.deploy(dao.address, ethers.constants.AddressZero)
    ).to.be.revertedWith("FXConstants address cannot be zero");
  });

  it("set the address for the Constants contract", async () => {
    const guildFactoryAddress = await guildFactory.fxConstants();
    expect(typeof guildFactoryAddress).to.eq("string");
    expect(constants.address).to.eq(await guildFactory.fxConstants());
  });

  it("assignes the dao the DAO_ROLE", async () => {
    expect(await guildFactory.hasRole(DAO_ROLE, dao.address)).to.be.true;
  });

  it("assignes the dao the GFX_STAFF_ROLE", async () => {
    expect(await guildFactory.hasRole(GFX_STAFF_ROLE, dao.address)).to.be.true;
  });

  it("does not yet assign anyone the GUILD_OWNER_ROLE", async () => {
    expect(await guildFactory.hasRole(GUILD_OWNER_ROLE, dao.address)).to.be
      .false;
  });

  describe("🗳  whitelistGFXStaff()", () => {
    it("reverts with access control error when not called by DAO_ROLE", async () => {
      await expect(
        guildFactory
          .connect(deployer)
          .whitelistGFXStaff(purchaser.address, true)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(deployer.address, DAO_ROLE)
      );
    });

    it("reverts with pausable error when contract is paused", async () => {
      await guildFactory.connect(dao).pause();
      await expect(
        guildFactory.connect(dao).whitelistGFXStaff(purchaser.address, true)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("assigns and revokes the guild manager the GFX_STAFF_ROLE", async () => {
      await guildFactory
        .connect(dao)
        .whitelistGFXStaff(purchaser.address, true);
      expect(await guildFactory.hasRole(GFX_STAFF_ROLE, purchaser.address)).to
        .be.true;
      await guildFactory
        .connect(dao)
        .whitelistGFXStaff(purchaser.address, false);
      expect(await guildFactory.hasRole(GFX_STAFF_ROLE, purchaser.address)).to
        .be.false;
    });

    it("emits a FactoryStaffWhitelist event", async () => {
      const request = guildFactory
        .connect(dao)
        .whitelistGFXStaff(purchaser.address, true);
      expect(request)
        .to.emit(guildFactory, "FactoryStaffWhitelist")
        .withArgs(purchaser.address, dao.address, true);

      const requestRevoke = guildFactory
        .connect(dao)
        .whitelistGFXStaff(purchaser.address, false);
      expect(requestRevoke)
        .to.emit(guildFactory, "FactoryStaffWhitelist")
        .withArgs(purchaser.address, dao.address, false);
    });
  });

  describe("🗳  whitelistGuildOwner()", () => {
    it("reverts with access control error when not called by GFX_STAFF_ROLE", async () => {
      await expect(
        guildFactory
          .connect(deployer)
          .whitelistGuildOwner(purchaser.address, true)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(deployer.address, GFX_STAFF_ROLE)
      );
    });

    it("reverts with pausable error when contract is paused", async () => {
      await guildFactory.connect(dao).pause();
      await expect(
        guildFactory.connect(dao).whitelistGuildOwner(purchaser.address, true)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("assigns and revokes the guild manager the GUILD_OWNER_ROLE", async () => {
      await guildFactory
        .connect(dao)
        .whitelistGuildOwner(purchaser.address, true);
      expect(await guildFactory.hasRole(GUILD_OWNER_ROLE, purchaser.address)).to
        .be.true;
      await guildFactory
        .connect(dao)
        .whitelistGuildOwner(purchaser.address, false);
      expect(await guildFactory.hasRole(GUILD_OWNER_ROLE, purchaser.address)).to
        .be.false;
    });

    it("emits a FactoryStaffWhitelist event", async () => {
      const request = guildFactory
        .connect(dao)
        .whitelistGuildOwner(purchaser.address, true);
      expect(request)
        .to.emit(guildFactory, "GuildOwnerWhitelist")
        .withArgs(purchaser.address, dao.address, true);

      const requestRevoke = guildFactory
        .connect(dao)
        .whitelistGuildOwner(purchaser.address, false);
      expect(requestRevoke)
        .to.emit(guildFactory, "GuildOwnerWhitelist")
        .withArgs(purchaser.address, dao.address, false);
    });
  });

  describe("🗳  pause()", () => {
    it("reverts with access control error if not called by the DAO", async () => {
      await expect(guildFactory.connect(purchaser).pause()).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });

    describe("called by address with the DAO_ROLE", () => {
      let transaction: ContractTransaction;

      beforeEach(async () => {
        transaction = await guildFactory.connect(dao).pause();
      });

      it("pauses the contract", async () => {
        expect(await guildFactory.paused()).to.be.equal(true);
      });

      it("emits a paused event", async () => {
        await expect(transaction).to.emit(guildFactory, "Paused");
      });
    });
  });

  describe("🗳  unpause()", () => {
    it("reverts with with access control error", async () => {
      await expect(
        guildFactory.connect(purchaser).unpause()
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });

    describe("called by address with the DAO_ROLE", () => {
      let transaction: ContractTransaction;

      beforeEach(async () => {
        await guildFactory.connect(dao).pause();
        transaction = await guildFactory.connect(dao).unpause();
      });

      it("unpauses the contract", async () => {
        expect(await guildFactory.paused()).to.be.equal(false);
      });

      it("emits an unpaused event", async () => {
        await expect(transaction).to.emit(guildFactory, "Unpaused");
      });
    });
  });

  describe.skip("createCrowdSale()", () => {
    it.skip("TODO implement these tests");
  });
});
