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
import {
  GuildToken,
  GuildToken__factory,
  Constants,
  Constants__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

describe("📦 GUILD token", async () => {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;
  let purchaser: SignerWithAddress;

  let Token: GuildToken__factory;
  let token: GuildToken;
  let Constants: Constants__factory;
  let constants: Constants;
  const GUILD_FX_MINTING_FEE = 20;

  const tokenName = "GuildTokenTest";
  const tokenSymbol = "GUILDT";

  before(async () => {
    Token = await ethers.getContractFactory("GuildToken");
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

  it("has 1000 tokens total supply", async () => {
    expect(await token.totalSupply()).eq(ethers.utils.parseEther("1000"));
  });

  it("initialization: mints 1000 tokens to the DAO", async () => {
    expect(await token.balanceOf(dao.address)).to.eq(
      ethers.utils.parseEther("1000")
    );
  });

  it.skip("initialization: mints 20 tokens (2%) to GuildFX treasury", async () => {
    expect(await token.balanceOf(await constants.TREASURY())).to.eq(
      ethers.utils.parseEther("20")
    );
  });

  it("has stored the GuildFXConstants contract in memory", async () => {
    expect(ethers.utils.isAddress(constants.address)).to.be.true;
    expect(await token.fxConstants()).to.eq(constants.address);
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

  describe("🗳  burn()", () => {
    it("reverts with 'Pausable: paused' error if contract is paused", async () => {
      await token.connect(dao).pause();
      await expect(token.connect(dao).burn(1)).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });

  describe("🗳  calculateGuildFXMintFee()", () => {
    it("calculates the mint fee of 2e6 for mint request of 98e6", async () => {
      const [mintFeeAmount] = await token.calculateGuildFXMintFee(
        ethers.utils.parseUnits("98", 6)
      );
      console.log(mintFeeAmount);
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
          token.connect(whitelistedAddress).mintRequest(purchaser.address, 10)
        ).to.be.revertedWith("Pausable: paused");
      });

      it("reverts with permission error if the address was delisted", async () => {
        await token
          .connect(dao)
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

      it("reverts with 'ERC20Votes: total supply risks overflowing votes' error for 2^224 tokens", async () => {
        const initialSupply = await token.totalSupply();
        const amount = ethers.BigNumber.from("2").pow("224").toString();
        const request = token
          .connect(whitelistedAddress)
          .mintRequest(whitelistedAddress.address, amount.toString());
        await expect(request).to.be.revertedWith(
          "ERC20Votes: total supply risks overflowing votes"
        );
        expect(initialSupply).eq(await token.totalSupply());
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
        const mintFees = await token.calculateGuildFXMintFee(mintAmount);
        await token
          .connect(whitelistedAddress)
          .mintRequest(purchaser.address, mintAmount);
        const balance = await token.balanceOf(purchaser.address);
        expect(balance).to.be.equal(mintAmount);
      });

      it("sends the GuildFXTreasury the correct number of tokens for the 2% fee", async () => {
        const mintAmount = ethers.utils.parseEther("100");
        const mintFees = await token.calculateGuildFXMintFee(mintAmount);
        await token
          .connect(whitelistedAddress)
          .mintRequest(purchaser.address, mintAmount);
        expect(await token.balanceOf(await constants.TREASURY())).to.be.equal(
          mintFees
        );
      });

      it("updates the total supply counter by 1020 when minting 1000 tokens (includes the 2% the mint fees)", async () => {
        const mintAmount = ethers.utils.parseUnits("1000", 18);
        const calculatedMintFee = ethers.utils.parseUnits("20", 18); // 2% mint fee
        const initialTotalSupply = await token.totalSupply();
        expect(initialTotalSupply).to.be.equal(ethers.utils.parseEther("1000"));
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
            amount: ethers.utils.parseUnits("1000", 26),
            fee: ethers.utils.parseUnits("20", 26),
          },
          {
            amount: ethers.utils.parseUnits("1000", 21),
            fee: ethers.utils.parseUnits("20", 21),
          },
          {
            amount: ethers.utils.parseUnits("1000", 18),
            fee: ethers.utils.parseUnits("20", 18),
          },
          {
            amount: ethers.utils.parseUnits("100", 18),
            fee: ethers.utils.parseUnits("2", 18),
          },
          {
            amount: ethers.utils.parseUnits("100", 17),
            fee: ethers.utils.parseUnits("2", 17),
          },
          {
            amount: ethers.utils.parseUnits("1000", 6),
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
        const addAmount = ethers.utils.parseUnits("100", 18);
        const feeAmount = ethers.utils.parseUnits("2", 18);

        const promise = token
          .connect(whitelistedAddress)
          .mintRequest(treasury.address, addAmount);

        await expect(promise)
          .to.emit(token, "MintRequestFulfilled")
          .withArgs(
            deployer.address,
            treasury.address,
            constantsTreasuryAddress,
            addAmount.toString(),
            feeAmount.toString()
          );
      });

      it("can mint below 2^224 - 1 total supply threshold without reverting on overflow", async () => {
        const maxSupply = ethers.BigNumber.from("2").pow("224").sub(1);
        const mintFeeDecimals = ethers.BigNumber.from("3");
        const mintingFee = ethers.utils.parseUnits("20", mintFeeDecimals);

        // TODO: test boundary points
        // I Could not get the calculations exact...
        //
        // let x be the _mintAmount (aka amount)
        //
        // 2^224 - 1 = 98/100 * x + 2/100 * feeAmount     ;     Since feeAmount(x) = x * _mintFee / 10e^mintDecimals
        // ==>
        // 2^224 - 1 = 98/100 * x + 2/100 * x * _mintFee / 10e^_mintDecimals
        // ==>
        // x :=: amount = (2^224 - 1) / (98/100 + 2/100 * _mintFee / 10e^_mintDecimals)

        // const denominator = ethers.utils
        //   .parseUnits("980", mintFeeDecimals)
        //   .add(
        //     ethers.utils
        //       .parseUnits("20", mintFeeDecimals)
        //       .mul(mintingFee)
        //       .div(ethers.BigNumber.from("10").pow(mintFeeDecimals))
        //   )
        //   .div(ethers.BigNumber.from("10").pow(mintFeeDecimals));

        // const amount = maxSupply.div(denominator);
        // const calculatedFee = await token.calculateGuildFXMintFee(amount);

        const amount = ethers.BigNumber.from(
          maxSupply.toString().slice(0, maxSupply.toString().length - 1)
        );
        const calculatedFee = await token.calculateGuildFXMintFee(amount);

        await token
          .connect(whitelistedAddress)
          .mintRequest(whitelistedAddress.address, amount);

        expect(await token.balanceOf(whitelistedAddress.address)).eq(amount);
        expect(await token.balanceOf(await constants.TREASURY())).eq(
          calculatedFee
        );
      });

      it("reverts with 'ERC20Votes: total supply risks overflowing votes' error if more that 2^224 -1 tokens are minted", async () => {
        const maxSupply = ethers.BigNumber.from("2").pow("224").sub(1);
        const mintFeeDecimals = ethers.BigNumber.from("3");
        const mintingFee = ethers.utils.parseUnits("20", mintFeeDecimals);

        // TODO: test boundary points
        // I Could not get the calculations exact...
        //
        // let x be the _mintAmount (aka amount)
        //
        // 2^224 - 1 = 98/100 * x + 2/100 * feeAmount     ;     Since feeAmount(x) = x * _mintFee / 10e^mintDecimals
        // ==>
        // 2^224 - 1 = 98/100 * x + 2/100 * x * _mintFee / 10e^_mintDecimals
        // ==>
        // x :=: amount = (2^224 - 1) / (98/100 + 2/100 * _mintFee / 10e^_mintDecimals)

        // const denominator = ethers.utils
        //   .parseUnits("980", mintFeeDecimals)
        //   .add(ethers.utils.parseUnits("20", mintFeeDecimals).mul(mintingFee));

        // // #### cause overflow here: ####
        // const amount = maxSupply.div(denominator).add("1");
        // const estimatedFee = await token.calculateGuildFXMintFee(amount);
        const amount = maxSupply;

        const request = token
          .connect(whitelistedAddress)
          .mintRequest(whitelistedAddress.address, amount.toString());

        // console.log("TOTAL SUPPLY", (await token.totalSupply()).toString());

        await expect(request).to.be.revertedWith(
          "ERC20Votes: total supply risks overflowing votes"
        );
      });
    });
  });
});
