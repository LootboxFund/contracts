import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  DAO_ROLE,
  generatePermissionRevokeMessage,
  GOVERNOR_ROLE,
  MINTER_ROLE,
} from "./helpers/test-helpers";

/* eslint-disable */
import {
  BNB,
  BNB__factory,
  Constants,
  Constants__factory,
  CrowdSale,
  CrowdSale__factory,
  ETH,
  ETH__factory,
  GuildToken,
  GuildToken__factory,
  USDC,
  USDC__factory,
  USDT,
  USDT__factory,
  Lootbox,
  Lootbox__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

const BNB_ARCHIVED_PRICE = "51618873955";

describe("📦 CrowdSale of GUILD token", async function () {
  let deployer: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let issuingEntity: SignerWithAddress;
  let entityTreasury: SignerWithAddress;
  let developer: SignerWithAddress;

  let Lootbox: Lootbox__factory;
  let lootbox: Lootbox;

  let Bnb: BNB__factory;
  let bnb_stablecoin: BNB;
  let bnb_pricefeed = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE";

  const LOOTBOX_NAME = "Pinata Lootbox";
  const LOOTBOX_SYMBOL = "PINATA";

  const SHARE_PRICE_USD = "7000000"; // 7 usd cents
  const SHARES_SOLD_GOAL = 1000;

  before(async function () {
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
    entityTreasury = _guildTreasury;
    issuingEntity = _guildDao;
    developer = _developer;
    purchaser = _purchaser;

    Bnb = await ethers.getContractFactory("BNB");
    Lootbox = await ethers.getContractFactory("Lootbox");
  });

  beforeEach(async function () {
    bnb_stablecoin = (await Bnb.deploy(0)) as BNB;

    lootbox = (await upgrades.deployProxy(
      Lootbox,
      [
        LOOTBOX_NAME,
        LOOTBOX_SYMBOL,
        SHARES_SOLD_GOAL,
        SHARE_PRICE_USD,
        entityTreasury.address,
        issuingEntity.address,
        bnb_pricefeed
      ],
      {
        kind: "uups",
      }
    )) as Lootbox;
    await lootbox.deployed();
  });

  it("sets the player treasury address correctly", async () => {
    expect(await lootbox.treasury()).to.eq(entityTreasury.address);
  });

  it("sets the sharePriceUSD correctly", async () => {
    expect(await lootbox.sharePriceUSD()).to.eq(SHARE_PRICE_USD);
  });

  it("sets the sharesSoldGoal correctly", async () => {
    expect(await lootbox.sharesSoldGoal()).to.eq(SHARES_SOLD_GOAL);
  });

  it("has a native token oracle price feed", async () => {
    const weiPaid = 1000
    const sharesEstimated = await lootbox.estimateSharesPurchase(weiPaid);
    expect(sharesEstimated.toNumber()).gt(0);
  });

  it("fundraising period has immediately begun", async () => {
    expect(await lootbox.isFundraising()).to.eq(true);
  });

  it("has zero native token raised", async () => {
    expect(await lootbox.nativeTokenRaisedTotal()).to.eq("0");
  });

  describe("🗳 pause()", () => {
    describe("called by address with the DAO_ROLE", () => {
      let promise: Promise<any>;

      beforeEach(async () => {
        promise = lootbox.connect(issuingEntity).pause();
      });

      it("pauses the contract", async () => {
        await promise;
        expect(await lootbox.paused()).to.be.equal(true);
      });

      it("emits a paused event", async () => {
        await expect(promise).to.emit(lootbox, "Paused");
      });
    });

    it("reverts with access control error when called with address without DAO_ROLE", async () => {
      await expect(lootbox.connect(purchaser).pause()).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });
  });

  describe("🗳 unpause()", () => {
    describe("called by address with the DAO_ROLE", function () {
      let promise: Promise<any>;

      beforeEach(async () => {
        await lootbox.connect(issuingEntity).pause();
        promise = lootbox.connect(issuingEntity).unpause();
      });

      it("unpauses the contract", async () => {
        await promise;
        expect(await lootbox.paused()).to.be.equal(false);
      });

      it("emits an unpaused event", async () => {
        await expect(promise).to.emit(lootbox, "Unpaused");
      });
    });

    it("reverts with access control error when called with address without DAO_ROLE", async () => {
      await expect(lootbox.connect(purchaser).unpause()).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });
  });

  describe("purchasing lootbox tickets", async () => {
    it("purchases the right amount", async () => { });
    it("emits a purchase event", async () => { });
    it("increments the sharesSoldCount", async () => { });
    it("increments the nativeTokenRaisedTotal", async () => { });
    it("buyer receives the NFT & ticketId is incremented", async () => { });
    it("treasury receives the money", async () => { });
  });

  describe("depositing payout", async () => {
    it("anyone can deposit into a Lootbox", async () => { });
    it("emits a Deposit event", async () => { });
    it("deposits will increment the depositId", async () => { });
    it("can deposit native token into Lootbox", async () => { });
    it("can deposit erc20 token into Lootbox", async () => { });
    it("tracks in an EnumerableSet all erc20 tokens paid out", async () => { });
  })

  describe("withdrawing payout", async () => {
    it("only the owner of the NFT can withdraw with it", async () => { });
    it("correct amount of native token is withdrawn", async () => { });
    it("correct amount of erc20 token is withdrawn", async () => { });
    it("emits a withdraw event", async () => { });
    it("withdrawing will withdraw from all past unredeemed deposits", async () => { });
    it("NFT is marked redeemed for those past depositIds", async () => { });
    it("new deposits can be withdrawn", async () => { });
    it("owner of NFT receives withdrawal", async () => { });
  })

  describe("limitations during fundraising period", async () => {
    it("purchase fails if outside fundraising period", async () => { });
    it("purchase succeeds if during fundraising period", async () => { });
    it("deposit fails if during fundraising period", async () => { });
    it("deposit succeeds if outside fundraising period", async () => { });
    it("withdrawl fails if during fundraising period", async () => { });
    it("withdrawl succeeds if outside fundraising period", async () => { });
    it("only allows the issuingEntity to end the fundraising period", async () => { });
  })

  describe("reading info from Lootbox", async () => {
    it("can read info about a specific Ticket", async () => { });
    it("can list out all erc20 tokens deposited", async () => { });
    it("can query the total amount deposited in a specific erc20 token", async () => { });
    it("can query the total amount deposited in native token", async () => { });
  })

  describe("incurs fees", async () => {
    it("charges a 2% fee on ticket sales (no affiliates yet)", async () => { });
    it("charges a 0% fee on deposits", async () => { });
    it("charges a 2% fee on withdrawals, 2% to LootboxDAO", async () => { });
    it("charges a 2% fee on transfers, 1% to issuingEntity & 1% to LootboxDAO", async () => { });
  })

  describe("_____", async () => {
    it("______", async () => { });
    it("______", async () => { });
    it("______", async () => { });
  })

});
