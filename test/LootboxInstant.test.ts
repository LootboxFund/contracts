import { expect } from "chai";
import { ethers, waffle, upgrades } from "hardhat";
import {
  DAO_ROLE,
  generatePermissionRevokeMessage,
  padAddressTo32Bytes,
} from "./helpers/test-helpers";

/* eslint-disable */
import {
  BNB,
  BNB__factory,
  USDC,
  USDC__factory,
  USDT,
  USDT__factory,
  LootboxInstant,
  LootboxInstant__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

// const BNB_ARCHIVED_PRICE = "41771363251"; // $417.36614642 USD per BNB

describe("📦 LootboxInstant smart contract", async function () {
  let deployer: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let issuingEntity: SignerWithAddress;
  let entityTreasury: SignerWithAddress;
  let developer: SignerWithAddress;
  let purchaser2: SignerWithAddress;
  let broker: SignerWithAddress;

  let Lootbox: LootboxInstant__factory;
  let lootbox: LootboxInstant;

  let Bnb: BNB__factory;
  let bnb_stablecoin: BNB;

  let Usdc: USDC__factory;
  let usdc_stablecoin: USDC;
  let usdc_pricefeed = "0x51597f405303C4377E36123cBc172b13269EA163";

  let Usdt: USDT__factory;
  let usdt_stablecoin: USDT;
  let usdt_pricefeed = "0xB97Ad0E74fa7d920791E90258A6E2085088b4320";

  const LOOTBOX_NAME = "Pinata Lootbox";
  const LOOTBOX_SYMBOL = "PINATA";
  const BASE_URI = "https://storage.googleapis.com/lootbox-data-staging/";

  const SHARE_PRICE_WEI = "1000000000"; // $0.07 usd per share
  const SHARE_PRICE_WEI_DECIMALS = 18;

  const TICKET_PURCHASE_FEE = "2000000"; // 2%
  const FEE_DECIMALS = 8;

  const HARDHAT_TYPICAL_STARTING_NATIVE_BALANCE = "10000000000000000000000";
  const USDC_STARTING_BALANCE = "10000000000000000000000";
  const USDT_STARTING_BALANCE = "10000000000000000000000";

  const TARGET_SHARES_AVAILABLE_FOR_SALE = "500000000";
  const MAX_SHARES_AVAILABLE_FOR_SALE = "500000000";

  const buyAmountInEtherA1 = ethers.utils.parseUnits("0.1", "ether");
  const buyAmountInEtherA2 = ethers.utils.parseUnits("0.00013560931", "ether");
  const buyAmountInEtherA3 = ethers.utils.parseUnits("0.2", "ether");
  const buyAmountInEtherB = ethers.utils.parseUnits("0.10013560931", "ether"); // equal to 50% if (A1+A2+B). becomes 25% when (A1+A2+B+C)
  const buyAmountInEtherC = ethers.utils.parseUnits("0.20027121862", "ether"); // equal to 50% if (A1+A2+B+C)

  const buyAmountInSharesA1 = buyAmountInEtherA1
    .mul(ethers.utils.parseUnits("1", 18))
    .div(SHARE_PRICE_WEI);
  const buyAmountInSharesA2 = buyAmountInEtherA2
    .mul(ethers.utils.parseUnits("1", 18))
    .div(SHARE_PRICE_WEI);
  const buyAmountInSharesA3 = buyAmountInEtherA3
    .mul(ethers.utils.parseUnits("1", 18))
    .div(SHARE_PRICE_WEI);
  const buyAmountInSharesB = buyAmountInEtherB
    .mul(ethers.utils.parseUnits("1", 18))
    .div(SHARE_PRICE_WEI);

  const depositAmountInEtherA1 = ethers.utils.parseUnits("1", "ether");
  const depositAmountInEtherA2 = ethers.utils.parseUnits("0.5", "ether");

  const depositAmountInUSDCB1 = ethers.utils.parseUnits("100", "ether");
  const depositAmountInUSDCB2 = ethers.utils.parseUnits("70", "ether");

  const depositAmountInUSDTC1 = ethers.utils.parseUnits("30", "ether");
  const depositAmountInUSDTC2 = ethers.utils.parseUnits("5", "ether");

  const provider = waffle.provider;

  describe("Before constructor & deployment", async () => {
    let entityTreasury: SignerWithAddress;
    let issuingEntity: SignerWithAddress;
    let broker: SignerWithAddress;

    beforeEach(async () => {
      Lootbox = await ethers.getContractFactory("LootboxInstant");
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
      entityTreasury = _guildTreasury;
      issuingEntity = _guildDao;
      broker = _treasury;
    });

    it("Name cannot be empty", async () => {
      const lootbox = upgrades.deployProxy(
        Lootbox,
        [
          "",
          "SYMBOL",
          BASE_URI,
          ethers.BigNumber.from("100000"),
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, "18"), // 50k shares, 18 decimals
          entityTreasury.address,
          issuingEntity.address,
          "2000000",
          broker.address,
        ],
        { kind: "uups" }
      );
      await expect(lootbox).to.be.revertedWith("Name cannot be empty");
    });
    it("Symbol cannot be empty", async () => {
      const lootbox = upgrades.deployProxy(
        Lootbox,
        [
          "Name",
          "",
          BASE_URI,
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, "18"), // 50k shares, 18 decimals
          ethers.BigNumber.from("100000"),
          entityTreasury.address,
          issuingEntity.address,
          "2000000",
          broker.address,
        ],
        { kind: "uups" }
      );
      await expect(lootbox).to.be.revertedWith("Symbol cannot be empty");
    });
    it("Purchase ticket fee must be less than 100000000 (100%)", async () => {
      const lootbox = upgrades.deployProxy(
        Lootbox,
        [
          "Name",
          "Symbol",
          BASE_URI,
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, "18"), // 50k shares, 18 decimals
          ethers.BigNumber.from("100000"),
          entityTreasury.address,
          issuingEntity.address,
          "100000001",
          broker.address,
        ],
        { kind: "uups" }
      );
      await expect(lootbox).to.be.revertedWith(
        "Purchase ticket fee must be less than 100000000 (100%)"
      );
    });
    it("Treasury cannot be the zero address", async () => {
      const lootbox = upgrades.deployProxy(
        Lootbox,
        [
          "Name",
          "SYMBOL",
          BASE_URI,
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, "18"), // 50k shares, 18 decimals
          ethers.BigNumber.from("100000"),
          ethers.constants.AddressZero,
          issuingEntity.address,
          "2000000",
          broker.address,
        ],
        { kind: "uups" }
      );
      await expect(lootbox).to.be.revertedWith(
        "Treasury cannot be the zero address"
      );
    });
    it("Issuer cannot be the zero address", async () => {
      const lootbox = upgrades.deployProxy(
        Lootbox,
        [
          "Name",
          "SYMBOL",
          BASE_URI,
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, "18"), // 50k shares, 18 decimals
          ethers.BigNumber.from("100000"),
          entityTreasury.address,
          ethers.constants.AddressZero,
          "2000000",
          broker.address,
        ],
        { kind: "uups" }
      );
      await expect(lootbox).to.be.revertedWith(
        "Issuer cannot be the zero address"
      );
    });
    it("Broker cannot be the zero address", async () => {
      const lootbox = upgrades.deployProxy(
        Lootbox,
        [
          "Name",
          "SYMBOL",
          BASE_URI,
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, "18"), // 50k shares, 18 decimals
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, "18"), // 50k shares, 18 decimals
          entityTreasury.address,
          issuingEntity.address,
          "2000000",
          ethers.constants.AddressZero,
        ],
        { kind: "uups" }
      );
      await expect(lootbox).to.be.revertedWith(
        "Broker cannot be the zero address"
      );
    });
    it("Max shares sold must be greater than zero", async () => {
      const lootbox = upgrades.deployProxy(
        Lootbox,
        [
          "Name",
          "SYMBOL",
          BASE_URI,
          ethers.BigNumber.from("100000"),
          "0",
          entityTreasury.address,
          issuingEntity.address,
          "2000000",
          broker.address,
        ],
        { kind: "uups" }
      );
      await expect(lootbox).to.be.revertedWith(
        "Max shares sold must be greater than zero"
      );
    });
    it("Target shares sold must be greater than zero", async () => {
      const lootbox = upgrades.deployProxy(
        Lootbox,
        [
          "Name",
          "SYMBOL",
          BASE_URI,
          "0",
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, "18"), // 50k shares, 18 decimals
          entityTreasury.address,
          issuingEntity.address,
          "2000000",
          broker.address,
        ],
        { kind: "uups" }
      );
      await expect(lootbox).to.be.revertedWith(
        "Target shares sold must be greater than zero"
      );
    });
    it("Max shares must be greater than or equal to target shares sold", async () => {
      const lootbox = upgrades.deployProxy(
        Lootbox,
        [
          "Name",
          "SYMBOL",
          BASE_URI,
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, "18"), // 50k shares, 18 decimals,
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, "18").sub("1"), // 50k shares, 18 decimals
          entityTreasury.address,
          issuingEntity.address,
          "2000000",
          broker.address,
        ],
        { kind: "uups" }
      );
      await expect(lootbox).to.be.revertedWith(
        "Target shares sold must be less than or equal to max shares sold"
      );
    });
    it("Base URI cannot be empty", async () => {
      const lootbox = upgrades.deployProxy(
        Lootbox,
        [
          "Name",
          LOOTBOX_SYMBOL,
          "",
          ethers.BigNumber.from("100000"),
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, "18"), // 50k shares, 18 decimals
          entityTreasury.address,
          issuingEntity.address,
          "2000000",
          "1000000",
          broker.address,
          affiliate.address,
        ],
        { kind: "uups" }
      );
      await expect(lootbox).to.be.revertedWith(
        "Base token URI cannot be empty"
      );
    });
  });

  describe("After constructor & deployment", async () => {
    beforeEach(async function () {
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
      broker = _treasury;

      Bnb = await ethers.getContractFactory("BNB");
      Lootbox = await ethers.getContractFactory("LootboxInstant");

      Usdc = await ethers.getContractFactory("USDC");
      Usdt = await ethers.getContractFactory("USDT");
      bnb_stablecoin = (await Bnb.deploy(0)) as BNB;

      lootbox = (await upgrades.deployProxy(
        Lootbox,
        [
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          BASE_URI,
          ethers.utils.parseUnits(TARGET_SHARES_AVAILABLE_FOR_SALE, 18), // uint256 _targetSharesSold, // 1k shares, 18 decimals
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, 18), // 50k shares, 18 decimals
          entityTreasury.address,
          issuingEntity.address,
          TICKET_PURCHASE_FEE,
          broker.address,
        ],
        { kind: "uups" }
      )) as LootboxInstant;
      await lootbox.deployed();

      usdc_stablecoin = (await Usdc.deploy(0)) as USDC;
      usdt_stablecoin = (await Usdt.deploy(0)) as USDT;
    });

    describe("basic details", async () => {
      it("has the expected semver", async () => {
        expect(await lootbox.semver()).to.eq("0.3.0-prod");
      });
      it("sets the player treasury address correctly", async () => {
        expect(await lootbox.treasury()).to.eq(entityTreasury.address);
      });
      it("sets the base token URI correctly", async () => {
        expect(await lootbox.baseTokenURI()).to.eq(BASE_URI);
      });
      it("sets the sharePriceWei correctly", async () => {
        expect(await lootbox.sharePriceWei()).to.eq(SHARE_PRICE_WEI);
      });
      it("sets the sharePriceWeiDecimals correctly", async () => {
        expect(await lootbox.sharePriceWeiDecimals()).to.eq(
          SHARE_PRICE_WEI_DECIMALS
        );
      });
      it("estimateSharesPurchase yields greater than zero value", async () => {
        const weiPaid = 1000;
        const sharesEstimated = await lootbox.estimateSharesPurchase(weiPaid);
        expect(sharesEstimated.toNumber()).gt(0);
      });
      it("fundraising period has immediately begun", async () => {
        expect(await lootbox.isFundraising()).to.eq(true);
      });
      it("starts with zero native token raised", async () => {
        expect(await lootbox.nativeTokenRaisedTotal()).to.eq("0");
      });
      it("ownership of the NFT changes properly", async () => {
        const ticketId = "0";
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox
          .connect(purchaser)
          .transferFrom(purchaser.address, purchaser2.address, ticketId);
      });
      it("only the owner of the NFT can change the ownership", async () => {
        const ticketId = "0";
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await expect(
          lootbox
            .connect(purchaser2)
            .transferFrom(purchaser.address, purchaser2.address, ticketId)
        ).to.be.revertedWith(
          "ERC721: transfer caller is not owner nor approved"
        );
      });
    });

    it("estimateSharesPurchase() yields correct results", async () => {
      const vals = [
        // [stableCoinValue, expectedShares]
        [0, 0],
        [ethers.utils.parseUnits("1", 4), ethers.utils.parseUnits("1", 13)],
        [ethers.utils.parseUnits("0.5", 9), ethers.utils.parseUnits("0.5", 18)],
        [ethers.utils.parseUnits("1", 9), ethers.utils.parseUnits("1", 18)],
        [ethers.utils.parseUnits("1.5", 9), ethers.utils.parseUnits("1.5", 18)],
        [ethers.utils.parseUnits("2", 9), ethers.utils.parseUnits("2", 18)],
        [ethers.utils.parseUnits("10", 9), ethers.utils.parseUnits("10", 18)],
        [ethers.utils.parseUnits("15", 9), ethers.utils.parseUnits("15", 18)],
        [ethers.utils.parseUnits("1", 18), ethers.utils.parseUnits("1", 27)],
        [
          ethers.utils.parseUnits("1.0000000005", 18),
          ethers.utils.parseUnits("1.0000000005", 27),
        ],
      ];

      for (let [stableCoinValue, expectedShares] of vals) {
        const res = await lootbox.estimateSharesPurchase(stableCoinValue);
        expect(res.toString()).to.eq(expectedShares.toString());
      }
    });

    describe("tokenURI()", () => {
      it("returns the correct URI", async () => {
        const ticketId = "0";
        const ticketURI = await lootbox.tokenURI(ticketId);
        expect(ticketURI).to.eq(
          `${BASE_URI}${lootbox.address.toLowerCase()}.json`
        );
      });
    });

    describe("purchaseTicket() => 'purchasing lootbox tickets'", async () => {
      let purchasers: string[] = [];

      let ticketsA: BigNumber[] = [];
      let ticketsB: BigNumber[] = [];

      let sharesOwnedA1: BigNumber;
      let sharesOwnedA2: BigNumber;
      let sharesOwnedB: BigNumber;

      const buyAmountInEtherA3 = ethers.utils.parseUnits("0.2", "ether");

      beforeEach(async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA2.toString() });
        await lootbox
          .connect(purchaser2)
          .purchaseTicket({ value: buyAmountInEtherB.toString() }); // equal to 50%

        purchasers = await lootbox.viewPurchasers();

        ticketsA = await lootbox.viewAllTicketsOfHolder(purchaser.address);
        ticketsB = await lootbox.viewAllTicketsOfHolder(purchaser2.address);

        sharesOwnedA1 = await lootbox.sharesInTicket(ticketsA[0]);
        sharesOwnedA2 = await lootbox.sharesInTicket(ticketsA[1]);
        sharesOwnedB = await lootbox.sharesInTicket(ticketsB[0]);
      });
      it("treasury receives the money & reduces the purchasers native token balance accordingly", async () => {
        const startTreasuryBalance = await provider.getBalance(
          entityTreasury.address
        );
        const startPurchaserBalance = await provider.getBalance(
          purchaser2.address
        );
        expect(await lootbox.ticketIdCounter()).to.eq("3");
        const tx = await lootbox
          .connect(purchaser2)
          .purchaseTicket({ value: buyAmountInEtherC.toString() });
        const ticketPurchaseFee = buyAmountInEtherC
          .mul(ethers.BigNumber.from(TICKET_PURCHASE_FEE))
          .div(
            ethers.BigNumber.from("10").pow(ethers.BigNumber.from(FEE_DECIMALS))
          );
        const receipt = await tx.wait();
        const gasUsed = receipt.cumulativeGasUsed.mul(
          receipt.effectiveGasPrice
        );
        const endTreasuryBalance = await provider.getBalance(
          entityTreasury.address
        );
        const endPurchaserBalance = await provider.getBalance(
          purchaser2.address
        );
        expect(endTreasuryBalance.toString()).to.eq(
          startTreasuryBalance
            .add(buyAmountInEtherC)
            .sub(ticketPurchaseFee)
            .toString()
        );
        expect(endPurchaserBalance.toString()).to.eq(
          startPurchaserBalance.sub(buyAmountInEtherC).sub(gasUsed).toString()
        );
      });
      it("viewAllTicketsOfHolder() => can view all the NFT tickets owned by an address", async () => {
        expect(ticketsA[0]).to.eq("0");
        expect(ticketsA[1]).to.eq("1");
        expect(ticketsA.length).to.eq(2);
        expect(ticketsB[0]).to.eq("2");
        expect(ticketsB[1]).to.eq(undefined);
        expect(ticketsB.length).to.eq(1);
      });
      it("tracks the proper amount of shares owned by each NFT ticket", async () => {
        expect(sharesOwnedA1.toString()).to.eq(buyAmountInSharesA1.toString());
        expect(sharesOwnedA2.toString()).to.eq(buyAmountInSharesA2.toString());
        expect(sharesOwnedB.toString()).to.eq(buyAmountInSharesB.toString());
      });
      // it("tracks the proper percentage of total shares owned by each NFT ticket", async () => {
      //    // this is by association tracked by "viewProratedDepositsForTicket()"
      //   // we should replace this with a dedicated test later, as we do very much want to know the % of shares owned by an NFT ticket
      //   expect(percentageOwnedA1.toString()).to.eq("49932287");
      //   expect(percentageOwnedA2.toString()).to.eq("67712");
      //   expect(percentageOwnedB.toString()).to.eq("50000000");
      // });
      it(`has a consistent share price per ticket of ${SHARE_PRICE_WEI} gwei`, async () => {
        expect(await lootbox.sharePriceWei()).to.eq(SHARE_PRICE_WEI);
      });
      it("ticketId is incremented", async () => {
        expect(await lootbox.ticketIdCounter()).to.eq("3");
        await lootbox
          .connect(purchaser2)
          .purchaseTicket({ value: buyAmountInEtherC.toString() }); // equal to 50%
        expect(await lootbox.ticketIdCounter()).to.eq("4");
      });
      it("increments the sharesSoldCount", async () => {
        expect((await lootbox.sharesSoldCount()).toString()).to.eq(
          buyAmountInSharesA1.add(buyAmountInSharesA2).add(buyAmountInSharesB)
        );
      });
      it("increments the nativeTokenRaisedTotal", async () => {
        expect((await lootbox.nativeTokenRaisedTotal()).toString()).to.eq(
          buyAmountInEtherA1.add(buyAmountInEtherA2).add(buyAmountInEtherB)
        );
      });
      it("emits a purchase event", async () => {
        await expect(
          await lootbox
            .connect(purchaser)
            .purchaseTicket({ value: buyAmountInEtherA3.toString() })
        )
          .to.emit(lootbox, "MintTicket")
          .withArgs(
            purchaser.address,
            entityTreasury.address,
            lootbox.address,
            "3",
            buyAmountInSharesA3,
            SHARE_PRICE_WEI
          );
      });
      it("viewPurchasers() => tracks an EnumerableSet of addresses of purchasers", async () => {
        expect(purchasers.length).to.eq(2);
        expect(purchasers[0]).to.eq(padAddressTo32Bytes(purchaser.address));
        expect(purchasers[1]).to.eq(padAddressTo32Bytes(purchaser2.address));
      });
    });

    describe("max shares for sale", async () => {
      it("checkMaxSharesRemainingForSale() => how many shares are available for sale", async () => {
        const beforeRemainingShares =
          await lootbox.checkMaxSharesRemainingForSale();
        expect(beforeRemainingShares.toString()).to.eq(
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, 18)
        );

        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        const sharesPurchased = await lootbox.estimateSharesPurchase(
          buyAmountInEtherA1.toString()
        );
        const afterRemainingShares =
          await lootbox.checkMaxSharesRemainingForSale();
        expect(afterRemainingShares.toString()).to.eq(
          beforeRemainingShares.sub(sharesPurchased).toString()
        );
      });
      it("decreases the max shares remaining for sale after each purchase", async () => {
        const initialRemainingShares =
          await lootbox.checkMaxSharesRemainingForSale();
        expect(initialRemainingShares.toString()).to.eq(
          ethers.utils.parseUnits(MAX_SHARES_AVAILABLE_FOR_SALE, 18)
        );

        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        const round1SharesPurchased = await lootbox.estimateSharesPurchase(
          buyAmountInEtherA1.toString()
        );
        const round1RemainingShares =
          await lootbox.checkMaxSharesRemainingForSale();
        expect(round1RemainingShares.toString()).to.eq(
          initialRemainingShares.sub(round1SharesPurchased).toString()
        );

        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA2.toString() });
        const round2SharesPurchased = await lootbox.estimateSharesPurchase(
          buyAmountInEtherA2.toString()
        );
        const round2RemainingShares =
          await lootbox.checkMaxSharesRemainingForSale();
        expect(round2RemainingShares.toString()).to.eq(
          round1RemainingShares.sub(round2SharesPurchased).toString()
        );

        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherB.toString() });
        const round3SharesPurchased = await lootbox.estimateSharesPurchase(
          buyAmountInEtherB.toString()
        );
        const round3RemainingShares =
          await lootbox.checkMaxSharesRemainingForSale();
        expect(round3RemainingShares.toString()).to.eq(
          round2RemainingShares.sub(round3SharesPurchased).toString()
        );
      });
      it("rejects purchase attempts exceeding the max shares remaining for sale", async () => {
        const priceFeedDecimalsUSD = ethers.utils.parseUnits("1", 8);
        const sharePriceWei = await lootbox.sharePriceWei();

        const remainingShares = await lootbox.checkMaxSharesRemainingForSale();

        const excessSharesPurchase = remainingShares.add(
          ethers.utils.parseUnits("1", 18)
        );

        const buyExcessWithNativeToken = excessSharesPurchase
          .mul(sharePriceWei)
          .div(ethers.utils.parseUnits("1", 18));

        await expect(
          lootbox
            .connect(purchaser)
            .purchaseTicket({ value: buyExcessWithNativeToken.toString() })
        ).to.be.revertedWith(
          "Not enough shares remaining to purchase, try a smaller amount"
        );

        const buyExactWithNativeToken = remainingShares
          .mul(sharePriceWei)
          .div(ethers.utils.parseUnits("1", 18));

        await expect(
          lootbox
            .connect(purchaser)
            .purchaseTicket({ value: buyExactWithNativeToken.toString() })
        ).to.not.be.reverted;
        const marginOfError = "7000"; // 6808
        expect(await lootbox.checkMaxSharesRemainingForSale()).to.be.lt(
          marginOfError
        );
      });
    });

    describe("depositing payout", async () => {
      beforeEach(async () => {
        await usdc_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );
        await usdc_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );

        await usdt_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );
        await usdt_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );
      });
      it("deposits are not allowed if no shares have been sold", async () => {
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await expect(
          lootbox
            .connect(issuingEntity)
            .depositEarningsNative({ value: depositAmountInEtherA1.toString() })
        ).to.be.revertedWith(
          "No shares have been sold. Deposits will not be accepted"
        );
        await expect(
          lootbox
            .connect(issuingEntity)
            .depositEarningsErc20(
              usdc_stablecoin.address,
              depositAmountInUSDCB1.toString()
            )
        ).to.be.revertedWith(
          "No shares have been sold. Deposits will not be accepted"
        );
      });
      it("anyone can deposit into a Lootbox", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await expect(
          lootbox
            .connect(deployer)
            .depositEarningsNative({ value: depositAmountInEtherA1.toString() })
        ).to.not.be.reverted;
        await expect(
          lootbox
            .connect(issuingEntity)
            .depositEarningsErc20(
              usdc_stablecoin.address,
              depositAmountInUSDCB1.toString()
            )
        ).to.not.be.reverted;
      });
      it("depositEarningsNative() => can deposit native token into Lootbox and emits a Deposit event", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        const expectedDepositId = "0";
        // native token
        await expect(
          lootbox
            .connect(issuingEntity)
            .depositEarningsNative({ value: depositAmountInEtherA1.toString() })
        )
          .to.emit(lootbox, "DepositEarnings")
          .withArgs(
            issuingEntity.address,
            lootbox.address,
            expectedDepositId,
            depositAmountInEtherA1.toString(),
            ethers.constants.AddressZero,
            "0"
          );
      });
      it("depositEarningsErc20() => can deposit erc20 token into Lootbox and emits a Deposit event", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        const expectedDepositId = "0";
        // erc20 token
        await expect(
          lootbox
            .connect(issuingEntity)
            .depositEarningsErc20(
              usdc_stablecoin.address,
              depositAmountInUSDCB1.toString()
            )
        )
          .to.emit(lootbox, "DepositEarnings")
          .withArgs(
            issuingEntity.address,
            lootbox.address,
            expectedDepositId,
            "0",
            usdc_stablecoin.address,
            depositAmountInUSDCB1.toString()
          );
      });
      it("not possible to deposit both native tokens & erc20 in the same transaction", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await expect(
          lootbox
            .connect(deployer)
            .depositEarningsErc20(
              usdc_stablecoin.address,
              depositAmountInUSDCB1.toString(),
              { value: depositAmountInEtherA1.toString() }
            )
        ).to.be.revertedWith(
          "Deposits of erc20 cannot also include native tokens in the same transaction"
        );
      });
      it("treasury cannot purchase tickets", async () => {
        await expect(
          lootbox
            .connect(entityTreasury)
            .purchaseTicket({ value: buyAmountInEtherA1.toString() })
        ).to.be.revertedWith("Treasury cannot purchase tickets");
      });
      it("deposits will increment the depositId", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA1.toString() });
        expect(await lootbox.depositIdCounter()).to.eq("1");
        await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA2.toString() });
        expect(await lootbox.depositIdCounter()).to.eq("2");
      });
      it("viewDepositedTokens() => tracks an EnumerableSet of all erc20 tokens paid out", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdc_stablecoin.address,
            depositAmountInUSDCB1.toString()
          );
        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdt_stablecoin.address,
            depositAmountInUSDCB1.toString()
          );
        const [a, b] = await lootbox.viewDepositedTokens();
        expect(a).to.eq(padAddressTo32Bytes(usdc_stablecoin.address));
        expect(b).to.eq(padAddressTo32Bytes(usdt_stablecoin.address));
      });
    });

    describe("Trapped Tokens are handled", async () => {
      beforeEach(async () => {
        await usdc_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );
        await usdc_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );

        await usdt_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );
        await usdt_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );
      });
      it("sending native tokens directly to lootbox will result in them being trapped", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        const depositAmount = ethers.utils.parseEther("1");
        await issuingEntity.sendTransaction({
          to: lootbox.address,
          value: depositAmount,
        });
        const recognizedDeposits =
          await lootbox.viewTotalDepositOfNativeToken();
        expect(recognizedDeposits.toString()).to.eq("0");
        const trappedTokens = await lootbox.checkForTrappedNativeTokens();
        expect(trappedTokens.toString()).to.eq(depositAmount);
      });
      it("sending erc20 tokens directly to lootbox will result in them being trapped", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        const depositAmount = ethers.utils.parseEther("1");
        await usdc_stablecoin
          .connect(issuingEntity)
          .transfer(lootbox.address, depositAmount);
        const recognizedDeposits = await lootbox.viewTotalDepositOfErc20Token(
          usdc_stablecoin.address
        );
        expect(recognizedDeposits.toString()).to.eq("0");
        const trappedTokens = await lootbox.checkForTrappedErc20Tokens(
          usdc_stablecoin.address
        );
        expect(trappedTokens.toString()).to.eq(depositAmount);
      });
      it("only the issuingEntity can rescue trapped tokens", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        const depositAmount = ethers.utils.parseEther("1");
        await usdc_stablecoin
          .connect(issuingEntity)
          .transfer(lootbox.address, depositAmount);
        await issuingEntity.sendTransaction({
          to: lootbox.address,
          value: depositAmount,
        });
        await expect(
          lootbox
            .connect(purchaser)
            .rescueTrappedErc20Tokens(usdc_stablecoin.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
        );
        await expect(
          lootbox.connect(purchaser).rescueTrappedNativeTokens()
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
        );
        await expect(
          lootbox
            .connect(issuingEntity)
            .rescueTrappedErc20Tokens(usdc_stablecoin.address)
        ).to.not.be.reverted;
        await expect(lootbox.connect(issuingEntity).rescueTrappedNativeTokens())
          .to.not.be.reverted;
      });
      it("trapped tokens can be rescued by the issuingEntity and flush them to treasury", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        const depositAmount = ethers.utils.parseEther("1");
        await usdc_stablecoin
          .connect(issuingEntity)
          .transfer(lootbox.address, depositAmount);
        await issuingEntity.sendTransaction({
          to: lootbox.address,
          value: depositAmount,
        });
        const preRescueNativeTreasuryBalance = await provider.getBalance(
          entityTreasury.address
        );
        const preRescueErc20TreasuryBalance = await usdc_stablecoin.balanceOf(
          entityTreasury.address
        );

        await lootbox
          .connect(issuingEntity)
          .rescueTrappedErc20Tokens(usdc_stablecoin.address);
        await lootbox.connect(issuingEntity).rescueTrappedNativeTokens();

        const postRescueNativeTreasuryBalance = await provider.getBalance(
          entityTreasury.address
        );
        const postRescueErc20TreasuryBalance = await usdc_stablecoin.balanceOf(
          entityTreasury.address
        );

        expect(postRescueNativeTreasuryBalance.toString()).to.eq(
          preRescueNativeTreasuryBalance.add(depositAmount).toString()
        );
        expect(postRescueErc20TreasuryBalance.toString()).to.eq(
          preRescueErc20TreasuryBalance.add(depositAmount).toString()
        );

        const remainingTrappedNativeTokens =
          await lootbox.checkForTrappedNativeTokens();
        const remainingTrappedErc20Tokens =
          await lootbox.checkForTrappedErc20Tokens(usdc_stablecoin.address);

        expect(remainingTrappedNativeTokens.toString()).to.eq("0");
        expect(remainingTrappedErc20Tokens.toString()).to.eq("0");
      });
    });

    describe("withdrawing payout", async () => {
      beforeEach(async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA2.toString() });
        await lootbox
          .connect(purchaser2)
          .purchaseTicket({ value: buyAmountInEtherB.toString() }); // equal to 50%

        await lootbox.connect(issuingEntity).endFundraisingPeriod();

        await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA1.toString() });
        await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA2.toString() });

        await usdc_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );
        await usdc_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );
        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdc_stablecoin.address,
            depositAmountInUSDCB1.toString()
          );
        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdc_stablecoin.address,
            depositAmountInUSDCB2.toString()
          );

        await usdt_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDT_STARTING_BALANCE)
        );
        await usdt_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDT_STARTING_BALANCE)
          );
        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdt_stablecoin.address,
            depositAmountInUSDTC1.toString()
          );
      });

      it("correct amount of native token is withdrawn to owners wallet", async () => {
        const ticketId = "2"; // gets 50% of deposits
        const oldNativeBalance = await provider.getBalance(purchaser2.address);
        expect(await lootbox.ticketIdCounter()).to.eq("3"); // 3 total tickets bought
        expect(await lootbox.depositIdCounter()).to.eq("5"); // 4 total deposits made
        const tx = await lootbox.connect(purchaser2).withdrawEarnings(ticketId);
        const receipt = await tx.wait();
        const gasUsed = receipt.cumulativeGasUsed.mul(
          receipt.effectiveGasPrice
        );
        const newNativeBalance = await provider.getBalance(purchaser2.address);
        const expectedNativeBalance = oldNativeBalance
          .sub(gasUsed)
          .add(depositAmountInEtherA1.div(2)) // half of total shares are in ticket2 owned by purchaser2
          .add(depositAmountInEtherA2.div(2)); // half of total shares are in ticket2 owned by purchaser2
        expect(newNativeBalance.toString()).to.eq(
          expectedNativeBalance.toString()
        );
      });
      it("only the owner of the NFT can withdraw with it", async () => {
        await expect(
          lootbox.connect(deployer).withdrawEarnings("0")
        ).to.be.revertedWith("You do not own this ticket");
      });
      it("correct amount of erc20 token is withdrawn to owners wallet", async () => {
        const usdcBalance = await usdc_stablecoin.balanceOf(purchaser2.address);
        expect(await lootbox.ticketIdCounter()).to.eq("3"); // 3 total tickets bought
        expect(await lootbox.depositIdCounter()).to.eq("5"); // 4 total deposits made
        await lootbox.connect(purchaser2).withdrawEarnings("2");
        const expectedApproxBalance = usdcBalance
          .add(depositAmountInUSDCB1.div(2)) // half of total shares are in ticket2 owned by purchaser2
          .add(depositAmountInUSDCB2.div(2));
        const newUsdcBalance = await usdc_stablecoin.balanceOf(
          purchaser2.address
        );
        expect(expectedApproxBalance.toString()).to.eq(
          newUsdcBalance.toString()
        );
      });
      it("emits a withdraw event", async () => {
        const ticketId = "2";
        const tx = await lootbox.connect(purchaser2).withdrawEarnings(ticketId);
        const events = (await tx.wait()).events || [];
        const depositsForPurchaser2 = [
          {
            nativeTokenAmount: depositAmountInEtherA1.div(2),
            erc20Token: ethers.constants.AddressZero,
            erc20Amount: "0",
          },
          {
            nativeTokenAmount: depositAmountInEtherA2.div(2),
            erc20Token: ethers.constants.AddressZero,
            erc20Amount: "0",
          },
          {
            nativeTokenAmount: "0",
            erc20Token: usdc_stablecoin.address,
            erc20Amount: depositAmountInUSDCB1.div(2),
          },
          {
            nativeTokenAmount: "0",
            erc20Token: usdc_stablecoin.address,
            erc20Amount: depositAmountInUSDCB2.div(2),
          },
          {
            nativeTokenAmount: "0",
            erc20Token: usdt_stablecoin.address,
            erc20Amount: depositAmountInUSDTC1.div(2),
          },
        ];
        let expectedDepositId = 0;
        for (const event of events) {
          if (event.args) {
            const {
              withdrawer,
              lootbox: lootboxAddr,
              ticketId,
              depositId,
              nativeTokenAmount,
              erc20Token,
              erc20Amount,
            } = event.args;
            expect(withdrawer).to.eq(purchaser2.address);
            expect(lootboxAddr).to.eq(lootbox.address);
            expect(ticketId).to.eq(ticketId);
            expect(depositId).to.eq(expectedDepositId);
            expect(nativeTokenAmount).to.eq(
              depositsForPurchaser2[depositId].nativeTokenAmount
            );
            expect(erc20Token).to.eq(
              depositsForPurchaser2[depositId].erc20Token
            );
            expect(erc20Amount).to.eq(
              depositsForPurchaser2[depositId].erc20Amount
            );
            expectedDepositId++;
          }
        }
      });
      it("withdrawing will withdraw from all past unredeemed deposits and not double withdraw from already withdrawn deposits", async () => {
        const ticketId = "2";
        const tx1 = await lootbox
          .connect(purchaser2)
          .withdrawEarnings(ticketId);
        const events1 = (await tx1.wait()).events || [];
        expect(events1.filter((e) => e.args).length).to.eq(5);
        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdt_stablecoin.address,
            depositAmountInUSDTC2.toString()
          );
        const tx2 = await lootbox
          .connect(purchaser2)
          .withdrawEarnings(ticketId);
        const events2 = (await tx2.wait()).events || [];
        expect(events2.filter((e) => e.args).length).to.eq(1);
        for (const event of events2) {
          if (event.args) {
            const {
              withdrawer,
              lootbox: lootboxAddr,
              ticketId,
              depositId,
              nativeTokenAmount,
              erc20Token,
              erc20Amount,
            } = event.args;
            expect(withdrawer).to.eq(purchaser2.address);
            expect(lootboxAddr).to.eq(lootbox.address);
            expect(ticketId).to.eq(ticketId);
            expect(depositId).to.eq("5"); // the 5th deposit
            expect(nativeTokenAmount).to.eq("0");
            expect(erc20Token).to.eq(usdt_stablecoin.address);
            expect(erc20Amount).to.eq(depositAmountInUSDTC2.div(2).toString());
          }
        }
      });
      it("NFT is marked redeemed for those past depositIds", async () => {
        const ticketId = "2";
        const currentDepositId = await lootbox.depositIdCounter();
        for (let i = 0; i < currentDepositId.toNumber(); i++) {
          const redeemed = await lootbox.depositRedemptions(ticketId, i);
          expect(redeemed).to.be.false;
        }
        await lootbox.connect(purchaser2).withdrawEarnings(ticketId);
        for (let i = 0; i < currentDepositId.toNumber(); i++) {
          const redeemed = await lootbox.depositRedemptions(ticketId, i);
          expect(redeemed).to.be.true;
        }
      });
    });

    describe("limitations during fundraising period", async () => {
      beforeEach(async () => {
        await usdc_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );
        await usdc_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );

        await usdt_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );
        await usdt_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );
      });
      it("purchase succeeds if during fundraising period", async () => {
        await expect(
          lootbox
            .connect(purchaser)
            .purchaseTicket({ value: buyAmountInEtherA1.toString() })
        ).to.not.be.reverted;
      });
      it("purchase fails if outside fundraising period", async () => {
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await expect(
          lootbox
            .connect(purchaser)
            .purchaseTicket({ value: buyAmountInEtherA1.toString() })
        ).to.be.revertedWith(
          "Tickets cannot be purchased after the fundraising period"
        );
      });
      it("deposit succeeds if outside fundraising period", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await expect(
          lootbox
            .connect(issuingEntity)
            .depositEarningsErc20(
              usdc_stablecoin.address,
              depositAmountInUSDCB1.toString()
            )
        ).to.not.be.reverted;
        await expect(
          lootbox
            .connect(issuingEntity)
            .depositEarningsNative({ value: depositAmountInEtherA1.toString() })
        ).to.not.be.reverted;
      });
      it("deposit fails if during fundraising period", async () => {
        await expect(
          lootbox
            .connect(purchaser)
            .depositEarningsErc20(
              usdc_stablecoin.address,
              depositAmountInUSDCB1.toString()
            )
        ).to.be.revertedWith(
          "Deposits cannot be made during fundraising period"
        );
        await expect(
          lootbox
            .connect(purchaser)
            .depositEarningsNative({ value: depositAmountInEtherA1.toString() })
        ).to.be.revertedWith(
          "Deposits cannot be made during fundraising period"
        );
      });
      it("withdrawal fails if during fundraising period", async () => {
        const ticketId = "0";
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await expect(lootbox.withdrawEarnings(ticketId)).to.be.revertedWith(
          "Withdrawals cannot be made during fundraising period"
        );
      });
      it("withdrawal succeeds if outside fundraising period", async () => {
        const ticketId = "0";
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA1.toString() });
        await expect(lootbox.connect(purchaser).withdrawEarnings(ticketId)).to
          .not.be.reverted;
      });
      it("endFundraisingPeriod() => only allows the issuingEntity to end the fundraising period", async () => {
        await expect(
          lootbox.connect(deployer).endFundraisingPeriod()
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(deployer.address, DAO_ROLE)
        );
        await expect(lootbox.connect(issuingEntity).endFundraisingPeriod()).to
          .not.be.reverted;
      });
      it("endFundraisingPeriod() => cannot be called twice", async () => {
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await expect(
          lootbox.connect(issuingEntity).endFundraisingPeriod()
        ).to.be.revertedWith("Fundraising period has already ended");
      });
    });

    describe("reading info from Ticket or Lootbox", async () => {
      beforeEach(async () => {
        await usdc_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );
        await usdc_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );

        await usdt_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );
        await usdt_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );
      });
      // it("can read info about a specific Ticket", async () => {
      //   const ticketId = "0";
      //   const shareOwnershipPercentageDecimals = "8";
      //   const estimatedSharesReceived = await lootbox.estimateSharesPurchase(
      //     buyAmountInEtherA1.toString()
      //   );
      //   await lootbox
      //     .connect(purchaser)
      //     .purchaseTicket({ value: buyAmountInEtherA1.toString() });
      //   const [sharesReceived, percentageSharesOwned] =
      //     await lootbox.viewTicketInfo(ticketId);

      //   expect(sharesReceived.toString()).to.eq(
      //     estimatedSharesReceived.toString()
      //   );
      //   expect(percentageSharesOwned.toString()).to.eq(
      //     ethers.utils.parseUnits("1", shareOwnershipPercentageDecimals)
      //   );

      //   await lootbox
      //     .connect(purchaser)
      //     .purchaseTicket({ value: buyAmountInEtherA2.toString() });
      //   const est3 = await lootbox.estimateSharesPurchase(
      //     buyAmountInEtherB.toString()
      //   );
      //   await lootbox
      //     .connect(purchaser2)
      //     .purchaseTicket({ value: buyAmountInEtherB.toString() });
      //   const [rec3, per3] = await lootbox.viewTicketInfo("2");
      //   expect(est3.toString()).to.eq(rec3.toString());
      //   expect(per3.toString()).to.eq(
      //     ethers.utils.parseUnits("0.5", shareOwnershipPercentageDecimals)
      //   );
      // });
      it("viewPurchasers() => can list out all investors", async () => {
        const beforePurchasers = await lootbox.viewPurchasers();
        expect(beforePurchasers).to.deep.eq([]);
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox
          .connect(purchaser2)
          .purchaseTicket({ value: buyAmountInEtherB.toString() });
        const afterPurchasers = await lootbox.viewPurchasers();
        expect(afterPurchasers).to.deep.eq([
          padAddressTo32Bytes(purchaser.address),
          padAddressTo32Bytes(purchaser2.address),
        ]);
      });
      it("viewDepositedTokens() => can list out all erc20 tokens deposited", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA1.toString() });
        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdc_stablecoin.address,
            depositAmountInUSDCB1.toString()
          );

        const depositedTokens1 = await lootbox.viewDepositedTokens();
        expect(depositedTokens1).to.deep.eq([
          padAddressTo32Bytes(usdc_stablecoin.address),
        ]);

        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdt_stablecoin.address,
            depositAmountInUSDTC1.toString()
          );
        const depositedTokens2 = await lootbox.viewDepositedTokens();
        expect(depositedTokens2).to.deep.eq([
          padAddressTo32Bytes(usdc_stablecoin.address),
          padAddressTo32Bytes(usdt_stablecoin.address),
        ]);
      });
      it("can query the total amount deposited in native token", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        expect(await lootbox.viewTotalDepositOfNativeToken()).to.eq(
          ethers.BigNumber.from(0)
        );
        await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA1.toString() });
        expect(await lootbox.viewTotalDepositOfNativeToken()).to.eq(
          depositAmountInEtherA1
        );
      });
      it("can query the total amount deposited in a specific erc20 token", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdc_stablecoin.address,
            depositAmountInUSDCB1.toString()
          );
        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdt_stablecoin.address,
            depositAmountInUSDTC1.toString()
          );
        const tdUSDC = await lootbox.viewTotalDepositOfErc20Token(
          usdc_stablecoin.address
        );
        expect(tdUSDC).to.eq(depositAmountInUSDCB1);
        const tdUSDT = await lootbox.viewTotalDepositOfErc20Token(
          usdt_stablecoin.address
        );
        expect(tdUSDT).to.eq(depositAmountInUSDTC1);
      });
      it("viewAllTicketsOfHolder()", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA2.toString() });
        await lootbox
          .connect(purchaser2)
          .purchaseTicket({ value: buyAmountInEtherB.toString() });

        const ticketsOfPurchaser1 = await lootbox.viewAllTicketsOfHolder(
          purchaser.address
        );
        const ticketsOfPurchaser2 = await lootbox.viewAllTicketsOfHolder(
          purchaser2.address
        );

        const [ticketId1, ticketId2] = ticketsOfPurchaser1;
        const [ticketId3] = ticketsOfPurchaser2;
        expect(ticketId1.toString()).to.eq("0");
        expect(ticketId2.toString()).to.eq("1");
        expect(ticketId3.toString()).to.eq("2");
      });
      it("can get the unredeemed sum of all native tokens still owing", async () => {
        const ticketId = "2";

        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA2.toString() });
        await lootbox
          .connect(purchaser2)
          .purchaseTicket({ value: buyAmountInEtherB.toString() }); // equal to 50%

        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA1.toString() });
        const deposits1 = await lootbox.viewProratedDepositsForTicket(ticketId);
        const owed1 = deposits1[0].nativeTokenAmount;
        expect(owed1).to.eq(depositAmountInEtherA1.div(2).toString());
        await lootbox.connect(purchaser2).withdrawEarnings(ticketId);
        await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA2.toString() });
        const deposits2 = await lootbox.viewProratedDepositsForTicket(ticketId);
        const owed2 = deposits2[1].nativeTokenAmount;
        expect(owed2).to.eq(depositAmountInEtherA2.div(2).toString());
      });
      it("can get the unredeemed sum of a specific erc20 token still owing", async () => {
        const ticketId = "2";

        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA2.toString() });
        await lootbox
          .connect(purchaser2)
          .purchaseTicket({ value: buyAmountInEtherB.toString() }); // equal to 50%

        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdc_stablecoin.address,
            depositAmountInUSDCB1.toString()
          );
        const deposits1 = await lootbox.viewProratedDepositsForTicket(ticketId);
        const owed1 = deposits1[0].erc20TokenAmount;
        expect(owed1).to.eq(depositAmountInUSDCB1.div(2).toString());
        await lootbox.connect(purchaser2).withdrawEarnings(ticketId);
        await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdc_stablecoin.address,
            depositAmountInUSDCB2.toString()
          );
        const deposits2 = await lootbox.viewProratedDepositsForTicket(ticketId);
        const owed2 = deposits2[1].erc20TokenAmount;
        expect(owed2).to.eq(depositAmountInUSDCB2.div(2).toString());
      });
      it("can read all deposits for a ticket", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA2.toString() });
        await lootbox
          .connect(purchaser2)
          .purchaseTicket({ value: buyAmountInEtherB.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();

        const tx1 = await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA1.toString() });
        const tx2 = await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdc_stablecoin.address,
            depositAmountInUSDCB1.toString()
          );

        const receipt1 = await tx1.wait();
        const receipt2 = await tx2.wait();

        const timestamp1 = (await provider.getBlock(receipt1.blockNumber))
          .timestamp;
        const timestamp2 = (await provider.getBlock(receipt2.blockNumber))
          .timestamp;

        const ticketId = "2";
        const [deposit1, deposit2] =
          await lootbox.viewProratedDepositsForTicket(ticketId);

        expect({
          ticketId: deposit1[0].toString(),
          depositId: deposit1[1].toString(),
          redeemed: deposit1[2],
          nativeTokenAmount: deposit1[3].toString(),
          erc20Token: deposit1[4],
          erc20TokenAmount: deposit1[5].toString(),
          timestamp: deposit1[6].toNumber(),
        }).to.deep.eq({
          ticketId,
          depositId: "0",
          redeemed: false,
          nativeTokenAmount: depositAmountInEtherA1.div(2).toString(),
          erc20Token: ethers.constants.AddressZero,
          erc20TokenAmount: "0",
          timestamp: timestamp1,
        });
        expect({
          ticketId: deposit2[0].toString(),
          depositId: deposit2[1].toString(),
          redeemed: deposit2[2],
          nativeTokenAmount: deposit2[3].toString(),
          erc20Token: deposit2[4],
          erc20TokenAmount: deposit2[5].toString(),
          timestamp: deposit2[6].toNumber(),
        }).to.deep.eq({
          ticketId,
          depositId: "1",
          redeemed: false,
          nativeTokenAmount: "0",
          erc20Token: usdc_stablecoin.address,
          erc20TokenAmount: depositAmountInUSDCB1.div(2).toString(),
          timestamp: timestamp2,
        });

        await lootbox.connect(purchaser2).withdrawEarnings(ticketId);

        const tx3 = await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA2.toString() });
        const tx4 = await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdc_stablecoin.address,
            depositAmountInUSDCB2.toString()
          );

        const receipt3 = await tx3.wait();
        const receipt4 = await tx4.wait();

        const timestamp3 = (await provider.getBlock(receipt3.blockNumber))
          .timestamp;
        const timestamp4 = (await provider.getBlock(receipt4.blockNumber))
          .timestamp;

        const [_deposit1, _deposit2, deposit3, deposit4] =
          await lootbox.viewProratedDepositsForTicket(ticketId);

        expect({
          ticketId: _deposit1[0].toString(),
          depositId: _deposit1[1].toString(),
          redeemed: _deposit1[2],
          nativeTokenAmount: _deposit1[3].toString(),
          erc20Token: _deposit1[4],
          erc20TokenAmount: _deposit1[5].toString(),
          timestamp: _deposit1[6].toNumber(),
        }).to.deep.eq({
          ticketId,
          depositId: "0",
          redeemed: true,
          nativeTokenAmount: depositAmountInEtherA1.div(2).toString(),
          erc20Token: ethers.constants.AddressZero,
          erc20TokenAmount: "0",
          timestamp: timestamp1,
        });
        expect({
          ticketId: _deposit2[0].toString(),
          depositId: _deposit2[1].toString(),
          redeemed: _deposit2[2],
          nativeTokenAmount: _deposit2[3].toString(),
          erc20Token: _deposit2[4],
          erc20TokenAmount: _deposit2[5].toString(),
          timestamp: _deposit2[6].toNumber(),
        }).to.deep.eq({
          ticketId,
          depositId: "1",
          redeemed: true,
          nativeTokenAmount: "0",
          erc20Token: usdc_stablecoin.address,
          erc20TokenAmount: depositAmountInUSDCB1.div(2).toString(),
          timestamp: timestamp2,
        });

        expect({
          ticketId: deposit3[0].toString(),
          depositId: deposit3[1].toString(),
          redeemed: deposit3[2],
          nativeTokenAmount: deposit3[3].toString(),
          erc20Token: deposit3[4],
          erc20TokenAmount: deposit3[5].toString(),
          timestamp: deposit3[6].toNumber(),
        }).to.deep.eq({
          ticketId,
          depositId: "2",
          redeemed: false,
          nativeTokenAmount: depositAmountInEtherA2.div(2).toString(),
          erc20Token: ethers.constants.AddressZero,
          erc20TokenAmount: "0",
          timestamp: timestamp3,
        });
        expect({
          ticketId: deposit4[0].toString(),
          depositId: deposit4[1].toString(),
          redeemed: deposit4[2],
          nativeTokenAmount: deposit4[3].toString(),
          erc20Token: deposit4[4],
          erc20TokenAmount: deposit4[5].toString(),
          timestamp: deposit4[6].toNumber(),
        }).to.deep.eq({
          ticketId,
          depositId: "3",
          redeemed: false,
          nativeTokenAmount: "0",
          erc20Token: usdc_stablecoin.address,
          erc20TokenAmount: depositAmountInUSDCB2.div(2).toString(),
          timestamp: timestamp4,
        });
      });
      it("can read all deposits", async () => {
        await lootbox
          .connect(purchaser)
          .purchaseTicket({ value: buyAmountInEtherA1.toString() });
        await lootbox.connect(issuingEntity).endFundraisingPeriod();
        const tx1 = await lootbox
          .connect(issuingEntity)
          .depositEarningsNative({ value: depositAmountInEtherA1.toString() });
        const tx2 = await lootbox
          .connect(issuingEntity)
          .depositEarningsErc20(
            usdc_stablecoin.address,
            depositAmountInUSDCB1.toString()
          );

        const receipt1 = await tx1.wait();
        const receipt2 = await tx2.wait();

        const timestamp1 = (await provider.getBlock(receipt1.blockNumber))
          .timestamp;
        const timestamp2 = (await provider.getBlock(receipt2.blockNumber))
          .timestamp;

        const [deposit1, deposit2] = await lootbox.viewAllDeposits();
        expect({
          depositId: deposit1[0].toString(),
          blockNumber: deposit1[1].toNumber(),
          nativeTokenAmount: deposit1[2].toString(),
          erc20Token: deposit1[3],
          erc20TokenAmount: deposit1[4].toString(),
          timestamp: deposit1[5].toNumber(),
        }).to.deep.eq({
          depositId: "0",
          blockNumber: receipt1.blockNumber,
          nativeTokenAmount: depositAmountInEtherA1.toString(),
          erc20Token: ethers.constants.AddressZero,
          erc20TokenAmount: "0",
          timestamp: timestamp1,
        });
        expect({
          depositId: deposit2[0].toString(),
          blockNumber: deposit2[1].toNumber(),
          nativeTokenAmount: deposit2[2].toString(),
          erc20Token: deposit2[3],
          erc20TokenAmount: deposit2[4].toString(),
          timestamp: deposit2[5].toNumber(),
        }).to.deep.eq({
          depositId: "1",
          blockNumber: receipt2.blockNumber,
          nativeTokenAmount: "0",
          erc20Token: usdc_stablecoin.address,
          erc20TokenAmount: depositAmountInUSDCB1.toString(),
          timestamp: timestamp2,
        });
      });
    });

    describe("incurs fees", async () => {
      beforeEach(async () => {
        await usdc_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );
        await usdc_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );

        await usdt_stablecoin.mint(
          issuingEntity.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );
        await usdt_stablecoin
          .connect(issuingEntity)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );
      });
      describe("purchase ticket fees", async () => {
        it("charges a 2% fee on ticket sales (2% go to broker aka Lootbox Ltd", async () => {
          const startPurchaserBalance = await provider.getBalance(
            purchaser.address
          );
          const startTreasuryBalance = await provider.getBalance(
            entityTreasury.address
          );
          const startBrokerBalance = await provider.getBalance(broker.address);

          expect(await lootbox.ticketIdCounter()).to.eq("0");

          const buyAmountInEtherD = ethers.BigNumber.from(1);
          const tx = await lootbox
            .connect(purchaser)
            .purchaseTicket({ value: buyAmountInEtherD.toString() });
          const receipt = await tx.wait();
          const gasUsed = receipt.cumulativeGasUsed.mul(
            receipt.effectiveGasPrice
          );

          const endPurchaserBalance = await provider.getBalance(
            purchaser.address
          );
          const endTreasuryBalance = await provider.getBalance(
            entityTreasury.address
          );
          const endBrokerBalance = await provider.getBalance(broker.address);

          expect(endPurchaserBalance).to.eq(
            startPurchaserBalance.sub(buyAmountInEtherD).sub(gasUsed)
          );

          const ticketPurchaseFee = ethers.BigNumber.from(TICKET_PURCHASE_FEE);
          const ticketPurchaseFeeAmount = buyAmountInEtherD
            .mul(ticketPurchaseFee)
            .div(
              ethers.BigNumber.from("10").pow(
                ethers.BigNumber.from(FEE_DECIMALS)
              )
            );
          const ticketSalesAfterPurchaseFee = buyAmountInEtherD.sub(
            ticketPurchaseFeeAmount
          );
          expect(endTreasuryBalance.toString()).to.eq(
            startTreasuryBalance.add(ticketSalesAfterPurchaseFee)
          );

          const brokerFee = ticketPurchaseFee;
          const brokerFeeAmount = buyAmountInEtherD
            .mul(brokerFee)
            .div(
              ethers.BigNumber.from("10").pow(
                ethers.BigNumber.from(FEE_DECIMALS)
              )
            );
          expect(endBrokerBalance.toString()).to.eq(
            startBrokerBalance.add(brokerFeeAmount)
          );
        });
        it("emits a InvestmentFundsDispersed event", async () => {
          const ticketId = "0";
          const buyAmountInEtherD = ethers.BigNumber.from(1);
          const estimatedSharesReceived = await lootbox.estimateSharesPurchase(
            buyAmountInEtherD.toString()
          );
          const ticketPurchaseFee = ethers.BigNumber.from(TICKET_PURCHASE_FEE);
          const ticketPurchaseFeeAmount = buyAmountInEtherD
            .mul(ticketPurchaseFee)
            .div(
              ethers.BigNumber.from("10").pow(
                ethers.BigNumber.from(FEE_DECIMALS)
              )
            );
          const treasuryReceivedAmount = buyAmountInEtherD.sub(
            ticketPurchaseFeeAmount
          );

          const brokerFee = ticketPurchaseFee;
          const brokerFeeAmount = buyAmountInEtherD
            .mul(brokerFee)
            .div(
              ethers.BigNumber.from("10").pow(
                ethers.BigNumber.from(FEE_DECIMALS)
              )
            );
          await expect(
            lootbox
              .connect(purchaser)
              .purchaseTicket({ value: buyAmountInEtherD.toString() })
          )
            .to.emit(lootbox, "InvestmentFundsDispersed")
            .withArgs(
              purchaser.address,
              entityTreasury.address,
              broker.address,
              lootbox.address,
              ticketId,
              buyAmountInEtherD.toString(),
              treasuryReceivedAmount,
              brokerFeeAmount,
              estimatedSharesReceived,
              SHARE_PRICE_WEI
            );
        });
      });
    });

    describe("burn", async () => {
      it("no ability to burn NFT tickets", async () => {
        expect("burn" in lootbox).to.be.false;
      });
    });

    describe("🗳 pause()", async () => {
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

    describe("🗳 unpause()", async () => {
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
  });

  // describe("_____", async () => {
  //   it("______", async () => { });
  //   it("______", async () => { });
  //   it("______", async () => { });
  // })
});
