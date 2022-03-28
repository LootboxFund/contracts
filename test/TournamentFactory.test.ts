import { ethers, upgrades, waffle } from "hardhat";
import { TournamentFactory__factory, TournamentFactory } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
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

describe.only("📦 LootboxInstantFactory", () => {
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

  let LootboxFactory: TournamentFactory__factory;
  let lootboxFactory: TournamentFactory;

  const mockNativeTokenPriceFeed = "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526";
  const ticketPurchaseFee = "2000000";

  before(async () => {
    LootboxFactory = await ethers.getContractFactory("TournamentFactory");
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

  describe("initialization => constructor()", async () => {
    describe("constructor args", async () => {
      it("DAO Lootbox address cannot be zero", async () => {
        await expect(
          LootboxFactory.deploy(
            ethers.constants.AddressZero,
            mockNativeTokenPriceFeed,
            ticketPurchaseFee,
            treasury.address
          )
        ).to.be.revertedWith("DAO Lootbox address cannot be zero");
      });
      it("Broker address cannot be zero", async () => {
        await expect(
          LootboxFactory.deploy(
            dao.address,
            mockNativeTokenPriceFeed,
            ticketPurchaseFee,
            ethers.constants.AddressZero
          )
        ).to.be.revertedWith("Broker address cannot be zero");
      });
      it("nativeTokenPriceFeed address cannot be zero", async () => {
        await expect(
          LootboxFactory.deploy(
            dao.address,
            ethers.constants.AddressZero,
            ticketPurchaseFee,
            treasury.address
          )
        ).to.be.revertedWith("nativeTokenPriceFeed address cannot be zero");
      });
      it("Purchase ticket fee must be less than 100000000 (100%)", async () => {
        await expect(
          LootboxFactory.deploy(
            dao.address,
            mockNativeTokenPriceFeed,
            "100000001",
            treasury.address
          )
        ).to.be.revertedWith(
          "Purchase ticket fee must be less than 100000000 (100%)"
        );
      });
    });
    describe("constructor setup", async () => {
      beforeEach(async () => {
        lootboxFactory = await LootboxFactory.deploy(
          dao.address,
          mockNativeTokenPriceFeed,
          ticketPurchaseFee,
          treasury.address
        );
        await lootboxFactory.deployed();
      });
      it("should assign Lootbox DAO the DAO role", async () => {
        expect(await lootboxFactory.hasRole(DAO_ROLE, dao.address)).to.be.true;
      });
      it("should have correct nativeTokenPriceFeed address", async () => {
        expect(await lootboxFactory.nativeTokenPriceFeed()).to.equal(
          mockNativeTokenPriceFeed
        );
      });
      it("the ticketPurchaseFee is set & public, anyone can see it", async () => {
        expect(lootboxFactory.ticketPurchaseFee()).to.equal(ticketPurchaseFee);
      });
      it("the brokerAddress is set & public, anyone can see it", async () => {
        expect(lootboxFactory.brokerAddress()).to.equal(treasury.address);
      });
    });
  });

  describe.skip("main functionality after constructor", async () => {
    const TOURNAMENT_NAME = "Tournament Name";
    beforeEach(async () => {
      lootboxFactory = await LootboxFactory.deploy(
        dao.address,
        mockNativeTokenPriceFeed,
        ticketPurchaseFee,
        treasury.address
      );
      await lootboxFactory.deployed();
    });
    describe("Actions only permitted for Lootbox DAO", async () => {
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
      it("anyone can create a lootbox", async () => {
        expect(
          lootboxFactory.createTournament(
            TOURNAMENT_NAME,
            guildTreasury.address
          )
        ).to.not.be.reverted;
      });
      it("emits a TournamentCreated event", async () => {
        const tx = lootboxFactory
          .connect(deployer)
          .createTournament(TOURNAMENT_NAME, guildTreasury.address);
        const receipt = await (await tx).wait();
        const event = receipt.events?.filter((x) => {
          return x.event == "TournamentCreated";
        })[0];
        const emittedTournamentAddress =
          event?.args?.lootbox || ethers.constants.AddressZero;
        expect(tx)
          .to.emit(lootboxFactory, "TournamentCreated")
          .withArgs(
            TOURNAMENT_NAME,
            emittedTournamentAddress,
            deployer.address,
            guildTreasury.address,
            dao.address
          );
      });
    });
    it("viewTournaments()", async () => {
      const beforeTournaments = await lootboxFactory
        .connect(dao)
        .viewTournaments();
      expect(beforeTournaments.length).to.eq(0);
      await lootboxFactory.createTournament(
        TOURNAMENT_NAME,
        guildTreasury.address
      );
      const afterTournaments = await lootboxFactory
        .connect(dao)
        .viewTournaments();
      expect(afterTournaments.length).to.eq(1);
    });
  });
});
