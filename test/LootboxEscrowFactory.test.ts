import { ethers, upgrades, waffle } from "hardhat";
import {
  GuildFactory,
  GuildFactory__factory,
  GuildToken,
  GuildToken__factory,
  Constants,
  Constants__factory,
  LootboxEscrowFactory__factory,
  LootboxEscrowFactory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ContractTransaction } from "ethers";
import { padAddressTo32Bytes } from "./helpers/test-helpers";
import {
  DAO_ROLE,
  DEVELOPER_ROLE,
  GFX_STAFF_ROLE,
  GUILD_OWNER_ROLE,
  generatePermissionRevokeMessage,
  stripZeros,
  GOVERNOR_ROLE,
} from "./helpers/test-helpers";

describe("📦 LootboxEscrowFactory", () => {
  const provider = waffle.provider;

  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let gfxStaff: SignerWithAddress;
  let guildDao: SignerWithAddress;
  let guildDev: SignerWithAddress;
  let guildTreasury: SignerWithAddress;
  let affiliate: SignerWithAddress;

  let LootboxFactory: LootboxEscrowFactory__factory;
  let lootboxFactory: LootboxEscrowFactory;

  const mockNativeTokenPriceFeed = "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526";
  const ticketPurchaseFee = "2000000";
  const ticketAffiliateFee = "500000";

  before(async () => {
    LootboxFactory = await ethers.getContractFactory("LootboxEscrowFactory");
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
    gfxStaff = _gfxStaff;
    guildDao = _guildDao;
    guildDev = _guildDev;
    guildTreasury = _guildTreasury;
    affiliate = _gfxStaff;
  });

  describe.only("initialization => constructor()", async () => {
    describe("constructor args", async () => {
      it("DAO Lootbox address cannot be zero", async () => {
        const factory = upgrades.deployProxy(
          LootboxFactory,
          [
            ethers.constants.AddressZero,
            mockNativeTokenPriceFeed,
            ticketPurchaseFee,
            treasury.address,
            guildTreasury.address,
          ],
          { kind: "uups" }
        );
        expect(factory).to.be.revertedWith(
          "DAO Lootbox address canndot be zero"
        );
      });
      it("Broker address cannot be zero", async () => {
        const factory = upgrades.deployProxy(
          LootboxFactory,
          [
            dao.address,
            mockNativeTokenPriceFeed,
            ticketPurchaseFee,
            ethers.constants.AddressZero,
            guildTreasury.address,
          ],
          { kind: "uups" }
        );
        expect(factory).to.be.revertedWith("Broker address cannot be zero");
      });
      it("nativeTokenPriceFeed address cannot be zero", async () => {
        const factory = upgrades.deployProxy(
          LootboxFactory,
          [
            dao.address,
            ethers.constants.AddressZero,
            ticketPurchaseFee,
            treasury.address,
            guildTreasury.address,
          ],
          { kind: "uups" }
        );
        expect(factory).to.be.revertedWith(
          "nativeTokenPriceFeed address cannot be zero"
        );
      });
      it("Purchase ticket fee must be less than 100000000 (100%)", async () => {
        const factory = upgrades.deployProxy(
          LootboxFactory,
          [
            dao.address,
            mockNativeTokenPriceFeed,
            "100000001",
            treasury.address,
            guildTreasury.address,
          ],
          { kind: "uups" }
        );
        expect(factory).to.be.revertedWith(
          "Purchase ticket fee must be less than 100000000 (100%)"
        );
      });
    });
    describe("constructor setup", async () => {
      beforeEach(async () => {
        lootboxFactory = (await upgrades.deployProxy(
          LootboxFactory,
          [
            dao.address,
            mockNativeTokenPriceFeed,
            ticketPurchaseFee,
            treasury.address,
            ethers.constants.AddressZero,
          ],
          { kind: "uups" }
        )) as LootboxEscrowFactory;
        // await lootboxFactory.deployed();
      });
      it("should assign Lootbox DAO the DAO role", async () => {
        expect(await lootboxFactory.hasRole(DAO_ROLE, dao.address)).to.be.true;
      });
      it("should have correct nativeTokenPriceFeed address", async () => {
        expect(await lootboxFactory.nativeTokenPriceFeed()).to.equal(
          mockNativeTokenPriceFeed
        );
      });
      it("the Lootbox Implementation is public, anyone can see it", async () => {
        expect(lootboxFactory.lootboxImplementation()).to.not.be.reverted;
      });
      // it("the Broker address is hidden from public, only Lootbox DAO can see it", async () => {
      //   expect("brokerAddress" in lootboxFactory).to.be.false;
      //   const [brokerAddress, fee] = await lootboxFactory.connect(dao).checkFactoryPrivateDetails();
      //   expect(brokerAddress).to.eq(treasury.address);
      // });
      // it("the Purchase ticket fee is hidden from public, only Lootbox DAO can see it", async () => {
      //   expect("ticketPurchaseFee" in lootboxFactory).to.be.false;
      //   const [brokerAddress, fee] = await lootboxFactory.connect(dao).checkFactoryPrivateDetails();
      //   expect(fee.toString()).to.eq(ticketPurchaseFee);
      // });
    });
    describe("able to create an escrow factory with pre-set broker treasury", async () => {
      lootboxFactory = (await upgrades.deployProxy(
        LootboxFactory,
        [
          dao.address,
          mockNativeTokenPriceFeed,
          ticketPurchaseFee,
          treasury.address,
          guildTreasury.address,
        ],
        { kind: "uups" }
      )) as LootboxEscrowFactory;
      await lootboxFactory.deployed();
    });
  });

  describe("main functionality after constructor", async () => {
    const LOOTBOX_NAME = "Lootbox Name";
    const LOOTBOX_SYMBOL = "LOOTBOX";
    const SHARE_PRICE_USD = "7000000";
    const MAX_SHARES_BUY = ethers.utils.parseUnits("50000", "18").toString();
    const TICKET_PURCHASE_FEE = "2000000";
    beforeEach(async () => {
      lootboxFactory = (await upgrades.deployProxy(
        LootboxFactory,
        [
          dao.address,
          mockNativeTokenPriceFeed,
          ticketPurchaseFee,
          treasury.address,
          ethers.constants.AddressZero,
        ],
        { kind: "uups" }
      )) as LootboxEscrowFactory;
      await lootboxFactory.deployed();
    });
    describe("Actions only permitted for Lootbox DAO", async () => {
      // it("checkFactoryPrivateDetails() => only Lootbox DAO can see the private details", async () => {
      //   expect(lootboxFactory.connect(deployer).checkFactoryPrivateDetails()).to.be.revertedWith(generatePermissionRevokeMessage(deployer.address, DAO_ROLE))
      //   expect(lootboxFactory.connect(dao).checkFactoryPrivateDetails()).to.not.be.reverted;
      // })
      it("addAffiliate()", async () => {
        expect(
          lootboxFactory
            .connect(deployer)
            .addAffiliate(affiliate.address, ticketAffiliateFee)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(deployer.address, DAO_ROLE)
        );
        const tx = lootboxFactory
          .connect(dao)
          .addAffiliate(affiliate.address, ticketAffiliateFee);
        const receipt = await (await tx).wait();
        const timestamp = (await provider.getBlock(receipt.blockNumber))
          .timestamp;
        expect(tx).to.not.be.reverted;
        expect(tx)
          .to.emit(lootboxFactory, "AffiliateWhitelisted")
          .withArgs(
            affiliate.address,
            dao.address,
            ticketAffiliateFee,
            timestamp
          );
      });
      it("listAffiliates()", async () => {
        expect(
          lootboxFactory.connect(deployer).listAffiliates()
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(deployer.address, DAO_ROLE)
        );
        expect(lootboxFactory.connect(dao).listAffiliates()).to.not.be.reverted;
        expect(await lootboxFactory.connect(dao).listAffiliates()).to.deep.eq(
          []
        );
        await lootboxFactory
          .connect(dao)
          .addAffiliate(affiliate.address, ticketAffiliateFee);
        expect(await lootboxFactory.connect(dao).listAffiliates()).to.deep.eq([
          padAddressTo32Bytes(affiliate.address),
        ]);
      });
      it("checkLootboxAffiliate()", async () => {
        await lootboxFactory.createLootbox(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          MAX_SHARES_BUY,
          SHARE_PRICE_USD,
          treasury.address,
          affiliate.address
        );
        const PLUG_LOOTBOX_ADDR = deployer.address; // we dont know the actual lootbox addr unless we check the logs
        expect(
          lootboxFactory
            .connect(deployer)
            .checkLootboxAffiliate(PLUG_LOOTBOX_ADDR)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(deployer.address, DAO_ROLE)
        );
        expect(
          lootboxFactory.connect(dao).checkLootboxAffiliate(PLUG_LOOTBOX_ADDR)
        ).to.not.be.reverted;
      });
      describe("🗳 pause()", async () => {
        describe("called by address with the DAO_ROLE", () => {
          let promise: Promise<any>;

          beforeEach(async () => {
            promise = lootboxFactory.connect(dao).pause();
          });

          it("pauses the contract", async () => {
            await promise;
            expect(await lootboxFactory.paused()).to.be.equal(true);
          });

          it("emits a paused event", async () => {
            await expect(promise).to.emit(lootboxFactory, "Paused");
          });
        });

        it("reverts with access control error when called with address without DAO_ROLE", async () => {
          await expect(
            lootboxFactory.connect(purchaser).pause()
          ).to.be.revertedWith(
            generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
          );
        });
      });
      describe("🗳 unpause()", async () => {
        describe("called by address with the DAO_ROLE", function () {
          let promise: Promise<any>;

          beforeEach(async () => {
            await lootboxFactory.connect(dao).pause();
            promise = lootboxFactory.connect(dao).unpause();
          });

          it("unpauses the contract", async () => {
            await promise;
            expect(await lootboxFactory.paused()).to.be.equal(false);
          });

          it("emits an unpaused event", async () => {
            await expect(promise).to.emit(lootboxFactory, "Unpaused");
          });
        });

        it("reverts with access control error when called with address without DAO_ROLE", async () => {
          await expect(
            lootboxFactory.connect(purchaser).unpause()
          ).to.be.revertedWith(
            generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
          );
        });
      });
    });
    describe("createLootbox()", async () => {
      it("anyone can create a lootbox with custom treasury", async () => {
        expect(
          lootboxFactory.createLootbox(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            MAX_SHARES_BUY,
            SHARE_PRICE_USD,
            guildTreasury.address,
            affiliate.address
          )
        ).to.not.be.reverted;
      });
      it("a custom treasury must be provided if there is no pre-set treasury", async () => {
        expect(
          lootboxFactory.createLootbox(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            MAX_SHARES_BUY,
            SHARE_PRICE_USD,
            ethers.constants.AddressZero,
            affiliate.address
          )
        ).to.be.revertedWith("Treasury address must be provided or pre-set");
      });
      it("emits a LootboxCreated event", async () => {
        const tx = lootboxFactory
          .connect(deployer)
          .createLootbox(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            MAX_SHARES_BUY,
            SHARE_PRICE_USD,
            guildTreasury.address,
            affiliate.address
          );
        const receipt = await (await tx).wait();
        const event = receipt.events?.filter((x: any) => {
          return x.event == "LootboxCreated";
        })[0];
        const emittedLootboxAddress =
          event?.args?.lootbox || ethers.constants.AddressZero;
        expect(tx)
          .to.emit(lootboxFactory, "LootboxCreated")
          .withArgs(
            LOOTBOX_NAME,
            emittedLootboxAddress,
            deployer.address,
            guildTreasury.address,
            MAX_SHARES_BUY,
            SHARE_PRICE_USD
          );
      });
      it("properly tracks affiliates and emits an AffiliateReceipt event", async () => {
        await lootboxFactory
          .connect(dao)
          .addAffiliate(affiliate.address, ticketAffiliateFee);
        const tx = lootboxFactory
          .connect(deployer)
          .createLootbox(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            MAX_SHARES_BUY,
            SHARE_PRICE_USD,
            guildTreasury.address,
            affiliate.address
          );
        const receipt = await (await tx).wait();
        const event = receipt.events?.filter((x: any) => {
          return x.event == "AffiliateReceipt";
        })[0];
        const emittedLootboxAddress =
          event?.args?.lootbox || ethers.constants.AddressZero;

        expect(tx)
          .to.emit(lootboxFactory, "AffiliateReceipt")
          .withArgs(
            emittedLootboxAddress,
            affiliate.address,
            ticketAffiliateFee,
            ticketPurchaseFee,
            deployer.address,
            treasury.address
          );
      });
      it("safely sets the affiliate fee to zero if no affiliate was found in mapping", async () => {
        const affiliateFeeUnknownAffiliate = "0";
        const tx = lootboxFactory
          .connect(deployer)
          .createLootbox(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            MAX_SHARES_BUY,
            SHARE_PRICE_USD,
            guildTreasury.address,
            deployer.address
          );
        const receipt = await (await tx).wait();
        const event = receipt.events?.filter((x: any) => {
          return x.event == "AffiliateReceipt";
        })[0];
        const emittedLootboxAddress =
          event?.args?.lootbox || ethers.constants.AddressZero;
        expect(tx)
          .to.emit(lootboxFactory, "AffiliateReceipt")
          .withArgs(
            emittedLootboxAddress,
            deployer.address,
            affiliateFeeUnknownAffiliate,
            ticketPurchaseFee,
            deployer.address,
            treasury.address
          );
      });
    });
    it("viewLootboxes()", async () => {
      const beforeLootboxes = await lootboxFactory.connect(dao).viewLootboxes();
      expect(beforeLootboxes.length).to.eq(0);
      await lootboxFactory.createLootbox(
        LOOTBOX_NAME,
        LOOTBOX_SYMBOL,
        MAX_SHARES_BUY,
        SHARE_PRICE_USD,
        guildTreasury.address,
        affiliate.address
      );
      const afterLootboxes = await lootboxFactory.connect(dao).viewLootboxes();
      expect(afterLootboxes.length).to.eq(1);
    });
  });

  describe("tournament mode with preset treasury", async () => {
    const LOOTBOX_NAME = "Tournament Lootbox";
    const LOOTBOX_SYMBOL = "LOOTBOXT";
    const SHARE_PRICE_USD = "7000000";
    const MAX_SHARES_BUY = ethers.utils.parseUnits("50000", "18").toString();
    beforeEach(async () => {
      lootboxFactory = (await upgrades.deployProxy(
        LootboxFactory,
        [
          dao.address,
          mockNativeTokenPriceFeed,
          ticketPurchaseFee,
          treasury.address,
          guildTreasury.address,
        ],
        { kind: "uups" }
      )) as LootboxEscrowFactory;
      await lootboxFactory.deployed();
    });
    describe("createLootbox()", async () => {
      it("anyone can create a lootbox without a specified treasury", async () => {
        expect(
          lootboxFactory.createLootbox(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            MAX_SHARES_BUY,
            SHARE_PRICE_USD,
            ethers.constants.AddressZero,
            affiliate.address
          )
        ).to.not.be.reverted;
      });
      it("emits a LootboxCreated event even when giving unspecified treasury", async () => {
        const tx = lootboxFactory
          .connect(deployer)
          .createLootbox(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            MAX_SHARES_BUY,
            SHARE_PRICE_USD,
            ethers.constants.AddressZero,
            affiliate.address
          );
        const receipt = await (await tx).wait();
        const event = receipt.events?.filter((x: any) => {
          return x.event == "LootboxCreated";
        })[0];
        const emittedLootboxAddress =
          event?.args?.lootbox || ethers.constants.AddressZero;
        expect(tx)
          .to.emit(lootboxFactory, "LootboxCreated")
          .withArgs(
            LOOTBOX_NAME,
            emittedLootboxAddress,
            deployer.address,
            guildTreasury.address,
            MAX_SHARES_BUY,
            SHARE_PRICE_USD
          );
      });
      it("cannot override the preset treasury", async () => {
        const tx = lootboxFactory
          .connect(deployer)
          .createLootbox(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            MAX_SHARES_BUY,
            SHARE_PRICE_USD,
            deployer.address,
            affiliate.address
          );
        const receipt = await (await tx).wait();
        const event = receipt.events?.filter((x: any) => {
          return x.event == "LootboxCreated";
        })[0];
        const emittedLootboxAddress =
          event?.args?.lootbox || ethers.constants.AddressZero;
        expect(tx)
          .to.emit(lootboxFactory, "LootboxCreated")
          .withArgs(
            LOOTBOX_NAME,
            emittedLootboxAddress,
            deployer.address,
            guildTreasury.address,
            MAX_SHARES_BUY,
            SHARE_PRICE_USD
          );
      });
    });
  });
});
