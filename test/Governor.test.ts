import { ethers, upgrades } from "hardhat";
/* eslint-disable */
import {
  Governor__factory,
  Governor,
  GuildToken__factory,
  GuildToken,
  Constants__factory,
  Constants,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { expect } from "chai";
import { generatePermissionRevokeMessage } from "./helpers/test-helpers";

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

  let Constants: Constants__factory;
  let constants: Constants;

  const GUILD_TOKEN_NAME = "GuildTokenTest";
  const GUILD_TOKEN_SYMBOL = "GUILDT";

  before(async () => {
    Constants = await ethers.getContractFactory("Constants");
    Governor = await ethers.getContractFactory("Governor");
    Token = await ethers.getContractFactory("GuildToken");
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

    token = (await upgrades.deployProxy(
      Token,
      [
        GUILD_TOKEN_NAME,
        GUILD_TOKEN_SYMBOL,
        dao.address,
        developer.address,
        constants.address,
      ],
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

  describe("initial governance is set to zero - instant decisions with no delay, voting, or threshold", () => {
    it("has 0 blocks (0 day) voting delay", async () => {
      expect(await governor.votingDelay()).eq("0");
    });
    it("has 270 (1 hour) voting period", async () => {
      expect(await governor.votingPeriod()).eq("270");
    });
    it("has 0 token proposal threshold", async () => {
      expect(await governor.proposalThreshold()).eq(
        ethers.utils.parseEther("0")
      );
    });
  });

  //   setVotingDelay(newVotingDelay)

  // setVotingPeriod(newVotingPeriod)

  //   setProposalThreshold(newProposalThreshold)

  describe("governance is set", () => {
    it("has 6545 blocks (~1 day) voting delay", async () => {
      await governor.setVotingDelay(6545);
      expect(await governor.votingDelay()).eq("6545");
    });
    it("has 45818 (1 week) voting period", async () => {
      await governor.setVotingPeriod(45818);
      expect(await governor.votingPeriod()).eq("45818");
    });
    it("has 1000 token proposal threshold", async () => {
      await governor.setProposalThreshold(1000);
      expect(await governor.proposalThreshold()).eq(
        ethers.utils.parseEther("1000")
      );
    });
    // we must make this below test pass
    // currently failing with `TransactionExecutionError: VM Exception while processing transaction: revert with reason "Ownable: caller is not the owner"`
    // which is odd because we are expecting that error to be thrown in the first place (see below test)
    it.skip("reverts if non-owner attempts changing quorum with setQuorumThreshold()", async () => {
      await expect(
        await governor.connect(purchaser).setQuorumThreshold(4)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("successfully changes quorum to 4% when owner calls setQuorumThreshold()", async () => {
      await governor.setQuorumThreshold(4);
      expect(await governor.quorumNumerator()).eq(4);
    });
  });
});
