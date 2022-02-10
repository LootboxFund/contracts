import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import {
  DAO_ROLE,
  generatePermissionRevokeMessage,
  GOVERNOR_ROLE,
  MINTER_ROLE,
  padAddressTo32Bytes,
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

describe("📦 Lootbox smart contract", async function () {
  let deployer: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let issuingEntity: SignerWithAddress;
  let entityTreasury: SignerWithAddress;
  let developer: SignerWithAddress;
  let purchaser2: SignerWithAddress;

  let Lootbox: Lootbox__factory;
  let lootbox: Lootbox;

  let Bnb: BNB__factory;
  let bnb_stablecoin: BNB;
  let bnb_pricefeed = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE";

  let Usdc: USDC__factory;
  let usdc_stablecoin: USDC;
  let usdc_pricefeed = "0x51597f405303C4377E36123cBc172b13269EA163";

  let Usdt: USDT__factory;
  let usdt_stablecoin: USDT;
  let usdt_pricefeed = "0xB97Ad0E74fa7d920791E90258A6E2085088b4320";

  const LOOTBOX_NAME = "Pinata Lootbox";
  const LOOTBOX_SYMBOL = "PINATA";

  const SHARE_PRICE_USD = "7000000"; // 7 usd cents
  const SHARES_SOLD_GOAL = 1000;

  const HARDHAT_TYPICAL_STARTING_NATIVE_BALANCE = "10000000000000000000000"
  const GAS_FEE_APPROXIMATION = "10000000000000000"
  const USDC_STARTING_BALANCE = "10000000000000000000000"

  const buyAmountInEtherA1 = ethers.utils.parseUnits("0.1", "ether");
  const buyAmountInEtherA2 = ethers.utils.parseUnits("0.00013560931", "ether")
  const buyAmountInEtherB = ethers.utils.parseUnits("0.10013560931", "ether");

  const depositAmountInEtherA1 = ethers.utils.parseUnits("1", "ether");
  const depositAmountInEtherA2 = ethers.utils.parseUnits("0.5", "ether")

  const depositAmountInUSDCB1 = ethers.utils.parseUnits("100", "ether");
  const depositAmountInUSDCB2 = ethers.utils.parseUnits("70", "ether")

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
    purchaser2 = _gfxStaff;

    Bnb = await ethers.getContractFactory("BNB");
    Lootbox = await ethers.getContractFactory("Lootbox");

    Usdc = await ethers.getContractFactory("USDC");
    Usdt = await ethers.getContractFactory("USDT");
  });

  beforeEach(async function () {
    bnb_stablecoin = (await Bnb.deploy(0)) as BNB;
    lootbox = (await Lootbox.deploy(
      LOOTBOX_NAME,
      LOOTBOX_SYMBOL,
      ethers.BigNumber.from(SHARES_SOLD_GOAL),
      ethers.BigNumber.from(SHARE_PRICE_USD),
      entityTreasury.address,
      issuingEntity.address,
      bnb_pricefeed
    )) as Lootbox;
    await lootbox.deployed();

    usdc_stablecoin = (await Usdc.deploy(0)) as USDC;
    usdt_stablecoin = (await Usdt.deploy(0)) as USDT;
  });

  describe("basic details", async () => {
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
  })

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

  describe("purchaseTicket() => 'purchasing lootbox tickets'", async () => {
    it("buyer receives the NFT with the right amount of shares & ticketId is incremented", async () => {
      
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA2.toString() })

      await lootbox.connect(purchaser2).purchaseTicket({ value: buyAmountInEtherB.toString() })

      const purchasers = await lootbox.viewPurchasers()

      const ticketsA = await lootbox.viewAllTicketsOfHolder(purchaser.address)
      const ticketsB = await lootbox.viewAllTicketsOfHolder(purchaser2.address)

      const [sharesOwnedA1, percentageOwnedA1, sharePriceUSDA] = await lootbox.viewTicketInfo(ticketsA[0])
      const [sharesOwnedA2, percentageOwnedA2] = await lootbox.viewTicketInfo(ticketsA[1])
      const [sharesOwnedB, percentageOwnedB, sharePriceUSDB] = await lootbox.viewTicketInfo(ticketsB[0])

      expect(purchasers[0]).to.eq(padAddressTo32Bytes(purchaser.address));
      expect(purchasers[1]).to.eq(padAddressTo32Bytes(purchaser2.address));

      expect(ticketsA[0]).to.eq("0");
      expect(ticketsA[1]).to.eq("1");
      expect(ticketsB[0]).to.eq("2");
      expect(ticketsB[1]).to.eq(undefined);

      expect(sharesOwnedA1.toString()).to.eq(buyAmountInEtherA1.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD));
      expect(percentageOwnedA1.toString()).to.eq("49932287");
      expect(sharePriceUSDA.toString()).to.eq(SHARE_PRICE_USD);

      expect(sharesOwnedA2.toString()).to.eq(buyAmountInEtherA2.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD));
      expect(percentageOwnedA2.toString()).to.eq("67712");
      expect(sharePriceUSDA.toString()).to.eq(SHARE_PRICE_USD);

      expect(sharesOwnedB.toString()).to.eq(buyAmountInEtherB.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD));
      expect(percentageOwnedB.toString()).to.eq("50000000");
      expect(sharePriceUSDB.toString()).to.eq(SHARE_PRICE_USD);

      expect(sharePriceUSDA.toString()).to.eq(sharePriceUSDB.toString());
    });
    it("emits a purchase event", async () => {
      const buyAmountInEtherA1 = ethers.utils.parseUnits("0.1", "ether");
      await expect(
        await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      )
        .to.emit(lootbox, "MintTicket")
        .withArgs(
          purchaser.address,
          entityTreasury.address,
          lootbox.address,
          "0",
          buyAmountInEtherA1.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD),
          SHARE_PRICE_USD
        );
    });
    it("increments the sharesSoldCount", async () => {
      const buyAmountInEtherA1 = ethers.utils.parseUnits("0.1", "ether");
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      expect((await lootbox.sharesSoldCount()).toString()).to.eq(buyAmountInEtherA1.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD))
    });
    it("increments the nativeTokenRaisedTotal", async () => {
      const buyAmountInEtherA1 = ethers.utils.parseUnits("0.1", "ether");
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      expect((await lootbox.nativeTokenRaisedTotal()).toString()).to.eq(buyAmountInEtherA1.toString())
    });
    it("treasury receives the money & reduces the purchasers native token balance accordingly", async () => {
      const provider = waffle.provider;
      const treasuryPreBalance = await provider.getBalance(entityTreasury.address)
      const purchaserPreBalance = await provider.getBalance(purchaser.address)
      expect(treasuryPreBalance.toString()).to.eq(HARDHAT_TYPICAL_STARTING_NATIVE_BALANCE)
      expect(purchaserPreBalance.toString()).to.eq(HARDHAT_TYPICAL_STARTING_NATIVE_BALANCE)
      
      const buyAmountInEtherA1 = ethers.utils.parseUnits("0.1", "ether");
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })

      const treasuryPostBalance = await provider.getBalance(entityTreasury.address)
      const purchaserPostBalance = await provider.getBalance(purchaser.address)
      expect(treasuryPostBalance.toString()).to.eq(ethers.BigNumber.from(HARDHAT_TYPICAL_STARTING_NATIVE_BALANCE).add(buyAmountInEtherA1).toString())
      expect(purchaserPostBalance).to.be.gt(ethers.BigNumber.from(HARDHAT_TYPICAL_STARTING_NATIVE_BALANCE).sub(buyAmountInEtherA1).sub(ethers.BigNumber.from(GAS_FEE_APPROXIMATION)))
      expect(purchaserPostBalance).to.be.lt(ethers.BigNumber.from(HARDHAT_TYPICAL_STARTING_NATIVE_BALANCE).sub(buyAmountInEtherA1))
    });
    it("viewPurchasers() => tracks an EnumerableSet of addresses of purchasers", async () => {
      const buyAmountInEtherA1 = ethers.utils.parseUnits("0.1", "ether");
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      const purchasers = await lootbox.viewPurchasers();
      expect(purchasers.length).to.eq(1);
      expect(purchasers[0]).to.eq(padAddressTo32Bytes(purchaser.address));
    });
  });

  describe("depositing payout", async () => {
    beforeEach(async () => {
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      await usdc_stablecoin.mint(issuingEntity.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      await usdc_stablecoin.connect(issuingEntity).approve(lootbox.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      
      await usdt_stablecoin.mint(issuingEntity.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      await usdt_stablecoin.connect(issuingEntity).approve(lootbox.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
    })
    it("anyone can deposit into a Lootbox", async () => {
      await expect(
        lootbox.connect(deployer).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      ).to.not.be.revertedWith(
        "Error that will never happen because anyone can deposit into a lootbox"
      );
    });
    it("depositEarningsNative() => can deposit native token into Lootbox and emits a Deposit event", async () => {
      // native token
      await expect(
        lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      ).to.emit(lootbox, "DepositEarnings")
      .withArgs(
        issuingEntity.address,
        lootbox.address,
        depositAmountInEtherA1.toString(),
        ethers.constants.AddressZero,
        "0"
      );
    });
    it("depositEarningsErc20() => can deposit erc20 token into Lootbox and emits a Deposit event", async () => {
      // erc20 token
      await expect(
        lootbox.connect(issuingEntity).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB1.toString())
      ).to.emit(lootbox, "DepositEarnings")
      .withArgs(
        issuingEntity.address,
        lootbox.address,
        "0",
        usdc_stablecoin.address,
        depositAmountInUSDCB1.toString()
      );
    });
    it("deposits will increment the depositId", async () => {
      await lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      expect(await lootbox.depositIdCounter()).to.eq("1")
      await lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA2.toString() })
      expect(await lootbox.depositIdCounter()).to.eq("2")
    });
    it("viewDepositedTokens() => tracks an EnumerableSet of all erc20 tokens paid out", async () => {
      await lootbox.connect(issuingEntity).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB1.toString())
      await lootbox.connect(issuingEntity).depositEarningsErc20(usdt_stablecoin.address, depositAmountInUSDCB1.toString())
      const [a, b] = await lootbox.viewDepositedTokens()
      expect(a).to.eq(padAddressTo32Bytes(usdc_stablecoin.address))
      expect(b).to.eq(padAddressTo32Bytes(usdt_stablecoin.address))
    });
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
    it("sweepAllDeposits()", async () => { });
  })

  describe("limitations during fundraising period", async () => {
    it("purchase fails if outside fundraising period", async () => { });
    it("purchase succeeds if during fundraising period", async () => { });
    it("deposit fails if during fundraising period", async () => { });
    it("deposit succeeds if outside fundraising period", async () => { });
    it("withdrawl fails if during fundraising period", async () => { });
    it("withdrawl succeeds if outside fundraising period", async () => { });
    it("endFundraisingPeriod() => only allows the issuingEntity to end the fundraising period", async () => { });
  })

  describe("trading the NFT", async () => {
    it("ownership of the NFT changes properly", async () => { });
    it("NFT is not double redeemable", async () => { });
  })

  describe("reading info from Lootbox", async () => {
    it("can read info about a specific Ticket", async () => { });
    it("viewDepositedTokens() => can list out all erc20 tokens deposited", async () => { });
    it("can query the total amount deposited in a specific erc20 token", async () => { });
    it("can query the total amount deposited in native token", async () => { });
    it("viewAllTicketsOfHolder()", async () => { });
    it("viewPurchasers()", async () => { });
  })

  describe("incurs fees", async () => {
    it("charges a 2% fee on ticket sales (no affiliates yet)", async () => { });
    it("charges a 0% fee on deposits", async () => { });
    it("charges a 2% fee on withdrawals, 2% to LootboxDAO", async () => { });
    it("charges a 5% fee on transfers, 4% to issuingEntity & 1% to LootboxDAO", async () => { });
  })

  describe("_____", async () => {
    it("______", async () => { });
    it("______", async () => { });
    it("______", async () => { });
  })

});
