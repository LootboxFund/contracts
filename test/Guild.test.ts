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
// @ts-ignore Seems like they don't have any type declarations at this time
import { constants } from "@openzeppelin/test-helpers";
import {
  convertTokenToWei,
  DAO_ROLE,
  DEFAULT_ADMIN_ROLE,
  DEVELOPER_ROLE,
  generatePermissionRevokeMessage,
  MINTER_ROLE,
  padAddressTo32Bytes,
  REBASE_ROLE,
} from "./helpers/test-helpers";

declare module "mocha" {
  export interface Suite {
    // TODO: get explicit typing
    GuildToken: any;
    token: any;
  }
}

describe("📦 GUILD token", async function () {
  let deployer: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;
  let Token: any;
  let token: any;

  before(async function () {
    Token = await ethers.getContractFactory("GuildToken");
  });

  beforeEach(async function () {
    [deployer, addr1, addr2, addr3] = await ethers.getSigners();
    token = await upgrades.deployProxy(Token, { kind: "uups" });
    await token.deployed();
  });

  it("has GuildToken name", async function () {
    expect(await token.name()).to.equal("GuildToken");
  });

  it("has GUILD symbol", async function () {
    expect(await token.symbol()).to.equal("GUILD");
  });

  it("has 18 decimals", async function () {
    expect(await token.decimals()).to.be.equal(18);
  });

  it("grants the deployer the DEFAULT_ADMIN_ROLE", async function () {
    expect(
      await token.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)
    ).to.be.equal(true);
  });

  it("grants the deployer the DAO_ROLE", async function () {
    expect(await token.hasRole(DAO_ROLE, deployer.address)).to.be.equal(true);
  });

  it("grants the deployer the DEVELOPER_ROLE", async function () {
    expect(await token.hasRole(DEVELOPER_ROLE, deployer.address)).to.be.equal(
      true
    );
  });

  it("stores the deployer address as the originalDeployer", async function () {
    expect(await token.originalDeployer()).to.be.equal(deployer.address);
  });

  describe("transferOwnershipToDAO()", function () {
    it("reverts with DEFAULT_ADMIN_ROLE permission error if not called by the deployer", async function () {
      await expect(
        token
          .connect(addr1)
          .transferOwnershipToDAO(addr1.address, addr2.address)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(addr1.address, DEFAULT_ADMIN_ROLE)
      );
    });

    it("reverts when called with a null dao address", async function () {
      await expect(
        token.transferOwnershipToDAO(constants.ZERO_ADDRESS, addr2.address)
      ).to.be.revertedWith("DAO address must not be 0");
    });

    it("reverts when called with a null developer address", async function () {
      await expect(
        token.transferOwnershipToDAO(addr1.address, constants.ZERO_ADDRESS)
      ).to.be.revertedWith("Developer address must not be 0");
    });

    describe("given the deployer calls with non-null paramaters", function () {
      let promise: Promise<void>;

      beforeEach(function () {
        promise = token
          .connect(deployer)
          .transferOwnershipToDAO(addr1.address, addr2.address);
      });

      it("does not revert", async function () {
        await expect(promise).to.not.be.reverted;
      });

      it("correctly assigns the DAO_ROLE", async function () {
        await promise;
        expect(await token.hasRole(DAO_ROLE, addr1.address)).to.be.equal(true);
      });

      it("correctly assigns the DEVELOER_ROLE", async function () {
        await promise;
        expect(await token.hasRole(DEVELOPER_ROLE, addr2.address)).to.be.equal(
          true
        );
      });

      it("removes the deployer from the DEFAULT_ADMIN_ROLE", async function () {
        await promise;
        expect(
          await token.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)
        ).to.be.equal(false);
      });

      it("removes the deployer from the DAO_ROLE", async function () {
        await promise;
        expect(await token.hasRole(DAO_ROLE, deployer.address)).to.be.equal(
          false
        );
      });

      it("removes the deployer from the DEVELOPER_ROLE", async function () {
        await promise;
        expect(
          await token.hasRole(DEVELOPER_ROLE, deployer.address)
        ).to.be.equal(false);
      });
    });

    describe("given its called twice by the deployer", function () {
      let promise: Promise<void>;

      beforeEach(async function () {
        await token
          .connect(deployer)
          .transferOwnershipToDAO(addr1.address, addr2.address);

        promise = token
          .connect(deployer)
          .transferOwnershipToDAO(addr1.address, addr2.address);
      });

      it("reverts on the second time because of permission error (since deployer is no longer DEFAULT_ADMIN)", async function () {
        await expect(promise).to.be.revertedWith(
          generatePermissionRevokeMessage(deployer.address, DEFAULT_ADMIN_ROLE)
        );
      });
    });
  });

  describe("pause()", function () {
    describe("called by address with the DAO_ROLE", function () {
      let promise: Promise<void>;

      beforeEach(async function () {
        await token.grantRole(DAO_ROLE, addr1.address);
        promise = token.connect(addr1).pause();
      });

      it("pauses the contract", async function () {
        await promise;
        expect(await token.paused()).to.be.equal(true);
      });

      it("emits a paused event", async function () {
        await expect(promise).to.emit(token, "Paused");
      });
    });

    describe("called by address without the DAO_ROLE", function () {
      let promise: Promise<void>;

      beforeEach(async function () {
        await token.revokeRole(DAO_ROLE, addr1.address);
        promise = token.connect(addr1).pause();
      });

      it("reverts with access control error", async function () {
        await expect(promise).to.be.revertedWith(
          generatePermissionRevokeMessage(addr1.address, DAO_ROLE)
        );
      });
    });
  });

  describe("unpause()", function () {
    describe("called by address with the DAO_ROLE", function () {
      let promise: Promise<void>;

      beforeEach(async function () {
        await token.grantRole(DAO_ROLE, addr1.address);
        await token.connect(addr1).pause();
        promise = token.connect(addr1).unpause();
      });

      it("unpauses the contract", async function () {
        await promise;
        expect(await token.paused()).to.be.equal(false);
      });

      it("emits an unpaused event", async function () {
        await expect(promise).to.emit(token, "Unpaused");
      });
    });

    describe("called by address without the DAO_ROLE", function () {
      let promise: Promise<void>;

      beforeEach(async function () {
        await token.grantRole(DAO_ROLE, addr1.address);
        await token.connect(addr1).pause();
        await token.revokeRole(DAO_ROLE, addr1.address);
        promise = token.connect(addr1).unpause();
      });

      it("reverts with with access control error", async function () {
        await expect(promise).to.be.revertedWith(
          generatePermissionRevokeMessage(addr1.address, DAO_ROLE)
        );
      });
    });
  });

  describe("whitelistMint()", function () {
    describe("called by an address without the DAO_ROLE", function () {
      let promise: Promise<void>;

      beforeEach(async function () {
        await token.revokeRole(DAO_ROLE, addr1.address);
        promise = token.connect(addr1).whitelistMint(addr2.address, true);
      });

      it("reverts with access control error", async function () {
        await expect(promise).to.be.revertedWith(
          generatePermissionRevokeMessage(addr1.address, DAO_ROLE)
        );
      });
    });

    describe("called by an address with the DAO_ROLE", function () {
      beforeEach(async function () {
        await token.grantRole(DAO_ROLE, addr1.address);
      });

      describe("when contract is paused", function () {
        it("reverts with 'Pausable: paused' error", async function () {
          await token.pause();

          await expect(
            token.connect(addr1).whitelistMint(addr2.address, true)
          ).to.be.revertedWith("Pausable: paused");
        });
      });

      describe("when parameter 'isActive' is true", function () {
        let promise: Promise<void>;

        beforeEach(function () {
          promise = token.connect(addr1).whitelistMint(addr2.address, true);
        });

        it("grants the address the MINTER_ROLE", async function () {
          await promise;
          expect(await token.hasRole(MINTER_ROLE, addr2.address)).to.be.equal(
            true
          );
        });

        it("adds the address to the ACTIVE_MINTS", async function () {
          await promise;
          const mintsWhitelist = await token.viewMintsWhitelist();
          expect(mintsWhitelist).to.have.members([
            padAddressTo32Bytes(addr2.address),
          ]);
        });

        it("emits a MintACLUpdated event", async function () {
          await expect(promise).to.emit(token, "MintACLUpdated");
        });

        it("increments the cumulativeMintsWhitelisted variable", async function () {
          const initlaCumulativeMintsWhitelisted =
            await token.cumulativeMintsWhitelisted();
          await promise;
          expect(await token.cumulativeMintsWhitelisted()).to.be.equal(
            initlaCumulativeMintsWhitelisted + 1
          );
        });
      });

      describe("when parameter 'isActive' is false", function () {
        let promise: Promise<void>;

        beforeEach(async function () {
          await token.grantRole(MINTER_ROLE, addr2.address);
          promise = token.connect(addr1).whitelistMint(addr2.address, false);
        });

        it("revokes the MINTER_ROLE from the address", async function () {
          await promise;
          expect(await token.hasRole(MINTER_ROLE, addr2.address)).to.be.equal(
            false
          );
        });

        it("removes the address from the ACTIVE_MINTS", async function () {
          await promise;
          const mintsWhitelist = await token.viewMintsWhitelist();
          expect(mintsWhitelist).to.not.have.members([
            padAddressTo32Bytes(addr2.address),
          ]);
        });

        it("emits a MintACLUpdated event", async function () {
          await expect(promise).to.emit(token, "MintACLUpdated");
        });

        it("does not change the cumulativeMintsWhitelisted variable", async function () {
          const initlaCumulativeMintsWhitelisted =
            await token.cumulativeMintsWhitelisted();
          await promise;
          expect(await token.cumulativeMintsWhitelisted()).to.be.equal(
            initlaCumulativeMintsWhitelisted
          );
        });
      });

      describe("when adding an address twice", function () {
        beforeEach(async function () {
          await token.whitelistMint(addr2.address, true);
          await token.whitelistMint(addr2.address, true);
        });

        it("only has one entry in the ACTIVE MINTS", async function () {
          const mintsWhitelist = await token.viewMintsWhitelist();
          const addresses = mintsWhitelist.filter(
            (address: string) => address === padAddressTo32Bytes(addr2.address)
          );
          expect(addresses).to.have.length(1);
        });

        it("address has the MINTER_ROLE", async function () {
          expect(await token.hasRole(MINTER_ROLE, addr2.address)).to.equal(
            true
          );
        });

        it("double counts the cumulativeMintsWhitelisted", async function () {
          expect(await token.cumulativeMintsWhitelisted()).to.be.equal(2);
        });
      });

      describe("when removing an address twice", function () {
        beforeEach(async function () {
          await token.whitelistMint(addr2.address, false);
          await token.whitelistMint(addr2.address, false);
        });

        it("does not add the address to the ACTIVE_MINTS", async function () {
          const mintsWhitelist = await token.viewMintsWhitelist();
          expect(mintsWhitelist).to.not.have.members([
            padAddressTo32Bytes(addr2.address),
          ]);
        });

        it("address does not have the MINTER_ROLE", async function () {
          expect(await token.hasRole(MINTER_ROLE, addr2.address)).to.equal(
            false
          );
        });
      });

      describe("when adding an address", function () {
        beforeEach(async function () {
          await token.whitelistMint(addr2.address, true);
        });

        it("first should have the address in the ACTIVE_MINTS", async function () {
          const res = await token.viewMintsWhitelist();
          expect(res).to.have.members([padAddressTo32Bytes(addr2.address)]);
        });

        it("initially the address should have the MINT_ROLE", async function () {
          expect(await token.hasRole(MINTER_ROLE, addr2.address)).to.be.equal(
            true
          );
        });

        describe("and subsequently removing it", function () {
          beforeEach(async function () {
            await token.whitelistMint(addr2.address, false);
          });

          it("removes address from MINTER_ROLE", async function () {
            expect(await token.hasRole(MINTER_ROLE, addr2.address)).to.be.equal(
              false
            );
          });

          it("does not have the address in the ACTIVE_MINTS", async function () {
            const res = await token.viewMintsWhitelist();
            expect(res).to.not.have.members([
              padAddressTo32Bytes(addr2.address),
            ]);
          });
        });
      });
    });
  });

  describe("viewMintsWhitelist()", function () {
    it("returns an empty array when no mints have been whitelisted", async function () {
      expect(await token.viewMintsWhitelist()).to.deep.equal([]);
    });

    it("returns an array of addresses that has been whitelisted (32 byte padded)", async function () {
      const expectedResult = [];
      const wallets = [addr1, addr2, addr3];
      for (const wallet of wallets) {
        await token.whitelistMint(wallet.address, true);
        expectedResult.push(padAddressTo32Bytes(wallet.address));
        const whitelistedAddresses = await token.viewMintsWhitelist();
        expect(whitelistedAddresses).to.be.deep.equal(expectedResult);
      }
    });

    it("shows address added and subsequently removed", async function () {
      await token.whitelistMint(addr1.address, true);
      expect(await token.viewMintsWhitelist()).to.have.members([
        padAddressTo32Bytes(addr1.address),
      ]);
      await token.whitelistMint(addr1.address, false);
      expect(await token.viewMintsWhitelist()).to.not.have.members([
        padAddressTo32Bytes(addr1.address),
      ]);
    });
  });


  describe("mintRequest()", function () {
    it("reverts with permission error when not called with MINTER_ROLE", async function () {
      const promise = token.connect(addr2).mintRequest(addr1.address, 10);
      await expect(promise).to.be.revertedWith(
        generatePermissionRevokeMessage(addr2.address, MINTER_ROLE)
      );
    });

    describe("when called with the MINTER_ROLE without being whitelisted", function () {
      beforeEach(async function () {
        await token.grantRole(MINTER_ROLE, addr1.address);
      });

      it("reverts with 'Pausable: paused' error if contract is paused", async function () {
        await token.connect(deployer).pause();
        await expect(
          token.connect(addr1).mintRequest(addr2.address, 10)
        ).to.be.revertedWith("Pausable: paused");
      });

      it("reverts when the mint has not been whitelisted", async function () {
        const promise = token.connect(addr1).mintRequest(addr2.address, 10);
        await expect(promise).to.be.revertedWith(
          "Address must be whitelisted to request a mint"
        );
      });
    });

    describe("when called by a whitelisted address", function () {
      beforeEach(async function () {
        await token.whitelistMint(addr1.address, true);
      });

      it("reverts with permission error if the address was delisted", async function () {
        await token.whitelistMint(addr1.address, false);
        const promise = token.connect(addr1).mintRequest(addr2.address, 10);
        await expect(promise).to.be.revertedWith(
          generatePermissionRevokeMessage(addr1.address, MINTER_ROLE)
        );
      });

      it("sends the address the correct number of tokens", async function () {
        await token.connect(addr1).mintRequest(addr2.address, 10);
        const balance = await token.balanceOf(addr2.address);
        expect(balance).to.be.equal(convertTokenToWei(10));
        expect(await token.currentSupply()).to.be.equal(convertTokenToWei(10));
      });

      it("does not mint negative amount", async function () {
        const initialSupply = await token.currentSupply();
        const promise = token.connect(addr1).mintRequest(addr2.address, -1000);
        // TODO: specify revert message
        // await expect(promise).to.be.revertedWith(
        //   generateInvalidArgumentErrorMessage(-1000)
        // );
        await expect(promise).to.be.reverted;
        expect(await token.currentSupply()).to.be.equal(initialSupply);
      });

      it("does not mint fractions", async function () {
        const initialSupply = await token.currentSupply();
        const promise = token.connect(addr1).mintRequest(addr2.address, 0.1);
        // TODO: specify revert message
        // await expect(promise).to.be.revertedWith(
        //   generateInvalidArgumentErrorMessage(-1000)
        // );
        await expect(promise).to.be.reverted;
        expect(await token.currentSupply()).to.be.equal(initialSupply);
      });

      it("reverts on big number overflows", async function () {
        const initialSupply = await token.currentSupply();
        const promise = token
          .connect(addr1)
          .mintRequest(addr2.address, `${constants.MAX_UINT256}0`);
        // TODO: specify revert message
        // await expect(promise).to.be.revertedWith(
        //   generateInvalidArgumentErrorMessage(-1000)
        // );
        await expect(promise).to.be.reverted;
        expect(await token.currentSupply()).to.be.equal(initialSupply);
      });

      it("updates the current supply counter", async function () {
        expect(await token.currentSupply()).to.be.equal(0);
        await token.connect(addr1).mintRequest(addr2.address, 10);
        expect(await token.currentSupply()).to.be.equal(convertTokenToWei(10));
        await token.connect(addr1).mintRequest(addr2.address, 100);
        expect(await token.currentSupply()).to.be.equal(convertTokenToWei(110));
      });

      it("emits an MintRequestFulfilled event", async function () {
        const promise = token.connect(addr1).mintRequest(addr2.address, 10);
        await expect(promise).to.emit(token, "MintRequestFulfilled");
      });
    });
  });


  describe("burn()", function () {

    describe("when called by the DAO_ROLE", function () {
      beforeEach(async function () {
        await token.grantRole(DAO_ROLE, addr1.address);n
      });
      it("reverts with 'Pausable: paused' error if contract is paused", async function () {
        await token.pause();

        await expect(token.burn(1)).to.be.revertedWith(
          "Pausable: paused"
        );
      });

    });
  });
});
