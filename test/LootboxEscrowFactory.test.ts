import { ethers, upgrades, waffle } from "hardhat";
import {
  LootboxEscrowFactory__factory,
  LootboxEscrowFactory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import {
  DAO_ROLE,
  generatePermissionRevokeMessage,
  testLootboxURI,
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

  let LootboxFactory: LootboxEscrowFactory__factory;
  let lootboxFactory: LootboxEscrowFactory;

  const ticketPurchaseFee = "2000000";
  const BASE_URI = "https://storage.googleapis.com/lootbox-data-staging";

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
  });

  describe("initialization => constructor()", async () => {
    describe("constructor args", async () => {
      it("DAO Lootbox address cannot be zero", async () => {
        await expect(
          LootboxFactory.deploy(
            ethers.constants.AddressZero,
            ticketPurchaseFee,
            treasury.address,
            gfxStaff.address,
            BASE_URI
          )
        ).to.be.revertedWith("DAO Lootbox address cannot be zero");
      });
      it("Broker address cannot be zero", async () => {
        await expect(
          LootboxFactory.deploy(
            dao.address,
            ticketPurchaseFee,
            ethers.constants.AddressZero,
            gfxStaff.address,
            BASE_URI
          )
        ).to.be.revertedWith("Broker address cannot be zero");
      });
      it("Superstaff address cannot be zero", async () => {
        await expect(
          LootboxFactory.deploy(
            dao.address,
            ticketPurchaseFee,
            treasury.address,
            ethers.constants.AddressZero,
            BASE_URI
          )
        ).to.be.revertedWith("Superstaff address cannot be zero");
      });
      it("Purchase ticket fee must be less than 100000000 (100%)", async () => {
        await expect(
          LootboxFactory.deploy(
            dao.address,
            "100000001",
            treasury.address,
            gfxStaff.address,
            BASE_URI
          )
        ).to.be.revertedWith(
          "Purchase ticket fee must be less than 100000000 (100%)"
        );
      });
      it("Reverts if base URI is empty", async () => {
        await expect(
          LootboxFactory.deploy(
            dao.address,
            ticketPurchaseFee,
            treasury.address,
            gfxStaff.address,
            ""
          )
        ).to.be.revertedWith("Base token URI cannot be empty");
      });
    });
    describe("constructor setup", async () => {
      beforeEach(async () => {
        lootboxFactory = await LootboxFactory.deploy(
          dao.address,
          ticketPurchaseFee,
          treasury.address,
          gfxStaff.address,
          BASE_URI
        );
        await lootboxFactory.deployed();
      });
      it("should assign Lootbox DAO the DAO role", async () => {
        expect(await lootboxFactory.hasRole(DAO_ROLE, dao.address)).to.be.true;
      });
      it("the Lootbox Implementation is public, anyone can see it", async () => {
        await expect(lootboxFactory.lootboxImplementation()).to.not.be.reverted;
      });
      it("should assign the baseTokenURI parameter correctly", async () => {
        expect(await lootboxFactory.baseTokenURI()).to.eq(BASE_URI);
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
      lootboxFactory = await LootboxFactory.deploy(
        dao.address,
        ticketPurchaseFee,
        treasury.address,
        gfxStaff.address,
        BASE_URI
      );
      await lootboxFactory.deployed();
    });
  });

  describe("main functionality after constructor", async () => {
    const LOOTBOX_NAME = "Lootbox Name";
    const LOOTBOX_SYMBOL = "LOOTBOX";
    const SHARE_PRICE_USD = "5000000";
    const TARGET_SHARES_BUY = ethers.utils.parseUnits("45000", "18").toString();
    const MAX_SHARES_BUY = ethers.utils.parseUnits("50000", "18").toString();
    const TICKET_PURCHASE_FEE = "2000000";
    beforeEach(async () => {
      lootboxFactory = await LootboxFactory.deploy(
        dao.address,
        ticketPurchaseFee,
        treasury.address,
        gfxStaff.address,
        BASE_URI
      );
      await lootboxFactory.deployed();
    });
    describe("Actions only permitted for Lootbox DAO", async () => {
      // it("checkFactoryPrivateDetails() => only Lootbox DAO can see the private details", async () => {
      //   expect(lootboxFactory.connect(deployer).checkFactoryPrivateDetails()).to.be.revertedWith(generatePermissionRevokeMessage(deployer.address, DAO_ROLE))
      //   expect(lootboxFactory.connect(dao).checkFactoryPrivateDetails()).to.not.be.reverted;
      // })

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
      it("has the expected semver", async () => {
        expect(await lootboxFactory.semver()).to.eq("0.4.0-prod");
      });
      it("Name cannot be empty", async () => {
        const lootbox = lootboxFactory.createLootbox(
          "",
          LOOTBOX_SYMBOL,
          TARGET_SHARES_BUY,
          MAX_SHARES_BUY,
          guildTreasury.address,
          JSON.stringify(testLootboxURI)
        );
        await expect(lootbox).to.be.revertedWith(
          "Lootbox name cannot be empty"
        );
      });
      it("Symbol cannot be empty", async () => {
        const lootbox = lootboxFactory.createLootbox(
          LOOTBOX_NAME,
          "",
          TARGET_SHARES_BUY,
          MAX_SHARES_BUY,
          guildTreasury.address,
          JSON.stringify(testLootboxURI)
        );
        await expect(lootbox).to.be.revertedWith(
          "Lootbox symbol cannot be empty"
        );
      });
      it("Treasury cannot be the zero address", async () => {
        const lootbox = lootboxFactory.createLootbox(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          TARGET_SHARES_BUY,
          MAX_SHARES_BUY,
          ethers.constants.AddressZero,
          JSON.stringify(testLootboxURI)
        );
        await expect(lootbox).to.be.revertedWith(
          "Treasury address must be provided"
        );
      });

      it("Max shares sold must be greater than zero", async () => {
        const lootbox = lootboxFactory.createLootbox(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          TARGET_SHARES_BUY,
          "0",
          guildTreasury.address,
          JSON.stringify(testLootboxURI)
        );
        await expect(lootbox).to.be.revertedWith(
          "Max shares sold must be greater than zero"
        );
      });
      it("Target shares sold must be greater than zero", async () => {
        const lootbox = lootboxFactory.createLootbox(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          "0",
          MAX_SHARES_BUY,
          guildTreasury.address,
          JSON.stringify(testLootboxURI)
        );
        await expect(lootbox).to.be.revertedWith(
          "Target shares sold must be greater than zero"
        );
      });
      it("Max shares must be greater than or equal to target shares sold", async () => {
        const lootbox1 = lootboxFactory.createLootbox(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          "2",
          "1",
          guildTreasury.address,
          JSON.stringify(testLootboxURI)
        );
        const lootbox2 = lootboxFactory.createLootbox(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          "1",
          "1",
          guildTreasury.address,
          JSON.stringify(testLootboxURI)
        );
        await expect(lootbox1).to.be.revertedWith(
          "Max shares sold must be greater than or equal to target shares sold"
        );
        await expect(lootbox2).to.not.be.reverted;
      });

      it("anyone can create a lootbox", async () => {
        await expect(
          lootboxFactory.createLootbox(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            TARGET_SHARES_BUY,
            MAX_SHARES_BUY,
            guildTreasury.address,
            JSON.stringify(testLootboxURI)
          )
        ).to.not.be.reverted;
      });

      it("emits a LootboxCreated event", async () => {
        const tx = lootboxFactory
          .connect(deployer)
          .createLootbox(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            TARGET_SHARES_BUY,
            MAX_SHARES_BUY,
            guildTreasury.address,
            JSON.stringify(testLootboxURI)
          );
        const receipt = await (await tx).wait();
        const event = receipt.events?.filter((x: any) => {
          return x.event == "LootboxCreated";
        })[0];
        const emittedLootboxAddress =
          event?.args?.lootbox || ethers.constants.AddressZero;
        await expect(tx)
          .to.emit(lootboxFactory, "LootboxCreated")
          .withArgs(
            LOOTBOX_NAME,
            emittedLootboxAddress,
            deployer.address,
            guildTreasury.address,
            TARGET_SHARES_BUY,
            MAX_SHARES_BUY,
            JSON.stringify(testLootboxURI)
          );
      });

      it("viewLootboxes()", async () => {
        const beforeLootboxes = await lootboxFactory
          .connect(dao)
          .viewLootboxes();
        expect(beforeLootboxes.length).to.eq(0);
        await lootboxFactory.createLootbox(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          TARGET_SHARES_BUY,
          MAX_SHARES_BUY,
          guildTreasury.address,
          JSON.stringify(testLootboxURI)
        );
        const afterLootboxes = await lootboxFactory
          .connect(dao)
          .viewLootboxes();
        expect(afterLootboxes.length).to.eq(1);
      });
    });
  });
});
