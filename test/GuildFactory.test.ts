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
import { BigNumber } from "ethers";
import { DAO_ROLE, DEVELOPER_ROLE, stripZeros } from "./helpers/test-helpers";

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

    guildFactory = await GuildFactory.deploy(constants.address);
    await guildFactory.deployed();
  });

  it("set the address for the Constants contract", async () => {
    const guildFactoryAddress = await guildFactory.fxConstants();
    expect(typeof guildFactoryAddress).to.eq("string");
    expect(constants.address).to.eq(await guildFactory.fxConstants());
  });

  describe.skip("when contract is paused", () => {});

  describe.skip("viewGuildTokens()", () => {});

  describe("createGuild()", () => {
    let guildTokenAddress: string;
    let GuildTokenFactory: GuildToken__factory;
    let guildToken: GuildToken;
    const guildName: string = "GuildFXTest";
    const guildSymbol: string = "GFXT";
    const guildDecimals: number = 18;
    const initialSupply: BigNumber = ethers.utils.parseUnits("100", 18);

    before(async () => {
      GuildTokenFactory = await ethers.getContractFactory("GuildToken");
    });

    beforeEach(async () => {
      console.log("SETTING TINGS UP", guildName, guildSymbol);
      const tx = await guildFactory.createGuild(
        guildName,
        guildSymbol,
        dao.address,
        developer.address
      );

      const [paddedTokenAddress] = await guildFactory.viewGuildTokens();
      guildTokenAddress = stripZeros(paddedTokenAddress);
      guildToken = GuildTokenFactory.attach(guildTokenAddress);
    });

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

    it("grants the dao the guildToken's DAO_ROLE", async () => {
      expect(await guildToken.hasRole(DAO_ROLE, dao.address)).to.eq(true);
    });

    it("grants the developer the guildTokens's DEVELOPER_ROLE", async () => {
      expect(await guildToken.hasRole(DEVELOPER_ROLE, developer.address)).to.eq(
        true
      );
    });

    it.skip("emits a GuildCreated event");

    it.skip(`mints ${initialSupply.toString()} initial tokens`, async () => {
      console.log("starting");
      const supply = await guildToken.currentSupply();
      console.log("supply:", supply);
      expect(supply).to.eq(initialSupply);
    });

    it.skip("sets the correct guildFX treasury value in the deployed contract", () => {
      // THIS SHOULD BE USED FROM THE CONSTANTS CONTRACT
      // const guildToken = GuildTokenFactory.attach(guildTokenAddress);
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

        const [_, paddedTokenAddress] = await guildFactory.viewGuildTokens();
        secondGuildTokenAddress = stripZeros(paddedTokenAddress);
        secondGuildToken = GuildTokenFactory.attach(secondGuildTokenAddress);
      });

      it("creates a distinguished address from the first", async () => {
        expect(typeof secondGuildTokenAddress).to.eq("string");
        expect(secondGuildTokenAddress.slice(0, 2)).to.eq("0x");
        expect(secondGuildTokenAddress).to.not.eq(guildTokenAddress);
      });
    });
  });
});
