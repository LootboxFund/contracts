import { ethers, upgrades } from "hardhat";
import { Constants, Constants__factory } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import {
  DAO_ROLE,
  DEVELOPER_ROLE,
  generatePermissionRevokeMessage,
  generateMockAddress,
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

  describe("🗳 setTreasuryAddress()", () => {
    it("reverts with access control error when not called by the dao", async () => {
      const wallets = [deployer, developer, purchaser];
      for (let wallet of wallets) {
        // Hack - mocha and chai do not seem to have good looping capabilities
        // I.e. it would be desirable to use it.each or expect.assertions(3) similar to jest
        await expect(
          constants.connect(wallet).setTreasuryAddress(wallet.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(wallet.address, DAO_ROLE)
        );
      }
    });

    it("reverts when treasury address is zero", async () => {
      await expect(
        constants.connect(dao).setTreasuryAddress(ethers.constants.AddressZero)
      ).to.be.revertedWith("Treasury cannot be zero");
    });

    describe("when contract is paused", () => {
      beforeEach(async () => {
        await constants.connect(dao).pause();
      });

      it('reverts with "Pausable: paused" error', async () => {
        await expect(
          constants.connect(dao).setTreasuryAddress(deployer.address)
        ).to.be.revertedWith("Pausable: paused");
      });

      it("reverts with access control error when not called by the dao", async () => {
        const wallets = [deployer, developer, purchaser];
        for (let wallet of wallets) {
          // Hack - mocha and chai do not seem to have good looping capabilities
          // I.e. it would be desirable to use it.each or expect.assertions(3) similar to jest
          await expect(
            constants.connect(wallet).setTreasuryAddress(wallet.address)
          ).to.be.revertedWith(
            generatePermissionRevokeMessage(wallet.address, DAO_ROLE)
          );
        }
      });
    });

    it("successfully updates the treasury", async () => {
      const targetAddress = deployer.address;
      await constants.connect(dao).setTreasuryAddress(targetAddress);

      const updatedAddress = await constants.treasury();
      expect(updatedAddress).to.be.eq(targetAddress);
      // TODO Add another assertion that updatedAddress is payable
    });
  });

  describe("🗳 setCrowdSaleStableCoins()", () => {
    const eth = generateMockAddress("eth");
    const usdc = generateMockAddress("usdc");
    const usdt = generateMockAddress("usdt");
    const ust = generateMockAddress("ust");
    const dai = generateMockAddress("dai");

    beforeEach(async () => {
      await constants
        .connect(dao)
        .setCrowdSaleStableCoins(eth, usdc, usdt, ust, dai);
    });

    it("reverts with access control error if not called by the DAO", async () => {
      await expect(
        constants
          .connect(purchaser)
          .setCrowdSaleStableCoins(eth, usdc, usdt, ust, dai)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });

    it("reverts with pausable error when contract is paused", async () => {
      await constants.connect(dao).pause();
      await expect(
        constants
          .connect(dao)
          .setCrowdSaleStableCoins(eth, usdc, usdt, ust, dai)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("reverts when eth is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setCrowdSaleStableCoins(
            ethers.constants.AddressZero,
            usdc,
            usdt,
            ust,
            dai
          )
      ).to.be.revertedWith("ETH cannot be zero");
    });

    it("reverts when usdc is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setCrowdSaleStableCoins(
            eth,
            ethers.constants.AddressZero,
            usdt,
            ust,
            dai
          )
      ).to.be.revertedWith("USDC cannot be zero");
    });

    it("reverts when usdt is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setCrowdSaleStableCoins(
            eth,
            usdc,
            ethers.constants.AddressZero,
            ust,
            dai
          )
      ).to.be.revertedWith("USDT cannot be zero");
    });

    it("reverts when ust is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setCrowdSaleStableCoins(
            eth,
            usdc,
            usdt,
            ethers.constants.AddressZero,
            dai
          )
      ).to.be.revertedWith("UST cannot be zero");
    });

    it("reverts when dai is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setCrowdSaleStableCoins(
            eth,
            usdc,
            usdt,
            ust,
            ethers.constants.AddressZero
          )
      ).to.be.revertedWith("DAI cannot be zero");
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
    it("sets ust address", async () => {
      expect((await constants.UST_ADDRESS()).toLowerCase()).to.eq(
        ust.toLowerCase()
      );
    });
    it("sets dai address", async () => {
      expect((await constants.DAI_ADDRESS()).toLowerCase()).to.eq(
        dai.toLowerCase()
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
      await constants
        .connect(dao)
        .setOraclePriceFeeds(bnb, eth, usdc, usdt, ust, dai);
    });

    it("reverts with access control error if not called by the DAO", async () => {
      await expect(
        constants
          .connect(purchaser)
          .setOraclePriceFeeds(bnb, eth, usdc, usdt, ust, dai)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });

    it("reverts with pausable error when contract is paused", async () => {
      await constants.connect(dao).pause();
      await expect(
        constants
          .connect(dao)
          .setOraclePriceFeeds(bnb, eth, usdc, usdt, ust, dai)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("reverts when bnb is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setOraclePriceFeeds(
            ethers.constants.AddressZero,
            eth,
            usdc,
            usdt,
            ust,
            dai
          )
      ).to.be.revertedWith("BNB price feed cannot be zero");
    });

    it("reverts when eth is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setOraclePriceFeeds(
            bnb,
            ethers.constants.AddressZero,
            usdc,
            usdt,
            ust,
            dai
          )
      ).to.be.revertedWith("ETH price feed cannot be zero");
    });

    it("reverts when usdc is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setOraclePriceFeeds(
            bnb,
            eth,
            ethers.constants.AddressZero,
            usdt,
            ust,
            dai
          )
      ).to.be.revertedWith("USDC price feed cannot be zero");
    });

    it("reverts when usdt is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setOraclePriceFeeds(
            bnb,
            eth,
            usdc,
            ethers.constants.AddressZero,
            ust,
            dai
          )
      ).to.be.revertedWith("USDT price feed cannot be zero");
    });

    it("reverts when ust is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setOraclePriceFeeds(
            bnb,
            eth,
            usdc,
            usdt,
            ethers.constants.AddressZero,
            dai
          )
      ).to.be.revertedWith("UST price feed cannot be zero");
    });

    it("reverts when dai is zero", async () => {
      await expect(
        constants
          .connect(dao)
          .setOraclePriceFeeds(
            bnb,
            eth,
            usdc,
            usdt,
            ust,
            ethers.constants.AddressZero
          )
      ).to.be.revertedWith("DAI price feed cannot be zero");
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
    it("sets ust price feed", async () => {
      expect((await constants.UST_PRICE_FEED()).toLowerCase()).to.eq(
        ust.toLowerCase()
      );
    });
    it("sets dai price feed", async () => {
      expect((await constants.DAI_PRICE_FEED()).toLowerCase()).to.eq(
        dai.toLowerCase()
      );
    });
  });
});
