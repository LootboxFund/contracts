import { ethers, upgrades } from "hardhat";
import { Constants, Constants__factory } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import {
  DAO_ROLE,
  DEVELOPER_ROLE,
  generatePermissionRevokeMessage,
  generateMockAddress,
  DEFAULT_ADMIN_ROLE
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
    expect(await constants.TREASURY()).to.eq(treasury.address);
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

  it("sets a 2% guildFX minting fee", async () => {
    expect((await constants.GUILD_FX_MINTING_FEE()).toString()).to.eq("20");
    expect((await constants.GUILD_FX_MINTING_FEE_DECIMALS()).toString()).to.eq(
      "3"
    );
  });

  describe("🗳  transferGuildFXDAOAdminPrivileges()", () => {
    it("reverts for all users other than the guildDao", async () => {
      const users = [developer, treasury, purchaser, deployer];
      // TODO: Find a way to break this down with a it.each()()
      // No one can call this function
      for (let user of users) {
        // Check other generic roles
        await expect(
          constants.connect(user).transferGuildFXDAOAdminPrivileges(purchaser.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(user.address, DAO_ROLE)
        );
      }
    });

    it("does not revert when called by guild dao", async () => {
      // Make sure dao has the role
      await expect(
        constants.connect(dao).transferGuildFXDAOAdminPrivileges(purchaser.address)
      ).to.not.be.reverted;
    });

    describe("when the dao grants the DAO_ROLE to an address", () => {
      let newGuildDXDAO: SignerWithAddress;

      beforeEach(async () => {
        newGuildDXDAO = purchaser;
        await constants
          .connect(dao)
          .transferGuildFXDAOAdminPrivileges(newGuildDXDAO.address);
      });
      it("reverts when trying to assign DAO_ROLE when to a user that already has it", async () => {
        await expect(
          constants.connect(newGuildDXDAO).transferGuildFXDAOAdminPrivileges(newGuildDXDAO.address)
        ).to.be.revertedWith(
          "Account already has DAO_ROLE"
        );
      })

      it("grants the address the DAO_ROLE", async () => {
        expect(await constants.hasRole(DAO_ROLE, newGuildDXDAO.address)).to.be.true;
      });
      it("revokes the DAO_ROLE from the dao", async () => {
        expect(await constants.hasRole(DAO_ROLE, dao.address)).to.be.false;
      });
      it("revokes on subsequent calls with DAO_ROLE access control error when called by the dao", async () => {
        await expect(
          constants.connect(dao).transferGuildFXDAOAdminPrivileges(treasury.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(dao.address, DAO_ROLE)
        );
      });
      it("does not revoke when called by the new dao", async () => {
        // Might as well make sure the whitelisted address can't call it either:
        await expect(
          constants
            .connect(newGuildDXDAO)
            .transferGuildFXDAOAdminPrivileges(treasury.address)
        ).to.not.be.reverted;
      });
    });
  });

  describe("🗳  grantRole()", () => {
    it("reverts for all users when assigning a role other than DAO_ROLE", async () => {
      const users = [dao, developer, treasury, purchaser, deployer];
      const roles = [DEFAULT_ADMIN_ROLE, DEVELOPER_ROLE];
      // TODO: Find a way to break this down with a it.each()()
      // No one can call this function
      for (let user of users) {
        // Check other generic roles
        for (let role of roles) {
          await expect(
            constants.connect(user).grantRole(role, purchaser.address)
          ).to.be.revertedWith(
            generatePermissionRevokeMessage(user.address, DEFAULT_ADMIN_ROLE)
          );
        }
      }
    });

    it("reverts for all users except the dao when assigning the DAO_ROLE", async () => {
      const users = [deployer, treasury, developer, purchaser];
      for (let user of users) {
        await expect(
          constants.connect(user).grantRole(DAO_ROLE, purchaser.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(user.address, DAO_ROLE)
        );
      }
      // Make sure dao has the role
      await expect(
        constants.connect(dao).grantRole(DAO_ROLE, purchaser.address)
      ).to.not.be.reverted;
    });

    describe("when the dao grants the DAO_ROLE to an address", () => {
      let newDao: SignerWithAddress;

      beforeEach(async () => {
        newDao = purchaser;
        await constants.connect(dao).grantRole(DAO_ROLE, newDao.address);
      });
      it("reverts when trying to assign DAO_ROLE when to a user that already has it", async () => {
        await expect(
          constants.connect(newDao).grantRole(DAO_ROLE, newDao.address)
        ).to.be.revertedWith(
          "Account already has DAO_ROLE"
        );
      })
      it("grants the address the DAO_ROLE", async () => {
        expect(await constants.hasRole(DAO_ROLE, newDao.address)).to.be.true;
      });
      it("revokes the DAO_ROLE from the dao", async () => {
        expect(await constants.hasRole(DAO_ROLE, dao.address)).to.be.false;
      });
      it("revokes on subsequent calls with DAO_ROLE access control error when called by the dao", async () => {
        await expect(
          constants.connect(dao).grantRole(DAO_ROLE, treasury.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(dao.address, DAO_ROLE)
        );
      });
      it("does not revoke when called by the new dao", async () => {
        // Might as well make sure the whitelisted address can't call it either:
        await expect(
          constants.connect(newDao).grantRole(DAO_ROLE, treasury.address)
        ).to.not.be.reverted;
      });
    });
  });

  describe("🗳 setCrowdSaleStableCoins()", () => {
    const eth = generateMockAddress("eth");
    const usdc = generateMockAddress("usdc");
    const usdt = generateMockAddress("usdt");
    const ust = generateMockAddress("ust");
    const dai = generateMockAddress("dai");

    beforeEach(async () => {
      await constants.connect(dao).setCrowdSaleStableCoins(eth, usdc, usdt);
    });

    it("reverts with access control error if not called by the DAO", async () => {
      await expect(
        constants.connect(purchaser).setCrowdSaleStableCoins(eth, usdc, usdt)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });

    it("reverts with pausable error when contract is paused", async () => {
      await constants.connect(dao).pause();
      await expect(
        constants.connect(dao).setCrowdSaleStableCoins(eth, usdc, usdt)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("reverts when eth is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setCrowdSaleStableCoins(ethers.constants.AddressZero, usdc, usdt)
      ).to.be.revertedWith("ETH cannot be zero");
    });

    it("reverts when usdc is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setCrowdSaleStableCoins(eth, ethers.constants.AddressZero, usdt)
      ).to.be.revertedWith("USDC cannot be zero");
    });

    it("reverts when usdt is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setCrowdSaleStableCoins(eth, usdc, ethers.constants.AddressZero)
      ).to.be.revertedWith("USDT cannot be zero");
    });

    it("sets eth address", async () => {
      expect((await constants.ETH_ADDRESS()).toLowerCase()).to.eq(
        eth.toLowerCase()
      );
    });
    it("sets usdc address", async () => {
      expect((await constants.USDC_ADDRESS()).toLowerCase()).to.eq(
        usdc.toLowerCase()
      );
    });
    it("sets usdt address", async () => {
      expect((await constants.USDT_ADDRESS()).toLowerCase()).to.eq(
        usdt.toLowerCase()
      );
    });
  });

  describe("🗳 setOraclePriceFeeds()", () => {
    const bnb = generateMockAddress("bnb");
    const eth = generateMockAddress("eth");
    const usdc = generateMockAddress("usdc");
    const usdt = generateMockAddress("usdt");
    const ust = generateMockAddress("ust");
    const dai = generateMockAddress("dai");

    beforeEach(async () => {
      await constants.connect(dao).setOraclePriceFeeds(bnb, eth, usdc, usdt);
    });

    it("reverts with access control error if not called by the DAO", async () => {
      await expect(
        constants.connect(purchaser).setOraclePriceFeeds(bnb, eth, usdc, usdt)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });

    it("reverts with pausable error when contract is paused", async () => {
      await constants.connect(dao).pause();
      await expect(
        constants.connect(dao).setOraclePriceFeeds(bnb, eth, usdc, usdt)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("reverts when bnb is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setOraclePriceFeeds(ethers.constants.AddressZero, eth, usdc, usdt)
      ).to.be.revertedWith("BNB price feed cannot be zero");
    });

    it("reverts when eth is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setOraclePriceFeeds(bnb, ethers.constants.AddressZero, usdc, usdt)
      ).to.be.revertedWith("ETH price feed cannot be zero");
    });

    it("reverts when usdc is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setOraclePriceFeeds(bnb, eth, ethers.constants.AddressZero, usdt)
      ).to.be.revertedWith("USDC price feed cannot be zero");
    });

    it("reverts when usdt is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setOraclePriceFeeds(bnb, eth, usdc, ethers.constants.AddressZero)
      ).to.be.revertedWith("USDT price feed cannot be zero");
    });

    it("sets bnb price feed", async () => {
      expect((await constants.BNB_PRICE_FEED()).toLowerCase()).to.eq(
        bnb.toLowerCase()
      );
    });

    it("sets eth price feed", async () => {
      expect((await constants.ETH_PRICE_FEED()).toLowerCase()).to.eq(
        eth.toLowerCase()
      );
    });
    it("sets usdc price feed", async () => {
      expect((await constants.USDC_PRICE_FEED()).toLowerCase()).to.eq(
        usdc.toLowerCase()
      );
    });
    it("sets usdt price feed", async () => {
      expect((await constants.USDT_PRICE_FEED()).toLowerCase()).to.eq(
        usdt.toLowerCase()
      );
    });
  });
});
