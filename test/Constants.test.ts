import { ethers, upgrades } from "hardhat";
import { Constants, Constants__factory } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import {
  DAO_ROLE,
  DEVELOPER_ROLE,
  generatePermissionRevokeMessage,
} from "./helpers/test-helpers";

describe("📦 Constants", async function () {
  let Constants: Constants__factory;
  let constants: Constants;
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;
  let purchaser: SignerWithAddress;

  before(async function () {
    Constants = await ethers.getContractFactory("Constants");
  });

  beforeEach(async function () {
    [deployer, treasury, dao, developer, purchaser] = await ethers.getSigners();
    constants = (await upgrades.deployProxy(
      Constants,
      [dao.address, developer.address, treasury.address],
      {
        kind: "uups",
      }
    )) as Constants;
    await constants.deployed();
  });

  it("initialization reverts if DAO address is zero", async () => {
    const promise = upgrades.deployProxy(
      Constants,
      [ethers.constants.AddressZero, developer.address, treasury.address],
      {
        kind: "uups",
      }
    );
    await expect(promise).to.be.revertedWith("DAO cannot be zero");
  });

  it("initialization reverts if developer address is zero", async () => {
    const promise = upgrades.deployProxy(
      Constants,
      [dao.address, ethers.constants.AddressZero, treasury.address],
      {
        kind: "uups",
      }
    );
    await expect(promise).to.be.revertedWith("Developer cannot be zero");
  });

  it("initialization reverts if treasury address is zero", async () => {
    const promise = upgrades.deployProxy(
      Constants,
      [dao.address, developer.address, ethers.constants.AddressZero],
      {
        kind: "uups",
      }
    );
    await expect(promise).to.be.revertedWith("Treasury cannot be zero");
  });

  it("sets the guildFX treasury", async () => {
    expect(await constants.treasury()).to.eq(treasury.address);
    // TODO: Add assertion that the treasury is payable
  });

  it("grants DAO_ROLE to the dao", async () => {
    expect(await constants.hasRole(DAO_ROLE, dao.address)).to.be.equal(true);
  });

  it("grants DEVELOPER_ROLE to the developer", async () => {
    expect(
      await constants.hasRole(DEVELOPER_ROLE, developer.address)
    ).to.be.equal(true);
  });

  describe("updateTreasuryAddress()", () => {
    it("reverts with access control error when not called by the dao", async () => {
      const wallets = [deployer, developer, purchaser];
      for (let wallet of wallets) {
        // Hack - mocha and chai do not seem to have good looping capabilities
        // I.e. it would be desirable to use it.each or expect.assertions(3) similar to jest
        await expect(
          constants.connect(wallet).updateTreasuryAddress(wallet.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(wallet.address, DAO_ROLE)
        );
      }
    });

    it("reverts when treasury address is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .updateTreasuryAddress(ethers.constants.AddressZero)
      ).to.be.revertedWith("Treasury cannot be zero");
    });

    describe("when contract is paused", () => {
      beforeEach(async () => {
        await constants.connect(dao).pause();
      });

      it('reverts with "Pausable: paused" error', async () => {
        await expect(
          constants.connect(dao).updateTreasuryAddress(deployer.address)
        ).to.be.revertedWith("Pausable: paused");
      });

      it("reverts with access control error when not called by the dao", async () => {
        const wallets = [deployer, developer, purchaser];
        for (let wallet of wallets) {
          // Hack - mocha and chai do not seem to have good looping capabilities
          // I.e. it would be desirable to use it.each or expect.assertions(3) similar to jest
          await expect(
            constants.connect(wallet).updateTreasuryAddress(wallet.address)
          ).to.be.revertedWith(
            generatePermissionRevokeMessage(wallet.address, DAO_ROLE)
          );
        }
      });
    });

    it("successfully updates the treasury", async () => {
      const targetAddress = deployer.address;
      await constants.connect(dao).updateTreasuryAddress(targetAddress);

      const updatedAddress = await constants.treasury();
      expect(updatedAddress).to.be.eq(targetAddress);
      // TODO Add another assertion that updatedAddress is payable
    });
  });
});
