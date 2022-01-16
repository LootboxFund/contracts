import { ethers } from "hardhat";
import {
  GuildFactory,
  GuildFactory__factory,
  GuildToken,
  GuildToken__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { DAO_ROLE, DEVELOPER_ROLE } from "./helpers/test-helpers";

describe("GuildFactory", () => {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;
  let purchaser: SignerWithAddress;

  let GuildFactory: GuildFactory__factory;
  let guildFactory: GuildFactory;

  before(async () => {
    GuildFactory = await ethers.getContractFactory("GuildFactory");
  });

  beforeEach(async () => {
    [deployer, treasury, dao, developer, purchaser] = await ethers.getSigners();
    guildFactory = await GuildFactory.deploy();
    await guildFactory.deployed();
  });

  it.skip("correctly sets the guildFX treasury");

  describe.skip("when contract is paused", () => {});

  describe("createGuild()", () => {
    let guildTokenAddress: string;
    let GuildToken: GuildToken__factory;
    let guildToken: GuildToken;
    const guildName: string = "GuildFXTest";
    const guildSymbol: string = "GFXT";
    const guildDecimals: number = 18;
    const initialSupply: BigNumber = ethers.utils.parseUnits("100", 18);

    before(async () => {
      GuildToken = await ethers.getContractFactory("GuildToken");
    });

    beforeEach(async () => {
      await guildFactory.createGuild(
        guildName,
        guildSymbol,
        dao.address,
        developer.address
      );
      guildTokenAddress = await guildFactory.deployedContracts(0);
      guildToken = GuildToken.attach(guildTokenAddress);
    });

    it(`sets guild token decimals to ${guildDecimals}`, async () => {
      const decimals = await guildToken.decimals();
      expect(typeof decimals).to.eq("number");
      expect(decimals).to.eq(guildDecimals);
    });

    it(`correctly sets the guild name to ${guildName}`, async () => {
      const symbol = await guildToken.symbol();
      expect(typeof symbol).to.eq("string");
      expect(symbol).to.eq(guildSymbol);
    });

    it(`correctly sets the guild symbol to ${guildSymbol}`, async () => {
      const symbol = await guildToken.symbol();
      expect(typeof symbol).to.eq("string");
      expect(symbol).to.eq(guildSymbol);
    });

    it("correctly sets the contract address", async () => {
      const address = guildToken.address;
      expect(typeof address).to.eq("string");
      expect(address.slice(0, 2)).to.eq("0x");
      expect(address).to.eq(guildTokenAddress);
    });

    it("grants the dao the DAO_ROLE", async () => {
      expect(await guildToken.hasRole(DAO_ROLE, dao.address)).to.eq(true);
    });

    it("grants the developer the DEVELOPER_ROLE", async () => {
      expect(await guildToken.hasRole(DEVELOPER_ROLE, developer.address)).to.eq(
        true
      );
    });

    it.skip(`mints ${initialSupply.toString()} initial tokens`, async () => {
      console.log("starting");
      const supply = await guildToken.currentSupply();
      console.log("supply:", supply);
      expect(supply).to.eq(initialSupply);
    });

    it.skip(`sets the max supply of XXX`);

    it.skip("sets the correct guildFX treasury value in the deployed contract", () => {
      // THIS SHOULD BE USED FROM THE CONSTANTS CONTRACT
      // const guildToken = GuildToken.attach(guildTokenAddress);
    });

    // it("emits a GuildCreated event");
  });
});
