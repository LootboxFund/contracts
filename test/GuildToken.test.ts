/**
 * GUILD token (aka the rebase token) is what ties the SuperGuild together
 * All teams that fundraise using GamerDAO Vaults will offer a mix of GUILD tokens and other tokens
 * The guaranteed APY on GUILD tokens is inflationary, and thus represents the SuperGuild's stake in the team
 * Therefore GamerDAO is the GUILD token. Anyone who holds the GUILD token is part of the SuperGuild
 * However, the GUILD token smart contract is a subset of the SuperGuild's smart contract family.
 * Other members of the GamerDAO (aka the SuperGuild) include:
 *  - VAULTs (how a team inside the SuperGuild funds their projects)
 *  - MINTs (how the SuperGuild earns a stablecoin profit on GUILD token's market price)
 *  - WARCHESTs (the actual funds that a team uses to fund their projects)
 *  - TREASURY (the SuperGuild's stablecoin wallet)
 *
 * The GUILD token smart contract should only define permissioned functions that are used by the other smart contracts of the SuperGuild
 */

import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
// @ts-ignore ts(7016) Seems like they don't have any type declarations at this time
import { constants } from "@openzeppelin/test-helpers";
import {
  convertTokenToWei,
  DAO_ROLE,
  DEFAULT_ADMIN_ROLE,
  DEVELOPER_ROLE,
  generatePermissionRevokeMessage,
  MINTER_ROLE,
  padAddressTo32Bytes,
} from "./helpers/test-helpers";
import { GuildToken, GuildToken__factory } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("📦 GUILD token", async () => {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;
  let purchaser: SignerWithAddress;

  let Token: GuildToken__factory;
  let token: GuildToken;

  const tokenName = "GuildTokenTest";
  const tokenSymbol = "GUILDT";

  before(async () => {
    Token = await ethers.getContractFactory("GuildToken");
  });

  beforeEach(async () => {
    [deployer, treasury, dao, developer, purchaser] = await ethers.getSigners();
    token = (await upgrades.deployProxy(
      Token,
      [tokenName, tokenSymbol, dao.address, developer.address],
      { kind: "uups" }
    )) as GuildToken;
    await token.deployed();
  });

  it(`has "${tokenName}" name`, async () => {
    expect(await token.name()).to.equal(tokenName);
  });

  it(`has "${tokenSymbol}" symbol`, async () => {
    expect(await token.symbol()).to.equal(tokenSymbol);
  });

  it("has 18 decimals", async () => {
    expect(await token.decimals()).to.be.equal(18);
  });

  it("grants the dao the DAO_ROLE", async () => {
    expect(await token.hasRole(DAO_ROLE, dao.address)).to.be.equal(true);
  });

  it("grants the developer the DEVELOPER_ROLE", async () => {
    expect(await token.hasRole(DEVELOPER_ROLE, developer.address)).to.be.equal(
      true
    );
  });

  it("does not grant the DEFAULT_ADMIN_ROLE", async () => {
    expect(
      await token.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)
    ).to.be.equal(false);
    expect(await token.hasRole(DEFAULT_ADMIN_ROLE, dao.address)).to.be.equal(
      false
    );
    expect(
      await token.hasRole(DEFAULT_ADMIN_ROLE, developer.address)
    ).to.be.equal(false);
    expect(
      await token.hasRole(DEFAULT_ADMIN_ROLE, purchaser.address)
    ).to.be.equal(false);
  });

  describe("🗳 pause()", () => {
    describe("called by address with the DAO_ROLE", () => {
      let promise: Promise<unknown>;

      beforeEach(async () => {
        promise = token.connect(dao).pause();
      });

      it("pauses the contract", async () => {
        await promise;
        expect(await token.paused()).to.be.equal(true);
      });

      it("emits a paused event", async () => {
        await expect(promise).to.emit(token, "Paused");
      });
    });

    describe("called by address without the DAO_ROLE", () => {
      let promise: Promise<unknown>;

      beforeEach(async () => {
        promise = token.connect(purchaser).pause();
      });

      it("reverts with access control error", async () => {
        await expect(promise).to.be.revertedWith(
          generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
        );
      });
    });
  });

  describe("🗳 unpause()", () => {
    describe("called by address with the DAO_ROLE", () => {
      let promise: Promise<unknown>;

      beforeEach(async () => {
        await token.connect(dao).pause();
        promise = token.connect(dao).unpause();
      });

      it("unpauses the contract", async () => {
        await promise;
        expect(await token.paused()).to.be.equal(false);
      });

      it("emits an unpaused event", async () => {
        await expect(promise).to.emit(token, "Unpaused");
      });
    });

    describe("called by address without the DAO_ROLE", () => {
      let promise: Promise<unknown>;

      beforeEach(async () => {
        await token.connect(dao).pause();
        promise = token.connect(purchaser).unpause();
      });

      it("reverts with with access control error", async () => {
        await expect(promise).to.be.revertedWith(
          generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
        );
      });
    });
  });

  describe("🗳 whitelistMint()", () => {
    it("reverts with access control error if not called by the DAO", async () => {
      await expect(
        token.connect(purchaser).whitelistMint(purchaser.address, true)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });

    it("reverts with 'Pausable: paused' error when contract is paused", async () => {
      await token.connect(dao).pause();

      await expect(
        token.connect(dao).whitelistMint(purchaser.address, true)
      ).to.be.revertedWith("Pausable: paused");
    });

    describe("when adding an address to the whitelist", () => {
      let promise: Promise<unknown>;

      beforeEach(() => {
        promise = token.connect(dao).whitelistMint(purchaser.address, true);
      });

      it("grants the address the MINTER_ROLE", async () => {
        await promise;
        expect(await token.hasRole(MINTER_ROLE, purchaser.address)).to.be.equal(
          true
        );
      });

      it("adds the address to the ACTIVE_MINTS", async () => {
        await promise;
        const mintsWhitelist = await token.viewMintsWhitelist();
        expect(mintsWhitelist).to.have.members([
          padAddressTo32Bytes(purchaser.address),
        ]);
      });

      it("emits a MintACLUpdated event", async () => {
        await expect(promise).to.emit(token, "MintACLUpdated");
      });

      it("increments the cumulativeMintsWhitelisted variable", async () => {
        const initlaCumulativeMintsWhitelisted =
          await token.cumulativeMintsWhitelisted();
        await promise;
        expect(await token.cumulativeMintsWhitelisted()).to.be.equal(
          initlaCumulativeMintsWhitelisted.add(1)
        );
      });
    });

    describe("when removing an address from the whitelist", () => {
      let promise: Promise<unknown>;

      beforeEach(async () => {
        await token.connect(dao).whitelistMint(purchaser.address, true);
        promise = token.connect(dao).whitelistMint(purchaser.address, false);
      });

      it("revokes the MINTER_ROLE from the address", async () => {
        await promise;
        expect(await token.hasRole(MINTER_ROLE, purchaser.address)).to.be.equal(
          false
        );
      });

      it("removes the address from the ACTIVE_MINTS", async () => {
        await promise;
        const mintsWhitelist = await token.viewMintsWhitelist();
        expect(mintsWhitelist).to.not.have.members([
          padAddressTo32Bytes(purchaser.address),
        ]);
      });

      it("emits a MintACLUpdated event", async () => {
        await expect(promise).to.emit(token, "MintACLUpdated");
      });

      it("does not change the cumulativeMintsWhitelisted variable", async () => {
        const initlaCumulativeMintsWhitelisted =
          await token.cumulativeMintsWhitelisted();
        await promise;
        expect(await token.cumulativeMintsWhitelisted()).to.be.equal(
          initlaCumulativeMintsWhitelisted
        );
      });
    });

    describe("when adding an address twice", () => {
      beforeEach(async () => {
        await token.connect(dao).whitelistMint(purchaser.address, true);
        await token.connect(dao).whitelistMint(purchaser.address, true);
      });

      it("only has one entry in the ACTIVE MINTS", async () => {
        const mintsWhitelist = await token.viewMintsWhitelist();
        const addresses = mintsWhitelist.filter(
          (address: string) =>
            address === padAddressTo32Bytes(purchaser.address)
        );
        expect(addresses).to.have.length(1);
      });

      it("address has the MINTER_ROLE", async () => {
        expect(await token.hasRole(MINTER_ROLE, purchaser.address)).to.equal(
          true
        );
      });

      it("double counts the cumulativeMintsWhitelisted", async () => {
        expect(await token.cumulativeMintsWhitelisted()).to.be.equal(2);
      });
    });

    describe("when removing an address twice", () => {
      beforeEach(async () => {
        await token.connect(dao).whitelistMint(purchaser.address, false);
        await token.connect(dao).whitelistMint(purchaser.address, false);
      });

      it("does not add the address to the ACTIVE_MINTS", async () => {
        const mintsWhitelist = await token.viewMintsWhitelist();
        expect(mintsWhitelist).to.not.have.members([
          padAddressTo32Bytes(purchaser.address),
        ]);
      });

      it("address does not have the MINTER_ROLE", async () => {
        expect(await token.hasRole(MINTER_ROLE, purchaser.address)).to.equal(
          false
        );
      });
    });

    describe("when adding an address", () => {
      beforeEach(async () => {
        await token.connect(dao).whitelistMint(purchaser.address, true);
      });

      it("first should have the address in the ACTIVE_MINTS", async () => {
        const res = await token.viewMintsWhitelist();
        expect(res).to.have.members([padAddressTo32Bytes(purchaser.address)]);
      });

      it("initially the address should have the MINT_ROLE", async () => {
        expect(await token.hasRole(MINTER_ROLE, purchaser.address)).to.be.equal(
          true
        );
      });

      describe("and subsequently removing it", () => {
        beforeEach(async () => {
          await token.connect(dao).whitelistMint(purchaser.address, false);
        });

        it("removes address from MINTER_ROLE", async () => {
          expect(
            await token.hasRole(MINTER_ROLE, purchaser.address)
          ).to.be.equal(false);
        });

        it("does not have the address in the ACTIVE_MINTS", async () => {
          const res = await token.viewMintsWhitelist();
          expect(res).to.not.have.members([
            padAddressTo32Bytes(purchaser.address),
          ]);
        });
      });
    });
  });

  describe("🗳 viewMintsWhitelist()", () => {
    it("returns an empty array when no mints have been whitelisted", async () => {
      expect(await token.viewMintsWhitelist()).to.deep.equal([]);
    });

    it("returns an array of addresses that has been whitelisted (32 byte padded)", async () => {
      const expectedResult = [];
      const wallets = [deployer, dao, developer, purchaser];
      for (const wallet of wallets) {
        await token.connect(dao).whitelistMint(wallet.address, true);
        expectedResult.push(padAddressTo32Bytes(wallet.address));
        const whitelistedAddresses = await token.viewMintsWhitelist();
        expect(whitelistedAddresses).to.be.deep.equal(expectedResult);
      }
    });

    it("shows address added and subsequently removed", async () => {
      await token.connect(dao).whitelistMint(purchaser.address, true);
      expect(await token.viewMintsWhitelist()).to.have.members([
        padAddressTo32Bytes(purchaser.address),
      ]);
      await token.connect(dao).whitelistMint(purchaser.address, false);
      expect(await token.viewMintsWhitelist()).to.not.have.members([
        padAddressTo32Bytes(purchaser.address),
      ]);
    });
  });

  describe("🗳 mintRequest()", () => {
    it("reverts with permission error when not called with MINTER_ROLE", async () => {
      const promise = token
        .connect(purchaser)
        .mintRequest(purchaser.address, 10);
      await expect(promise).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, MINTER_ROLE)
      );
    });

    describe("when called by a whitelisted address", () => {
      let whitelistedAddress: SignerWithAddress;

      beforeEach(async () => {
        whitelistedAddress = purchaser;
        await token
          .connect(dao)
          .whitelistMint(whitelistedAddress.address, true);
      });

      it("reverts with 'Pausable: paused' error if contract is paused", async () => {
        await token.connect(dao).pause();
        await expect(
          token.connect(whitelistedAddress).mintRequest(treasury.address, 10)
        ).to.be.revertedWith("Pausable: paused");
      });

      it("reverts with permission error if the address was delisted", async () => {
        await token
          .connect(dao)
          .whitelistMint(whitelistedAddress.address, false);
        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, 10);
        await expect(promise).to.be.revertedWith(
          generatePermissionRevokeMessage(
            whitelistedAddress.address,
            MINTER_ROLE
          )
        );
      });

      it("sends the address the correct number of tokens", async () => {
        await token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, 10);
        const balance = await token.balanceOf(treasury.address);
        expect(balance).to.be.equal(convertTokenToWei(10));
        expect(await token.currentSupply()).to.be.equal(convertTokenToWei(10));
      });

      it("does not mint negative amount", async () => {
        const initialSupply = await token.currentSupply();
        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, -1000);
        // TODO: specify revert message
        // await expect(promise).to.be.revertedWith(
        //   generateInvalidArgumentErrorMessage(-1000)
        // );
        await expect(promise).to.be.reverted;
        expect(await token.currentSupply()).to.be.equal(initialSupply);
      });

      it("does not mint fractions", async () => {
        const initialSupply = await token.currentSupply();
        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, 0.1);
        // TODO: specify revert message
        // await expect(promise).to.be.revertedWith(
        //   generateInvalidArgumentErrorMessage(-1000)
        // );
        await expect(promise).to.be.reverted;
        expect(await token.currentSupply()).to.be.equal(initialSupply);
      });

      it("reverts on big number overflows", async () => {
        const initialSupply = await token.currentSupply();
        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, `${constants.MAX_UINT256}0`);
        // TODO: specify revert message
        // await expect(promise).to.be.revertedWith(
        //   generateInvalidArgumentErrorMessage(-1000)
        // );
        await expect(promise).to.be.reverted;
        expect(await token.currentSupply()).to.be.equal(initialSupply);
      });

      it("updates the current supply counter", async () => {
        expect(await token.currentSupply()).to.be.equal(0);
        await token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, 10);
        expect(await token.currentSupply()).to.be.equal(convertTokenToWei(10));
        await token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, 100);
        expect(await token.currentSupply()).to.be.equal(convertTokenToWei(110));
      });

      it("emits an MintRequestFulfilled event", async () => {
        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, 10);
        await expect(promise).to.emit(token, "MintRequestFulfilled");
      });
    });
  });

  describe("🗳 burn()", () => {
    it("reverts with 'Pausable: paused' error if contract is paused", async () => {
      await token.connect(dao).pause();
      await expect(token.connect(dao).burn(1)).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });
});
