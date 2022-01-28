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
  let crowdsaleFactory: CrowdSaleFactory;
  let Constants: Constants__factory;
  let constants: Constants;

  const mockGuildTokenAddress = "0xe5faebe2dbc746a0fe99fe2924db1c6bf2ac3160";

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

    crowdsaleFactory = await CrowdSaleFactory.deploy(
      dao.address,
      constants.address
    );
    await crowdsaleFactory.deployed();
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
    const crowdsaleFactoryAddress = await crowdsaleFactory.fxConstants();
    expect(typeof crowdsaleFactoryAddress).to.eq("string");
    expect(constants.address).to.eq(await crowdsaleFactory.fxConstants());
  });

  it("assignes the dao the DAO_ROLE", async () => {
    expect(await crowdsaleFactory.hasRole(DAO_ROLE, dao.address)).to.be.true;
  });

  it("assignes the dao the GFX_STAFF_ROLE", async () => {
    expect(await crowdsaleFactory.hasRole(GFX_STAFF_ROLE, dao.address)).to.be
      .true;
  });

  it("does not yet assign anyone the GUILD_OWNER_ROLE", async () => {
    expect(await crowdsaleFactory.hasRole(GUILD_OWNER_ROLE, dao.address)).to.be
      .false;
  });

  describe("🗳  whitelistGFXStaff()", () => {
    it("reverts with access control error when not called by DAO_ROLE", async () => {
      await expect(
        crowdsaleFactory
          .connect(deployer)
          .whitelistGFXStaff(gfxStaff.address, true)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(deployer.address, DAO_ROLE)
      );
    });

    it("reverts with pausable error when contract is paused", async () => {
      await crowdsaleFactory.connect(dao).pause();
      await expect(
        crowdsaleFactory.connect(dao).whitelistGFXStaff(gfxStaff.address, true)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("assigns and revokes the GFX_STAFF_ROLE to our staff", async () => {
      await crowdsaleFactory
        .connect(dao)
        .whitelistGFXStaff(gfxStaff.address, true);
      expect(await crowdsaleFactory.hasRole(GFX_STAFF_ROLE, gfxStaff.address))
        .to.be.true;
      await crowdsaleFactory
        .connect(dao)
        .whitelistGFXStaff(gfxStaff.address, false);
      expect(await crowdsaleFactory.hasRole(GFX_STAFF_ROLE, gfxStaff.address))
        .to.be.false;
    });

    it("emits a FactoryStaffWhitelist event", async () => {
      const request = crowdsaleFactory
        .connect(dao)
        .whitelistGFXStaff(gfxStaff.address, true);
      expect(request)
        .to.emit(crowdsaleFactory, "FactoryStaffWhitelist")
        .withArgs(gfxStaff.address, dao.address, true);

      const requestRevoke = crowdsaleFactory
        .connect(dao)
        .whitelistGFXStaff(gfxStaff.address, false);
      expect(requestRevoke)
        .to.emit(crowdsaleFactory, "FactoryStaffWhitelist")
        .withArgs(gfxStaff.address, dao.address, false);
    });
  });

  describe("🗳  whitelistGuildOwner()", () => {
    it("reverts with access control error when not called by GFX_STAFF_ROLE", async () => {
      await expect(
        crowdsaleFactory
          .connect(deployer)
          .whitelistGuildOwner(guildDao.address, true)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(deployer.address, GFX_STAFF_ROLE)
      );
    });

    it("reverts with pausable error when contract is paused", async () => {
      await crowdsaleFactory.connect(dao).pause();
      await expect(
        crowdsaleFactory
          .connect(dao)
          .whitelistGuildOwner(guildDao.address, true)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("assigns and revokes the guild manager the GUILD_OWNER_ROLE", async () => {
      await crowdsaleFactory
        .connect(dao)
        .whitelistGFXStaff(gfxStaff.address, true);
      await crowdsaleFactory
        .connect(gfxStaff)
        .whitelistGuildOwner(guildDao.address, true);
      expect(await crowdsaleFactory.hasRole(GUILD_OWNER_ROLE, guildDao.address))
        .to.be.true;
      await crowdsaleFactory
        .connect(gfxStaff)
        .whitelistGuildOwner(guildDao.address, false);
      expect(await crowdsaleFactory.hasRole(GUILD_OWNER_ROLE, guildDao.address))
        .to.be.false;
    });

    it("emits a FactoryStaffWhitelist event", async () => {
      await crowdsaleFactory
        .connect(dao)
        .whitelistGFXStaff(gfxStaff.address, true);
      const request = crowdsaleFactory
        .connect(gfxStaff)
        .whitelistGuildOwner(guildDao.address, true);
      expect(request)
        .to.emit(crowdsaleFactory, "GuildOwnerWhitelist")
        .withArgs(guildDao.address, gfxStaff.address, true);

      const requestRevoke = crowdsaleFactory
        .connect(gfxStaff)
        .whitelistGuildOwner(guildDao.address, false);
      expect(requestRevoke)
        .to.emit(crowdsaleFactory, "GuildOwnerWhitelist")
        .withArgs(guildDao.address, gfxStaff.address, false);
    });
  });

  describe("🗳  pause()", () => {
    it.only("reverts with access control error if not called by the DAO", async () => {
      await expect(
        await crowdsaleFactory.connect(purchaser).pause()
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });

    describe("called by address with the DAO_ROLE", () => {
      let transaction: ContractTransaction;

      beforeEach(async () => {
        transaction = await crowdsaleFactory.connect(dao).pause();
      });

      it("pauses the contract", async () => {
        expect(await crowdsaleFactory.paused()).to.be.equal(true);
      });

      it("emits a paused event", async () => {
        await expect(transaction).to.emit(crowdsaleFactory, "Paused");
      });
    });
  });

  describe("🗳  unpause()", () => {
    it("reverts with with access control error", async () => {
      await expect(
        crowdsaleFactory.connect(purchaser).unpause()
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });

    describe("called by address with the DAO_ROLE", () => {
      let transaction: ContractTransaction;

      beforeEach(async () => {
        await crowdsaleFactory.connect(dao).pause();
        transaction = await crowdsaleFactory.connect(dao).unpause();
      });

      it("unpauses the contract", async () => {
        expect(await crowdsaleFactory.paused()).to.be.equal(false);
      });

      it("emits an unpaused event", async () => {
        await expect(transaction).to.emit(crowdsaleFactory, "Unpaused");
      });
    });
  });

  describe("createCrowdSale()", () => {
    beforeEach(async () => {
      await crowdsaleFactory
        .connect(dao)
        .whitelistGFXStaff(gfxStaff.address, true);
      await crowdsaleFactory
        .connect(gfxStaff)
        .whitelistGuildOwner(guildDao.address, true);
    });

    it("Rejects non-whitelist guild owners from deploying a crowdsale", async () => {
      await expect(
        crowdsaleFactory
          .connect(deployer)
          .createCrowdSale(
            mockGuildTokenAddress,
            guildDao.address,
            guildDev.address,
            guildTreasury.address,
            ethers.utils.parseUnits("5", 6)
          )
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(deployer.address, GUILD_OWNER_ROLE)
      );
    });
    it("Allows whitelist guild owners to deploy a crowdsale, emit with right details", async () => {
      await expect(
        await crowdsaleFactory
          .connect(guildDao)
          .createCrowdSale(
            mockGuildTokenAddress,
            guildDao.address,
            guildDev.address,
            guildTreasury.address,
            ethers.utils.parseUnits("5", 6)
          )
      ).to.emit(crowdsaleFactory, "CrowdSaleCreated");
    });
    it("Counts the correct number of crowdsales", async () => {
      const nCrowdsalesToMake = 5;
      for (let n = 0; n < nCrowdsalesToMake; n++) {
        await crowdsaleFactory
          .connect(guildDao)
          .createCrowdSale(
            mockGuildTokenAddress,
            guildDao.address,
            guildDev.address,
            guildTreasury.address,
            ethers.utils.parseUnits("5", 6)
          );
        const proxies = await crowdsaleFactory.viewCrowdSales();
        expect(proxies.length).to.eq(n + 1);
      }
      const proxies = await crowdsaleFactory.viewCrowdSales();
      expect(proxies.length).to.eq(nCrowdsalesToMake);
    });
  });
});
