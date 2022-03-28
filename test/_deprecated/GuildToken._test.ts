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
  generatePermissionRevokeMessage,
  MINTER_ROLE,
  padAddressTo32Bytes,
} from "../helpers/test-helpers";
import {
  GuildToken,
  GuildToken__factory,
  Constants,
  Constants__factory,
} from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe.skip("📦 GUILD token", async () => {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;
  let purchaser: SignerWithAddress;

  let Token: GuildToken__factory;
  let token: GuildToken;
  let Constants: Constants__factory;
  let constants: Constants;

  const tokenName = "GuildTokenTest";
  const tokenSymbol = "GUILDT";

  before(async () => {
    Token = await ethers.getContractFactory("GuildToken");
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
        tokenName,
        tokenSymbol,
        dao.address,
        developer.address,
        constants.address,
      ],
      { kind: "uups" }
    )) as GuildToken;
    await token.deployed();
  });

  it.skip("reverts initialization if fxConstants is zero", () => {});

  it(`has "${tokenName}" name`, async () => {
    expect(await token.name()).to.equal(tokenName);
  });

  it(`has "${tokenSymbol}" symbol`, async () => {
    expect(await token.symbol()).to.equal(tokenSymbol);
  });

  it("has 18 decimals", async () => {
    expect(await token.decimals()).to.be.equal(18);
  });

  it("has 0 token total supply", async () => {
    expect(await token.totalSupply()).eq(ethers.utils.parseEther("0"));
  });

  it("has stored the GuildFXConstants contract in memory", async () => {
    expect(ethers.utils.isAddress(constants.address)).to.be.true;
    expect(await token.fxConstants()).to.eq(constants.address);
  });

  it("grants the dao the DAO_ROLE", async () => {
    expect(await token.hasRole(DAO_ROLE, dao.address)).to.be.equal(true);
  });

  it("sets the GOVERNOR_ROLE as the admin role for the GOVERNOR_ROLE", async () => {
    expect(await token.getRoleAdmin(GOVERNOR_ROLE)).to.eq(GOVERNOR_ROLE);
  });

  it("grants the dao the GOVERNOR_ROLE", async () => {
    expect(await token.hasRole(GOVERNOR_ROLE, deployer.address)).to.be.equal(
      false
    );
    expect(await token.hasRole(GOVERNOR_ROLE, dao.address)).to.be.equal(true);
    expect(await token.hasRole(GOVERNOR_ROLE, developer.address)).to.be.equal(
      false
    );
    expect(await token.hasRole(GOVERNOR_ROLE, purchaser.address)).to.be.equal(
      false
    );
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

  describe("🗳  transferGovernorAdminPrivileges()", () => {
    it("reverts for all users other than the guildDao", async () => {
      const users = [developer, treasury, purchaser, deployer];
      // TODO: Find a way to break this down with a it.each()()
      // No one can call this function
      for (let user of users) {
        // Check other generic roles
        await expect(
          token.connect(user).transferGovernorAdminPrivileges(purchaser.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(user.address, GOVERNOR_ROLE)
        );
      }
    });

    it("does not revert when called by guild dao", async () => {
      // Make sure dao has the role
      await expect(
        token.connect(dao).transferGovernorAdminPrivileges(purchaser.address)
      ).to.not.be.reverted;
    });

    describe("when the dao grants the GOVERNOR_ROLE to an address", () => {
      let governor: SignerWithAddress;

      beforeEach(async () => {
        governor = purchaser;
        await token
          .connect(dao)
          .transferGovernorAdminPrivileges(governor.address);
      });
      it("reverts when trying to assign GOVERNOR_ROLE when to a user that already has it", async () => {
        await expect(
          token
            .connect(governor)
            .transferGovernorAdminPrivileges(governor.address)
        ).to.be.revertedWith("Account already has GOVERNOR_ROLE");
      });

      it("grants the address the GOVERNOR_ROLE", async () => {
        expect(await token.hasRole(GOVERNOR_ROLE, governor.address)).to.be.true;
      });
      it("revokes the GOVERNOR_ROLE from the dao", async () => {
        expect(await token.hasRole(GOVERNOR_ROLE, dao.address)).to.be.false;
      });
      it("revokes on subsequent calls with GOVERNOR_ROLE access control error when called by the dao", async () => {
        await expect(
          token.connect(dao).transferGovernorAdminPrivileges(treasury.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(dao.address, GOVERNOR_ROLE)
        );
      });
      it("does not revoke when called by the new governor", async () => {
        // Might as well make sure the whitelisted address can't call it either:
        await expect(
          token
            .connect(governor)
            .transferGovernorAdminPrivileges(treasury.address)
        ).to.not.be.reverted;
      });
    });
  });

  describe("🗳  grantRole()", () => {
    it("reverts for all users when assigning a role other than GOVERNOR_ROLE", async () => {
      const users = [dao, developer, treasury, purchaser, deployer];
      const roles = [DEFAULT_ADMIN_ROLE, MINTER_ROLE, DAO_ROLE, DEVELOPER_ROLE];
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

    it("reverts for all users except the dao when assigning the GOVERNOR_ROLE", async () => {
      const users = [deployer, treasury, developer, purchaser];
      for (let user of users) {
        await expect(
          token.connect(user).grantRole(GOVERNOR_ROLE, purchaser.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(user.address, GOVERNOR_ROLE)
        );
      }
      // Make sure dao has the role
      await expect(
        token.connect(dao).grantRole(GOVERNOR_ROLE, purchaser.address)
      ).to.not.be.reverted;
    });

    describe("when the dao grants the GOVERNOR_ROLE to an address", () => {
      let governor: SignerWithAddress;

      beforeEach(async () => {
        governor = purchaser;
        await token.connect(dao).grantRole(GOVERNOR_ROLE, governor.address);
      });
      it("reverts when trying to assign GOVERNOR_ROLE when to a user that already has it", async () => {
        await expect(
          token.connect(governor).grantRole(GOVERNOR_ROLE, governor.address)
        ).to.be.revertedWith("Account already has GOVERNOR_ROLE");
      });
      it("grants the address the GOVERNOR_ROLE", async () => {
        expect(await token.hasRole(GOVERNOR_ROLE, governor.address)).to.be.true;
      });
      it("revokes the GOVERNOR_ROLE from the dao", async () => {
        expect(await token.hasRole(GOVERNOR_ROLE, dao.address)).to.be.false;
      });
      it("revokes on subsequent calls with GOVERNOR_ROLE access control error when called by the dao", async () => {
        await expect(
          token.connect(dao).grantRole(GOVERNOR_ROLE, treasury.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(dao.address, GOVERNOR_ROLE)
        );
      });
      it("does not revoke when called by the new governor", async () => {
        // Might as well make sure the whitelisted address can't call it either:
        await expect(
          token.connect(governor).grantRole(GOVERNOR_ROLE, treasury.address)
        ).to.not.be.reverted;
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
    it("reverts with access control error when called by: deployer, treasury, developer, purchaser", async () => {
      // No-one should have GOVERNOR_ROLE
      const users = [deployer, treasury, developer, purchaser];
      for (let caller of users) {
        await expect(
          token.connect(caller).whitelistMint(purchaser.address, true)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(caller.address, GOVERNOR_ROLE)
        );
      }
    });

    it("should not revert when called by the dao", async () => {
      // No-one should have GOVERNOR_ROLE
      await expect(token.connect(dao).whitelistMint(purchaser.address, true)).to
        .not.be.reverted;
    });

    describe("given that the governor has GOVERNOR_ROLE", () => {
      let governor: SignerWithAddress;

      beforeEach(async () => {
        governor = purchaser;
        await token.connect(dao).grantRole(GOVERNOR_ROLE, governor.address);
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
      await token.connect(dao).grantRole(GOVERNOR_ROLE, governor.address);
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

  describe("🗳  burn()", () => {
    it("reverts with 'Pausable: paused' error if contract is paused", async () => {
      await token.connect(dao).pause();
      await expect(token.connect(dao).burn(1)).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });

  describe("🗳  calculateGuildFXMintFee()", () => {
    it("returns the right mintFeeAmount, mintFeeRate, treasuryAddress", async () => {
      const [mintFeeAmount, _mintFeeRate, _guildFXTreasury] =
        await token.calculateGuildFXMintFee(ethers.utils.parseUnits("98", 6));
      expect(_guildFXTreasury).to.eq(treasury.address);
      expect(ethers.utils.isAddress(_guildFXTreasury)).to.eq(true);

      expect(mintFeeAmount.toString()).to.eq(
        ethers.utils.parseUnits("2", 6).toString()
      );

      expect(_mintFeeRate.toString()).to.eq("20");
    });

    it("calculates the mint fee of 2e6 for mint request of 98e6", async () => {
      const [mintFeeAmount, _mintFeeRate, _guildFXTreasury] =
        await token.calculateGuildFXMintFee(ethers.utils.parseUnits("98", 6));
      expect(mintFeeAmount.toString()).to.eq(
        ethers.utils.parseUnits("2", 6).toString()
      );
    });

    it("calculates the mint fee of 2e18 for mint request of 98e18", async () => {
      const [mintFeeAmount] = await token.calculateGuildFXMintFee(
        ethers.utils.parseUnits("98", 18)
      );
      expect(mintFeeAmount.toString()).to.eq(
        ethers.utils.parseUnits("2", 18).toString()
      );
    });

    it("calculates the mint fee of 20e18 for mint request of 980e18", async () => {
      const [mintFeeAmount] = await token.calculateGuildFXMintFee(
        ethers.utils.parseUnits("980", 18)
      );
      expect(mintFeeAmount.toString()).to.eq(
        ethers.utils.parseUnits("20", 18).toString()
      );
    });

    it("calculates the mint fee of 2000e18 for mint request of 98000e18", async () => {
      const [mintFeeAmount] = await token.calculateGuildFXMintFee(
        ethers.utils.parseUnits("98000", 18)
      );
      expect(mintFeeAmount.toString()).to.eq(
        ethers.utils.parseUnits("2000", 18).toString()
      );
    });

    it("calculates the mint fee of 0e18 for mint request of 0e18", async () => {
      const [mintFeeAmount] = await token.calculateGuildFXMintFee(
        ethers.utils.parseUnits("0", 18)
      );
      expect(mintFeeAmount.toString()).to.eq(
        ethers.utils.parseUnits("0", 18).toString()
      );
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
      let governor: SignerWithAddress;

      beforeEach(async () => {
        governor = purchaser;
        whitelistedAddress = treasury;

        await token.connect(dao).grantRole(GOVERNOR_ROLE, governor.address);
        await token
          .connect(governor)
          .whitelistMint(whitelistedAddress.address, true);
      });

      it("reverts with 'Pausable: paused' error if contract is paused", async () => {
        await token.connect(dao).pause();
        await expect(
          token.connect(whitelistedAddress).mintRequest(purchaser.address, 10)
        ).to.be.revertedWith("Pausable: paused");
      });

      it("reverts with permission error if the address was delisted", async () => {
        await token
          .connect(governor)
          .whitelistMint(whitelistedAddress.address, false);
        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(purchaser.address, 10);
        await expect(promise).to.be.revertedWith(
          generatePermissionRevokeMessage(
            whitelistedAddress.address,
            MINTER_ROLE
          )
        );
      });

      it("reverts value-out-of-bounds error when trying to mint negative value", async () => {
        const amount = ethers.BigNumber.from("-1");
        const request = token
          .connect(whitelistedAddress)
          .mintRequest(whitelistedAddress.address, amount.toString());
        // await expect(request).to.be.revertedWith(
        //   'Error: value out-of-bounds (argument="_amount", value="-2", code=INVALID_ARGUMENT, version=abi/5.5.0)'
        // );
        await expect(request).to.be.reverted;
      });

      it("reverts with 'Cannot mint zero tokens' error when trying to mint zero", async () => {
        const amount = ethers.BigNumber.from("0");
        const request = token
          .connect(whitelistedAddress)
          .mintRequest(whitelistedAddress.address, amount.toString());
        await expect(request).to.be.revertedWith("Cannot mint zero tokens");
      });

      it("does not mint negative amount", async () => {
        const initialSupply = await token.totalSupply();
        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(purchaser.address, -1000);
        // TODO: specify revert message
        // await expect(promise).to.be.revertedWith(
        //   generateInvalidArgumentErrorMessage(-1000)
        // );
        await expect(promise).to.be.reverted;
        expect(await token.totalSupply()).to.be.equal(initialSupply);
      });

      it("does not mint fractions", async () => {
        const initialSupply = await token.totalSupply();
        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(purchaser.address, 0.1);
        // TODO: specify revert message
        // await expect(promise).to.be.revertedWith(
        //   generateInvalidArgumentErrorMessage(-1000)
        // );
        await expect(promise).to.be.reverted;
        expect(await token.totalSupply()).to.be.equal(initialSupply);
      });

      it("reverts on big number overflows", async () => {
        const initialSupply = await token.totalSupply();
        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(purchaser.address, `${ethers.constants.MaxUint256}0`);
        // TODO: specify revert message
        // await expect(promise).to.be.revertedWith(
        //   generateInvalidArgumentErrorMessage(-1000)
        // );
        await expect(promise).to.be.reverted;
        expect(await token.totalSupply()).to.be.equal(initialSupply);
      });

      it("sends the address the correct number of tokens", async () => {
        const mintAmount = ethers.utils.parseEther("100");
        await token
          .connect(whitelistedAddress)
          .mintRequest(purchaser.address, mintAmount);
        const balance = await token.balanceOf(purchaser.address);
        expect(balance).to.be.equal(mintAmount);
      });

      it("sends the GuildFXTreasury the correct number of tokens for the 2% fee", async () => {
        const mintAmount = ethers.utils.parseEther("98");
        const [mintFeeAmount] = await token.calculateGuildFXMintFee(mintAmount);
        await token
          .connect(whitelistedAddress)
          .mintRequest(purchaser.address, mintAmount);
        expect(await token.balanceOf(await constants.TREASURY())).to.be.equal(
          mintFeeAmount
        );
      });

      it("updates the total supply counter by 1000 when minting 980 tokens (includes the 2% the mint fees)", async () => {
        const mintAmount = ethers.utils.parseUnits("980", 18);
        const calculatedMintFee = ethers.utils.parseUnits("20", 18); // 2% mint fee
        const initialTotalSupply = await token.totalSupply();
        await token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, mintAmount);
        expect(await token.totalSupply()).to.be.equal(
          initialTotalSupply.add(mintAmount).add(calculatedMintFee)
        );
      });

      it("updates the total supply counter correctly for a bunch of other suquential values at 2% fee", async () => {
        const seeds = [
          {
            amount: ethers.utils.parseUnits("980", 26),
            fee: ethers.utils.parseUnits("20", 26),
          },
          {
            amount: ethers.utils.parseUnits("980", 21),
            fee: ethers.utils.parseUnits("20", 21),
          },
          {
            amount: ethers.utils.parseUnits("980", 18),
            fee: ethers.utils.parseUnits("20", 18),
          },
          {
            amount: ethers.utils.parseUnits("98", 18),
            fee: ethers.utils.parseUnits("2", 18),
          },
          {
            amount: ethers.utils.parseUnits("98", 17),
            fee: ethers.utils.parseUnits("2", 17),
          },
          {
            amount: ethers.utils.parseUnits("980", 6),
            fee: ethers.utils.parseUnits("20", 6),
          },
        ];
        for (let { amount, fee } of seeds) {
          const initialSupply = await token.totalSupply();
          await token
            .connect(whitelistedAddress)
            .mintRequest(treasury.address, amount);
          expect(await token.totalSupply()).to.be.equal(
            initialSupply.add(amount).add(fee)
          );
        }
      });

      it("emits a MintRequestFulfilled event", async () => {
        const constantsTreasuryAddress = await constants.TREASURY();
        const addAmount = ethers.utils.parseUnits("98", 18);
        const feeAmount = ethers.utils.parseUnits("2", 18);
        const feeRate = await constants.GUILD_FX_MINTING_FEE();

        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, addAmount);

        await expect(promise)
          .to.emit(token, "MintRequestFulfilled")
          .withArgs(
            whitelistedAddress.address,
            treasury.address,
            constantsTreasuryAddress,
            addAmount,
            feeRate,
            addAmount.add(feeAmount).toString()
          );
      });

      it("can mint below 2^224 - 1 total supply threshold without reverting on overflow", async () => {
        // TODO: test boundary points

        const maxSupply = ethers.BigNumber.from("2").pow("224").sub(1);

        const amount = ethers.BigNumber.from(
          maxSupply.toString().slice(0, maxSupply.toString().length - 1)
        );
        const [mintFeeAmount, mintFeeRate, guildFXTreasury] =
          await token.calculateGuildFXMintFee(amount);

        await token
          .connect(whitelistedAddress)
          .mintRequest(purchaser.address, amount);

        expect(await token.balanceOf(purchaser.address)).eq(amount);
        const treasuryBalance = await token.balanceOf(
          await constants.TREASURY()
        );
        expect(treasuryBalance.toString()).eq(mintFeeAmount);
      });
    });
  });
});