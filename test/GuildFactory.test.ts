import { ethers, upgrades } from "hardhat";
import {
  GuildFactory,
  GuildFactory__factory,
  GuildToken,
  GuildToken__factory,
  Constants,
  Constants__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, ContractTransaction } from "ethers";
import {
  DAO_ROLE,
  DEVELOPER_ROLE,
  generatePermissionRevokeMessage,
  stripZeros,
} from "./helpers/test-helpers";

describe("📦 GuildFactory", () => {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;
  let purchaser: SignerWithAddress;

  let GuildFactory: GuildFactory__factory;
  let guildFactory: GuildFactory;
  let Constants: Constants__factory;
  let constants: Constants;

  before(async () => {
    GuildFactory = await ethers.getContractFactory("GuildFactory");
    Constants = await ethers.getContractFactory("Constants");
  });

  beforeEach(async () => {
    [deployer, treasury, dao, developer, purchaser] = await ethers.getSigners();

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

  it("set the address for the Constants contract", async () => {
    const guildFactoryAddress = await guildFactory.fxConstants();
    expect(typeof guildFactoryAddress).to.eq("string");
    expect(constants.address).to.eq(await guildFactory.fxConstants());
  });

  it("assignes the dao the DAO_ROLE", async () => {
    expect(await guildFactory.hasRole(DAO_ROLE, dao.address)).to.be.true;
  });

  describe("viewGuildTokens()", () => {
    it("returns empty array when no guildTokens have been created yet", async () => {
      expect(await guildFactory.viewGuildTokens()).to.deep.eq([]);
    });

    it("returns the correct array length and type of guildToken proxy addresses", async () => {
      const nTokensToMake = 5;
      for (let n = 0; n < nTokensToMake; n++) {
        await guildFactory.createGuild(
          "TestGuild" + nTokensToMake.toString(),
          "GUILDT" + nTokensToMake.toString(),
          dao.address,
          developer.address
        );
        const proxies = await guildFactory.viewGuildTokens();
        expect(proxies.length).to.eq(n + 1);
        // expect(proxies.every((addr: string) => typeof addr === "string" && )).to.deep.eq()
      }
      const proxies = await guildFactory.viewGuildTokens();
      expect(proxies.length).to.eq(nTokensToMake);
    });

    it("returns a distinct array", async () => {
      const nTokensToMake = 5;
      for (let n = 0; n < nTokensToMake; n++) {
        await guildFactory.createGuild(
          "TestGuild" + nTokensToMake.toString(),
          "GUILDT" + nTokensToMake.toString(),
          dao.address,
          developer.address
        );
      }
      const proxies = await guildFactory.viewGuildTokens();
      expect(proxies.filter((v, i, a) => a.indexOf(v) === i).length).to.eq(
        nTokensToMake
      );
    });
  });

  describe("createGuild()", () => {
    let guildTokenAddress: string;
    let GuildTokenFactory: GuildToken__factory;
    let guildToken: GuildToken;
    let transaction: ContractTransaction;
    const guildName: string = "GuildFXTest";
    const guildSymbol: string = "GFXT";
    const guildDecimals: number = 18;

    before(async () => {
      GuildTokenFactory = await ethers.getContractFactory("GuildToken");
    });

    beforeEach(async () => {
      transaction = await guildFactory.createGuild(
        guildName,
        guildSymbol,
        dao.address,
        developer.address
      );

      [guildTokenAddress] = (await guildFactory.viewGuildTokens()).map(
        stripZeros
      );
      guildToken = GuildTokenFactory.attach(guildTokenAddress);
    });

    it("reverts with 'Pausable: paused' error if contract is paused", async () => {
      await guildFactory.connect(dao).pause();
      await expect(
        guildFactory.createGuild(
          guildName,
          guildSymbol,
          dao.address,
          developer.address
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it.skip("is payable and can receive native token");

    it("emits a GuildCreated event", async () => {
      await expect(transaction).to.emit(guildFactory, "GuildCreated");
      // await expect(transaction).to.emit(guildFactory, "GuildCreated").withArgs(
      //   guildTokenAddress, // TODO add explicit arg check (guildTokenAddress is all lowercase and not matching)
      //   guildName,
      //   guildSymbol,
      //   dao.address,
      //   developer.address
      // );
    });

    // TODO
    it.skip(
      "returns a hashed transaction resolving into the guildToken's proxy address"
    );

    it("sets the guildToken's address", async () => {
      expect(typeof guildTokenAddress).to.eq("string");
      expect(guildTokenAddress.slice(0, 2)).to.eq("0x");
      expect(guildTokenAddress.length).to.eq(42);
      expect(guildToken.address).to.eq(guildTokenAddress);
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
      expect(await guildToken.hasRole(DEVELOPER_ROLE, developer.address)).to.eq(
        true
      );
    });

    describe("when making a second guildToken", () => {
      let secondGuildTokenAddress: string;
      let secondGuildToken: GuildToken;

      beforeEach(async () => {
        await guildFactory.createGuild(
          "GuildNumber2",
          "GN2",
          purchaser.address,
          purchaser.address
        );
        let _;
        [_, secondGuildTokenAddress] = (
          await guildFactory.viewGuildTokens()
        ).map(stripZeros);
        secondGuildToken = GuildTokenFactory.attach(secondGuildTokenAddress);
      });

      it("creates a distinguished address from the first", async () => {
        expect(typeof secondGuildTokenAddress).to.eq("string");
        expect(secondGuildTokenAddress.slice(0, 2)).to.eq("0x");
        expect(secondGuildTokenAddress).to.not.eq(guildTokenAddress);
      });
    });
    describe("pause()", () => {
      it("reverts with access control error if not called by the DAO", async () => {
        await expect(guildToken.connect(purchaser).pause()).to.be.revertedWith(
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

    describe("unpause()", () => {
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
  });
});
