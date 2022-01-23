import { ethers, upgrades } from "hardhat";
/* eslint-disable */
import {
  Governor__factory,
  Governor,
  GuildToken__factory,
  GuildToken,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { expect } from "chai";

describe("📦 Guild Governor Smart Contract", async () => {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;

  let Governor: Governor__factory;
  let governor: Governor;

  let Token: GuildToken__factory;
  let token: GuildToken;

  const GUILD_TOKEN_NAME = "GuildTokenTest";
  const GUILD_TOKEN_SYMBOL = "GUILDT";

  before(async () => {
    Governor = await ethers.getContractFactory("Governor");
    Token = await ethers.getContractFactory("GuildToken");
  });

  beforeEach(async () => {
    [deployer, treasury, dao, developer, purchaser] = await ethers.getSigners();

    token = (await upgrades.deployProxy(
      Token,
      [GUILD_TOKEN_NAME, GUILD_TOKEN_SYMBOL, dao.address, developer.address],
      { kind: "uups" }
    )) as GuildToken;
    await token.deployed();

    governor = (await upgrades.deployProxy(Governor, [token.address], {
      kind: "uups",
    })) as Governor;
    await governor.deployed();
  });

  it('has the "Governor" name', async () => {
    expect(await governor.name()).to.eq("Governor");
  });
  it("has 6545 blocks (~1 day) voting delay", async () => {
    expect(await governor.votingDelay()).eq("6545");
  });
  it("has 45818 (1 week) voting period", async () => {
    expect(await governor.votingPeriod()).eq("45818");
  });
  it("has 1000 token proposal threshold", async () => {
    expect(await governor.proposalThreshold()).eq(
      ethers.utils.parseEther("1000")
    );
  });
  it("has quorum of 4%", async () => {
    expect(await governor.quorumNumerator()).eq(4);
  });
});
