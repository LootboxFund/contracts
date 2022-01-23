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
import {
  DAO_ROLE,
  DEFAULT_ADMIN_ROLE,
  DEVELOPER_ROLE,
  GOVERNOR_ROLE,
  GOVERNOR_ADMIN_ROLE,
  generatePermissionRevokeMessage,
  MINTER_ROLE,
  padAddressTo32Bytes,
} from "./helpers/test-helpers";
import { GuildToken, GuildToken__factory } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";

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

  it("has 0 total supply", async () => {
    expect(await token.totalSupply()).eq("0");
  });

  it("grants the dao the DAO_ROLE", async () => {
    expect(await token.hasRole(DAO_ROLE, dao.address)).to.be.equal(true);
  });

  it("grants the sender the GOVERNOR_ADMIN_ROLE", async () => {
    expect(
      await token.hasRole(GOVERNOR_ADMIN_ROLE, deployer.address)
    ).to.be.equal(true);
  });

  it("sets the GOVERNOR_ADMIN_ROLE as the admin role for the GOVERNOR_ROLE", async () => {
    expect(await token.getRoleAdmin(GOVERNOR_ROLE)).to.eq(GOVERNOR_ADMIN_ROLE);
    expect(await token.getRoleAdmin(GOVERNOR_ADMIN_ROLE)).to.eq(
      DEFAULT_ADMIN_ROLE
    );
  });

  it("does not grant the dao the GOVERNOR_ROLE", async () => {
    expect(await token.hasRole(GOVERNOR_ROLE, dao.address)).to.be.equal(false);
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

  describe("🗳  grantRole()", () => {
    it("reverts for all users when assigning a role other than GOVERNOR_ROLE", async () => {
      const users = [dao, developer, treasury, purchaser, deployer];
      const roles = [
        DEFAULT_ADMIN_ROLE,
        GOVERNOR_ADMIN_ROLE,
        MINTER_ROLE,
        DAO_ROLE,
        DEVELOPER_ROLE,
      ];
      // TODO: Find a way to break this down with a it.each()()
      // No one can call this function
      for (let user of users) {
        // Check other generic roles
        for (let role of roles) {
          await expect(
            token.connect(user).grantRole(role, purchaser.address)
          ).to.be.revertedWith(
            generatePermissionRevokeMessage(user.address, DEFAULT_ADMIN_ROLE)
          );
        }
      }
    });

    it("reverts for all users except the deployer when assigning the GOVERNOR_ROLE", async () => {
      const users = [dao, treasury, developer, purchaser];
      for (let user of users) {
        await expect(
          token.connect(user).grantRole(GOVERNOR_ROLE, purchaser.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(user.address, GOVERNOR_ADMIN_ROLE)
        );
      }
      await expect(
        token.connect(deployer).grantRole(GOVERNOR_ROLE, purchaser.address)
      ).to.not.be.reverted;
    });

    describe("when the deployer grants the GOVERNOR_ROLE to an address", () => {
      let governor: SignerWithAddress;

      beforeEach(async () => {
        governor = purchaser;
        await token
          .connect(deployer)
          .grantRole(GOVERNOR_ROLE, governor.address);
      });
      it("grants the address the GOVERNOR_ROLE", async () => {
        expect(await token.hasRole(GOVERNOR_ROLE, governor.address)).to.be.true;
      });
      it("revokes the GOVERNOR_ADMIN_ROLE from the deployer", async () => {
        expect(await token.hasRole(GOVERNOR_ADMIN_ROLE, deployer.address)).to.be
          .false;
      });
      it("revokes on subsequent calls with GOVERNOR_ADMIN_ROLE access control error", async () => {
        await expect(
          token.connect(deployer).grantRole(GOVERNOR_ROLE, treasury.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(deployer.address, GOVERNOR_ADMIN_ROLE)
        );
        // Might as well make sure the whitelisted address can't call it either:
        await expect(
          token.connect(governor).grantRole(GOVERNOR_ROLE, treasury.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(governor.address, GOVERNOR_ADMIN_ROLE)
        );
      });
    });
  });

  describe("🗳  pause()", () => {
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

  describe("🗳  unpause()", () => {
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

  describe("🗳  whitelistMint()", () => {
    it("reverts with access control error when called by: deployer, dao, treasury, developer, purchaser", async () => {
      // No-one should have GOVERNOR_ROLE
      const users = [deployer, dao, treasury, developer, purchaser];
      for (let caller of users) {
        await expect(
          token.connect(caller).whitelistMint(purchaser.address, true)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(caller.address, GOVERNOR_ROLE)
        );
      }
    });

    describe("given that the governor has GOVERNOR_ROLE", () => {
      let governor: SignerWithAddress;

      beforeEach(async () => {
        governor = purchaser;
        await token
          .connect(deployer)
          .grantRole(GOVERNOR_ROLE, governor.address);
      });

      it("reverts with 'Pausable: paused' error when contract is paused", async () => {
        await token.connect(dao).pause();

        await expect(
          token.connect(governor).whitelistMint(purchaser.address, true)
        ).to.be.revertedWith("Pausable: paused");
      });

      describe("when adding an address to the whitelist", () => {
        let promise: Promise<unknown>;

        beforeEach(() => {
          promise = token
            .connect(governor)
            .whitelistMint(purchaser.address, true);
        });

        it("grants the address the MINTER_ROLE", async () => {
          await promise;
          expect(
            await token.hasRole(MINTER_ROLE, purchaser.address)
          ).to.be.equal(true);
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
          await token.connect(governor).whitelistMint(purchaser.address, true);
          promise = token
            .connect(governor)
            .whitelistMint(purchaser.address, false);
        });

        it("revokes the MINTER_ROLE from the address", async () => {
          await promise;
          expect(
            await token.hasRole(MINTER_ROLE, purchaser.address)
          ).to.be.equal(false);
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
          await token.connect(governor).whitelistMint(purchaser.address, true);
          await token.connect(governor).whitelistMint(purchaser.address, true);
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
          await token.connect(governor).whitelistMint(purchaser.address, false);
          await token.connect(governor).whitelistMint(purchaser.address, false);
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
          await token.connect(governor).whitelistMint(purchaser.address, true);
        });

        it("first should have the address in the ACTIVE_MINTS", async () => {
          const res = await token.viewMintsWhitelist();
          expect(res).to.have.members([padAddressTo32Bytes(purchaser.address)]);
        });

        it("initially the address should have the MINT_ROLE", async () => {
          expect(
            await token.hasRole(MINTER_ROLE, purchaser.address)
          ).to.be.equal(true);
        });

        describe("and subsequently removing it", () => {
          beforeEach(async () => {
            await token
              .connect(governor)
              .whitelistMint(purchaser.address, false);
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
  });

  describe("🗳  viewMintsWhitelist()", () => {
    let governor: SignerWithAddress;
    beforeEach(async () => {
      governor = purchaser;
      await token.connect(deployer).grantRole(GOVERNOR_ROLE, governor.address);
    });

    it("returns an empty array when no mints have been whitelisted", async () => {
      expect(await token.viewMintsWhitelist()).to.deep.equal([]);
    });

    it("returns an array of addresses that has been whitelisted (32 byte padded)", async () => {
      const expectedResult = [];
      const wallets = [deployer, dao, developer, purchaser];
      for (const wallet of wallets) {
        await token.connect(governor).whitelistMint(wallet.address, true);
        expectedResult.push(padAddressTo32Bytes(wallet.address));
        const whitelistedAddresses = await token.viewMintsWhitelist();
        expect(whitelistedAddresses).to.be.deep.equal(expectedResult);
      }
    });

    it("shows address added and subsequently removed", async () => {
      await token.connect(governor).whitelistMint(purchaser.address, true);
      expect(await token.viewMintsWhitelist()).to.have.members([
        padAddressTo32Bytes(purchaser.address),
      ]);
      await token.connect(governor).whitelistMint(purchaser.address, false);
      expect(await token.viewMintsWhitelist()).to.not.have.members([
        padAddressTo32Bytes(purchaser.address),
      ]);
    });
  });

  describe("🗳  mintRequest()", () => {
    it("reverts with permission error when not called with MINTER_ROLE", async () => {
      const promise = token
        .connect(purchaser)
        .mintRequest(purchaser.address, 10);
      await expect(promise).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, MINTER_ROLE)
      );
    });

    describe("when called by a whitelisted minter address", () => {
      let whitelistedAddress: SignerWithAddress;

      beforeEach(async () => {
        const governor = dao;
        whitelistedAddress = deployer;

        await token
          .connect(deployer)
          .grantRole(GOVERNOR_ROLE, governor.address);
        await token
          .connect(governor)
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
        expect(balance).to.be.equal(10);
        expect(await token.currentSupply()).to.be.equal(10);
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
          .mintRequest(treasury.address, `${ethers.constants.MaxUint256}0`);
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
        expect(await token.currentSupply()).to.be.equal(10);
        await token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, 100);
        expect(await token.currentSupply()).to.be.equal(110);
      });

      it("emits an MintRequestFulfilled event", async () => {
        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, 10);
        await expect(promise).to.emit(token, "MintRequestFulfilled");
      });

      it("can mint 2^224 - 1 tokens", async () => {
        const amount = ethers.BigNumber.from("2")
          .pow("224")
          .sub("1")
          .toString();
        await token
          .connect(whitelistedAddress)
          .mintRequest(whitelistedAddress.address, amount.toString());

        expect(await token.balanceOf(whitelistedAddress.address)).eq(amount);
      });

      it("reverts with 'ERC20Votes: total supply risks overflowing votes' error for 2^224 tokens", async () => {
        const initialSupply = await token.currentSupply();
        const amount = ethers.BigNumber.from("2").pow("224").toString();
        const request = token
          .connect(whitelistedAddress)
          .mintRequest(whitelistedAddress.address, amount.toString());
        await expect(request).to.be.revertedWith(
          "ERC20Votes: total supply risks overflowing votes"
        );
        expect(initialSupply).eq(await token.currentSupply());
      });

      it("reverts value-out-of-bounds error when trying to mint negative value", async () => {
        const amount = ethers.BigNumber.from("-2");
        const request = token
          .connect(whitelistedAddress)
          .mintRequest(whitelistedAddress.address, amount.toString());
        // await expect(request).to.be.revertedWith(
        //   'Error: value out-of-bounds (argument="_amount", value="-2", code=INVALID_ARGUMENT, version=abi/5.5.0)'
        // );
        await expect(request).to.be.reverted;
      });
    });
  });

  describe("🗳  burn()", () => {
    it("reverts with 'Pausable: paused' error if contract is paused", async () => {
      await token.connect(dao).pause();
      await expect(token.connect(dao).burn(1)).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });
});
