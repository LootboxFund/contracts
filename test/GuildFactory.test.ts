import { ethers, upgrades } from "hardhat";
import {
  GuildFactory,
  GuildFactory__factory,
  GuildToken,
  GuildToken__factory,
  Constants,
  Constants__factory,
  Governor__factory,
  Governor,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractTransaction } from "ethers";
import {
  DAO_ROLE,
  DEVELOPER_ROLE,
  GFX_STAFF_ROLE,
  GUILD_OWNER_ROLE,
  generatePermissionRevokeMessage,
  stripZeros,
  GOVERNOR_ADMIN_ROLE,
  DEFAULT_ADMIN_ROLE,
} from "./helpers/test-helpers";

describe("📦 GuildFactory", () => {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let gfxStaff: SignerWithAddress;
  let guildDao: SignerWithAddress;
  let guildDev: SignerWithAddress;
  let guildTreasury: SignerWithAddress;

  let GuildFactory: GuildFactory__factory;
  let guildFactory: GuildFactory;
  let Constants: Constants__factory;
  let constants: Constants;

  before(async () => {
    GuildFactory = await ethers.getContractFactory("GuildFactory");
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

    guildFactory = await GuildFactory.deploy(dao.address, constants.address);
    await guildFactory.deployed();
  });

  it("initialization reverts if DAO address is zero", async () => {
    await expect(
      GuildFactory.deploy(ethers.constants.AddressZero, constants.address)
    ).to.be.revertedWith("DAO address cannot be zero");
  });

  it("initialization reverts if FXConstants address is zero", async () => {
    await expect(
      GuildFactory.deploy(dao.address, ethers.constants.AddressZero)
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

  it("no one has the GUILD_OWNER_ROLE upon factory init", async () => {
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

    it("assigns and revokes gfxStaff the GFX_STAFF_ROLE", async () => {
      await guildFactory.connect(dao).whitelistGFXStaff(gfxStaff.address, true);
      expect(await guildFactory.hasRole(GFX_STAFF_ROLE, gfxStaff.address)).to.be
        .true;
      await guildFactory
        .connect(dao)
        .whitelistGFXStaff(gfxStaff.address, false);
      expect(await guildFactory.hasRole(GFX_STAFF_ROLE, gfxStaff.address)).to.be
        .false;
    });

    it("emits a FactoryStaffWhitelist event", async () => {
      const request = guildFactory
        .connect(dao)
        .whitelistGFXStaff(gfxStaff.address, true);
      expect(request)
        .to.emit(guildFactory, "FactoryStaffWhitelist")
        .withArgs(gfxStaff.address, true);

      const requestRevoke = guildFactory
        .connect(dao)
        .whitelistGFXStaff(gfxStaff.address, false);
      expect(requestRevoke)
        .to.emit(guildFactory, "FactoryStaffWhitelist")
        .withArgs(gfxStaff.address, false);
    });
  });

  describe("🗳  whitelistGuildOwner()", () => {
    it("reverts with access control error when not called by GFX_STAFF_ROLE", async () => {
      await expect(
        guildFactory
          .connect(deployer)
          .whitelistGuildOwner(guildDao.address, true)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(deployer.address, GFX_STAFF_ROLE)
      );
    });

    it("reverts with pausable error when contract is paused", async () => {
      await guildFactory.connect(dao).pause();
      await expect(
        guildFactory.connect(dao).whitelistGuildOwner(guildDao.address, true)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("assigns and revokes the guildDao the GUILD_OWNER_ROLE", async () => {
      await guildFactory.connect(dao).whitelistGFXStaff(gfxStaff.address, true);
      await guildFactory
        .connect(gfxStaff)
        .whitelistGuildOwner(guildDao.address, true);
      expect(await guildFactory.hasRole(GUILD_OWNER_ROLE, guildDao.address)).to
        .be.true;
      await guildFactory
        .connect(gfxStaff)
        .whitelistGuildOwner(guildDao.address, false);
      expect(await guildFactory.hasRole(GUILD_OWNER_ROLE, guildDao.address)).to
        .be.false;
    });

    it("emits a GuildOwnerWhitelist event", async () => {
      const request = guildFactory
        .connect(dao)
        .whitelistGuildOwner(guildDao.address, true);
      expect(request)
        .to.emit(guildFactory, "GuildOwnerWhitelist")
        .withArgs(guildDao.address, true);

      const requestRevoke = guildFactory
        .connect(dao)
        .whitelistGuildOwner(guildDao.address, false);
      expect(requestRevoke)
        .to.emit(guildFactory, "GuildOwnerWhitelist")
        .withArgs(guildDao.address, false);
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

  describe("🗳  viewGuildTokens()", () => {
    beforeEach(async () => {
      await guildFactory.connect(dao).whitelistGFXStaff(gfxStaff.address, true);
      await guildFactory
        .connect(gfxStaff)
        .whitelistGuildOwner(guildDao.address, true);
    });

    it("returns empty array when no guildTokens have been created yet", async () => {
      expect(await guildFactory.viewGuildTokens()).to.deep.eq([]);
    });

    it("returns the correct array length and type of guildToken proxy addresses", async () => {
      const nTokensToMake = 1;
      for (let n = 0; n < nTokensToMake; n++) {
        await guildFactory
          .connect(guildDao)
          .createGuild(
            "TestGuild" + n.toString(),
            "GUILDT" + n.toString(),
            guildDao.address,
            guildDev.address
          );
        const proxies = await guildFactory.viewGuildTokens();
        expect(proxies.length).to.eq(n + 1);
      }
      const proxies = await guildFactory.viewGuildTokens();
      expect(proxies.length).to.eq(1);
    });

    it("returns a distinct array", async () => {
      const nTokensToMake = 5;
      for (let n = 0; n < nTokensToMake; n++) {
        await guildFactory
          .connect(guildDao)
          .createGuild(
            "TestGuild" + nTokensToMake.toString(),
            "GUILDT" + nTokensToMake.toString(),
            guildDao.address,
            guildDev.address
          );
      }
      const proxies = await guildFactory.viewGuildTokens();
      expect(proxies.filter((v, i, a) => a.indexOf(v) === i).length).to.eq(
        nTokensToMake
      );
    });
  });

  describe("🗳  viewGovernors()", () => {
    beforeEach(async () => {
      await guildFactory.connect(dao).whitelistGFXStaff(gfxStaff.address, true);
      await guildFactory
        .connect(gfxStaff)
        .whitelistGuildOwner(guildDao.address, true);
    });

    it("returns empty array when no governors have been created yet", async () => {
      expect(await guildFactory.viewGovernors()).to.deep.eq([]);
    });

    it("returns the correct array length and type of governors proxy addresses", async () => {
      const nContractsToMake = 5;
      for (let n = 0; n < nContractsToMake; n++) {
        await guildFactory
          .connect(guildDao)
          .createGuild(
            "TestGuild" + n.toString(),
            "GUILDT" + n.toString(),
            guildDao.address,
            guildDev.address
          );
        const proxies = await guildFactory.viewGovernors();
        expect(proxies.length).to.eq(n + 1);
      }
      const proxies = await guildFactory.viewGovernors();
      expect(proxies.length).to.eq(nContractsToMake);
    });

    it("returns a distinct array", async () => {
      const nContractsToMake = 5;
      for (let n = 0; n < nContractsToMake; n++) {
        await guildFactory
          .connect(guildDao)
          .createGuild(
            "TestGuild" + n.toString(),
            "GUILDT" + n.toString(),
            guildDao.address,
            guildDev.address
          );
      }
      const proxies = await guildFactory.viewGovernors();
      expect(proxies.filter((v, i, a) => a.indexOf(v) === i).length).to.eq(
        nContractsToMake
      );
    });
  });

  describe("🗳  createGuild()", () => {
    let initialNumberOfGuilds: number;
    let initialNumberOfGovernors: number;
    let transaction: ContractTransaction;

    let guildToken: GuildToken;
    let GuildTokenFactory: GuildToken__factory;

    const guildName: string = "GuildFXTest";
    const guildSymbol: string = "GFXT";
    const guildDecimals: number = 18;

    before(async () => {
      GuildTokenFactory = await ethers.getContractFactory("GuildToken");
    });

    beforeEach(async () => {
      initialNumberOfGuilds = (await guildFactory.viewGuildTokens()).length;
      initialNumberOfGovernors = (await guildFactory.viewGovernors()).length;

      await guildFactory.connect(dao).whitelistGFXStaff(gfxStaff.address, true);
      await guildFactory
        .connect(gfxStaff)
        .whitelistGuildOwner(guildDao.address, true);

      transaction = await guildFactory
        .connect(guildDao)
        .createGuild(
          guildName,
          guildSymbol,
          guildDao.address,
          guildDev.address
        );

      const [guildTokenAddress] = (await guildFactory.viewGuildTokens()).map(
        stripZeros
      );
      guildToken = GuildTokenFactory.attach(guildTokenAddress);
    });

    it("reverts with access control error if missing GUILD_OWNER_ROLE", async () => {
      const users = [deployer, developer, purchaser];
      for (let user of users) {
        await expect(
          guildFactory
            .connect(guildDao)
            .createGuild(
              "GuildTokenTest",
              "GUILDTEST",
              guildDao.address,
              guildDev.address
            )
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(user.address, GUILD_OWNER_ROLE)
        );
      }
    });

    it("reverts if dao is zero", async () => {
      await expect(
        guildFactory
          .connect(guildDao)
          .createGuild(
            guildName,
            guildSymbol,
            ethers.constants.AddressZero,
            guildDev.address
          )
      ).to.be.revertedWith("DAO address cannot be zero");
    });

    it("reverts if developer is zero", async () => {
      await expect(
        guildFactory
          .connect(guildDao)
          .createGuild(
            guildName,
            guildSymbol,
            guildDao.address,
            ethers.constants.AddressZero
          )
      ).to.be.revertedWith("Developer address cannot be zero");
    });

    it("reverts if guildName is empty string", async () => {
      await expect(
        guildFactory
          .connect(guildDao)
          .createGuild("", guildSymbol, guildDao.address, guildDev.address)
      ).to.be.revertedWith("Guild name cannot be empty");
    });

    it("reverts if guildSymbol is empty string", async () => {
      await expect(
        guildFactory
          .connect(guildDao)
          .createGuild(guildName, "", guildDao.address, guildDev.address)
      ).to.be.revertedWith("Guild symbol cannot be empty");
    });

    it("reverts when contract paused", async () => {
      await guildFactory.connect(dao).pause();
      await expect(
        guildFactory
          .connect(guildDao)
          .createGuild(
            guildName,
            guildSymbol,
            guildDao.address,
            guildDev.address
          )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("emits a TokenGovernorPairCreated event", async () => {
      const guildTokens = (await guildFactory.viewGuildTokens()).map(
        stripZeros
      );
      const guildGovernors = (await guildFactory.viewGovernors()).map(
        stripZeros
      );
      expect(guildTokens.length).gt(initialNumberOfGuilds);
      expect(guildGovernors.length).gt(initialNumberOfGovernors);
      await expect(transaction).to.emit(
        guildFactory,
        "TokenGovernorPairCreated"
      );
      // TODO: enable args checking - address capitalization is retained in the EnumberableSet
      // .withArgs(
      //   guildTokens[guildTokens.length - 1],
      //   guildGovernors[guildGovernors.length - 1]
      // );
    });

    it("adds an address in the GUILD_TOKEN_PROXIES set", async () => {
      const guildTokens = (await guildFactory.viewGuildTokens()).map(
        stripZeros
      );
      expect(guildTokens.length).eq(initialNumberOfGuilds + 1);
      expect(ethers.utils.isAddress(guildTokens[guildTokens.length - 1])).to.be
        .true;
    });

    it("adds an address in the GOVERNOR_PROXIES set", async () => {
      const governors = (await guildFactory.viewGovernors()).map(stripZeros);
      expect(governors.length).eq(initialNumberOfGovernors + 1);
      expect(ethers.utils.isAddress(governors[governors.length - 1])).to.be
        .true;
    });

    it("no user has the GOVERNOR_ADMIN_ROLE", async () => {
      const users = [deployer, dao, treasury, developer, purchaser];
      for (let user of users) {
        expect(await guildToken.hasRole(DEFAULT_ADMIN_ROLE, user.address)).to.be
          .false;
      }
    });

    it("the GuildFactory contract itself does not have the GOVERNOR_ADMIN_ROLE", async () => {
      // NOTE this is also well tested in the GuildToken.test.ts .grantRole() function
      expect(
        await guildToken.hasRole(GOVERNOR_ADMIN_ROLE, guildFactory.address)
      ).to.be.false;
    });

    it.skip("returns a hash resolving in the guild token and governor addresses", async () => {});

    describe("⚙️  _createGuildToken()", () => {
      it.skip("is payable and can receive native token");

      it("emits a GuildCreated event", async () => {
        await expect(transaction).to.emit(guildFactory, "GuildCreated");
        // await expect(transaction).to.emit(guildFactory, "GuildCreated").withArgs(
        //   guildTokenAddress, // TODO add explicit arg check (guildTokenAddress is all lowercase and not matching)
        //   guildName,
        //   guildSymbol,
        //   guildDao.address,
        //   guildDev.address
        // );
      });

      // TODO
      it.skip(
        "returns a hashed transaction resolving into the guildToken's proxy address"
      );

      it("sets the guildToken's address in the GUILD_TOKEN_PROXIES set", async () => {
        const guildTokenAddress = guildToken.address;
        expect(ethers.utils.isAddress(guildTokenAddress)).to.be.true;
        expect(guildTokenAddress.length).to.eq(42);
      });

      it(`sets guildToken's decimals to ${guildDecimals}`, async () => {
        const decimals = await guildToken.decimals();
        expect(typeof decimals).to.eq("number");
        expect(decimals).to.eq(guildDecimals);
      });

      it(`sets the guildToken's name to ${guildName}`, async () => {
        const name = await guildToken.name();
        expect(typeof name).to.eq("string");
        expect(name).to.eq(guildName);
      });

      it(`sets the guildToken's symbol to ${guildSymbol}`, async () => {
        const symbol = await guildToken.symbol();
        expect(typeof symbol).to.eq("string");
        expect(symbol).to.eq(guildSymbol);
      });

      it("grants the guildToken's DAO_ROLE to the dao", async () => {
        expect(await guildToken.hasRole(DAO_ROLE, dao.address)).to.eq(true);
      });

      it("grants the guildTokens's DEVELOPER_ROLE to the developer", async () => {
        expect(
          await guildToken.hasRole(DEVELOPER_ROLE, guildDev.address)
        ).to.eq(true);
      });
    });

    describe("⚙️  _createGovernor()", () => {
      let governorAddress: string;
      let Governor: Governor__factory;
      let governor: Governor;

      before(async () => {
        Governor = await ethers.getContractFactory("Governor");
      });

      beforeEach(async () => {
        [governorAddress] = (await guildFactory.viewGovernors()).map(
          stripZeros
        );
        governor = Governor.attach(governorAddress);
      });

      it.skip("is payable and can receive native token");

      it("emits a GovernorCreated event", async () => {
        await expect(transaction).to.emit(guildFactory, "GovernorCreated");
        // await expect(transaction).to.emit(guildFactory, "GuildCreated").withArgs(
        //   governorAddress, // TODO add explicit arg check (governorAddress is all lowercase and not matching)
        //   guildName,
        //   guildSymbol,
        //   guildDao.address,
        //   guildDev.address
        // );
      });

      // TODO
      it.skip(
        "returns a hashed transaction resolving into the governor's proxy address"
      );

      it("sets the governor's address in the GOVERNOR_PROXIES set", async () => {
        expect(typeof governorAddress).to.eq("string");
        expect(ethers.utils.isAddress(governorAddress)).to.be.true;
        expect(governorAddress.length).to.eq(42);
        expect(governor.address).to.eq(governorAddress);
      });
    });

    describe("making multiple guildtokens and governors", () => {
      let secondGovernorAddress: string;
      let secondGovernor: Governor;
      let secondGuildTokenAddress: string;
      let secondGuildToken: GuildToken;

      let GuildTokenFactory: GuildToken__factory;
      let GovernorFactory: Governor__factory;

      let governorAddress: string;
      let guildTokenAddress: string;

      before(async () => {
        GuildTokenFactory = await ethers.getContractFactory("GuildToken");
        GovernorFactory = await ethers.getContractFactory("Governor");
      });

      beforeEach(async () => {
        [governorAddress] = (await guildFactory.viewGovernors()).map(
          stripZeros
        );
        [governorAddress] = (await guildFactory.viewGovernors()).map(
          stripZeros
        );
        await guildFactory
          .connect(guildDao)
          .createGuild(
            "GuildToken2",
            "GUILD2",
            guildDao.address,
            guildDev.address
          );
        let _;
        [_, secondGuildTokenAddress] = (
          await guildFactory.viewGuildTokens()
        ).map(stripZeros);
        secondGuildToken = GuildTokenFactory.attach(secondGuildTokenAddress);
        [_, secondGovernorAddress] = (await guildFactory.viewGovernors()).map(
          stripZeros
        );
        secondGovernor = GovernorFactory.attach(secondGovernorAddress);
      });

      it("creates a distinguished governor address from the first", async () => {
        const addresses = await guildFactory.viewGovernors();
        expect(addresses.length).to.eq(
          addresses.filter((v, i, a) => a.indexOf(v) === i).length
        ); // distinct
        expect(typeof secondGovernorAddress).to.eq("string");
        expect(ethers.utils.isAddress(secondGovernorAddress)).to.be.true;
        expect(secondGovernorAddress).to.not.eq(governorAddress);
      });

      it("creates a distinguished token address from the first", async () => {
        const addresses = await guildFactory.viewGuildTokens();
        expect(addresses.length).to.eq(
          addresses.filter((v, i, a) => a.indexOf(v) === i).length
        ); // distinct
        expect(typeof secondGuildTokenAddress).to.eq("string");
        expect(ethers.utils.isAddress(secondGuildTokenAddress)).to.be.true;
        expect(secondGuildTokenAddress).to.not.eq(guildTokenAddress);
      });
    });
  });
});
