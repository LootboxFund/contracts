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
  const USDT_STARTING_BALANCE = "10000000000000000000000"

  const buyAmountInEtherA1 = ethers.utils.parseUnits("0.1", "ether");
  const buyAmountInEtherA2 = ethers.utils.parseUnits("0.00013560931", "ether")
  const buyAmountInEtherB = ethers.utils.parseUnits("0.10013560931", "ether");  // equal to 50% if (A1+A2+B). becomes 25% when (A1+A2+B+C)
  const buyAmountInEtherC = ethers.utils.parseUnits("0.20027121862", "ether");  // equal to 50% if (A1+A2+B+C)

  const depositAmountInEtherA1 = ethers.utils.parseUnits("1", "ether");
  const depositAmountInEtherA2 = ethers.utils.parseUnits("0.5", "ether")

  const depositAmountInUSDCB1 = ethers.utils.parseUnits("100", "ether");
  const depositAmountInUSDCB2 = ethers.utils.parseUnits("70", "ether")

  const depositAmountInUSDTC1 = ethers.utils.parseUnits("30", "ether")
  const depositAmountInUSDTC2 = ethers.utils.parseUnits("5", "ether")

  const provider = waffle.provider;

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

    Bnb = await ethers.getContractFactory("BNB");
    Lootbox = await ethers.getContractFactory("Lootbox");

    Usdc = await ethers.getContractFactory("USDC");
    Usdt = await ethers.getContractFactory("USDT");
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
    it("starts with zero native token raised", async () => {
      expect(await lootbox.nativeTokenRaisedTotal()).to.eq("0");
    });
    it("ownership of the NFT changes properly", async () => {
      const ticketId = "0"
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(purchaser).transferFrom(purchaser.address, purchaser2.address, ticketId);
    });
    it("only the owner of the NFT can change the ownership", async () => {
      const ticketId = "0"
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      expect(lootbox.connect(purchaser2).transferFrom(purchaser.address, purchaser2.address, ticketId)).to.be.revertedWith("ERC721: transfer caller is not owner nor approved")
    })
    it("burning lootbox tickets reduces total shares", async () => {

    })
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

    let purchasers: string[] = [];
    
    let ticketsA: BigNumber[] = [];
    let ticketsB: BigNumber[] = [];

    let sharesOwnedA1: BigNumber;
    let percentageOwnedA1: BigNumber;
    let sharePriceUSDA: BigNumber;

    let sharesOwnedA2: BigNumber;
    let percentageOwnedA2: BigNumber;

    let sharesOwnedB: BigNumber;
    let percentageOwnedB: BigNumber;
    let sharePriceUSDB: BigNumber;

    const buyAmountInEtherA3 = ethers.utils.parseUnits("0.2", "ether");

    beforeEach(async () => {

      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA2.toString() })
      await lootbox.connect(purchaser2).purchaseTicket({ value: buyAmountInEtherB.toString() }) // equal to 50%

      purchasers = await lootbox.viewPurchasers()

      ticketsA = await lootbox.viewAllTicketsOfHolder(purchaser.address);
      ticketsB = await lootbox.viewAllTicketsOfHolder(purchaser2.address);

      [sharesOwnedA1, percentageOwnedA1, sharePriceUSDA] = await lootbox.viewTicketInfo(ticketsA[0]);
      [sharesOwnedA2, percentageOwnedA2] = await lootbox.viewTicketInfo(ticketsA[1]);
      [sharesOwnedB, percentageOwnedB, sharePriceUSDB] = await lootbox.viewTicketInfo(ticketsB[0]);

    })
    it("treasury receives the money & reduces the purchasers native token balance accordingly", async () => {
      const startTreasuryBalance = await provider.getBalance(entityTreasury.address)
      const startPurchaserBalance = await provider.getBalance(purchaser2.address)
      expect(await lootbox.ticketIdCounter()).to.eq("3");
      const tx = await lootbox.connect(purchaser2).purchaseTicket({ value: buyAmountInEtherC.toString() }) 
      const receipt = await tx.wait();
      const gasUsed = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice)
      const endTreasuryBalance = await provider.getBalance(entityTreasury.address)
      const endPurchaserBalance = await provider.getBalance(purchaser2.address)
      expect(endTreasuryBalance.toString()).to.eq(
        startTreasuryBalance
          .add(buyAmountInEtherC)
          .toString()
      )
      expect(endPurchaserBalance.toString()).to.eq(
        startPurchaserBalance
          .sub(buyAmountInEtherC)
          .sub(gasUsed)
          .toString()
      )
    });
    it("viewAllTicketsOfHolder() => can view all the NFT tickets owned by an address", async () => {
      expect(ticketsA[0]).to.eq("0");
      expect(ticketsA[1]).to.eq("1");
      expect(ticketsA.length).to.eq(2)
      expect(ticketsB[0]).to.eq("2");
      expect(ticketsB[1]).to.eq(undefined);
      expect(ticketsB.length).to.eq(1)
    })
    it("tracks the proper amount of shares owned by each NFT ticket", async () => {
      expect(sharesOwnedA1.toString()).to.eq(buyAmountInEtherA1.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD));
      expect(sharesOwnedA2.toString()).to.eq(buyAmountInEtherA2.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD));
      expect(sharesOwnedB.toString()).to.eq(buyAmountInEtherB.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD));
    })
    it("tracks the proper percentage of total shares owned by each NFT ticket", async () => {
      expect(percentageOwnedA1.toString()).to.eq("49932287");
      expect(percentageOwnedA2.toString()).to.eq("67712");
      expect(percentageOwnedB.toString()).to.eq("50000000");
    })
    it("has a consistent share price per ticket", async () => {
      expect(sharePriceUSDA.toString()).to.eq(SHARE_PRICE_USD);
      expect(sharePriceUSDB.toString()).to.eq(SHARE_PRICE_USD);
      expect(sharePriceUSDA.toString()).to.eq(sharePriceUSDB.toString());
    })
    it("ticketId is incremented", async () => {
      expect(await lootbox.ticketIdCounter()).to.eq("3");
      await lootbox.connect(purchaser2).purchaseTicket({ value: buyAmountInEtherC.toString() }) // equal to 50%
      expect(await lootbox.ticketIdCounter()).to.eq("4");
    })
    it("increments the sharesSoldCount", async () => {
      const a1 = buyAmountInEtherA1.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD);
      const a2 = buyAmountInEtherA2.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD);
      const b = buyAmountInEtherB.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD)
      expect((await lootbox.sharesSoldCount()).toString()).to.eq(a1.add(a2).add(b))
    });
    it("increments the nativeTokenRaisedTotal", async () => {
      expect((await lootbox.nativeTokenRaisedTotal()).toString()).to.eq(buyAmountInEtherA1.add(buyAmountInEtherA2).add(buyAmountInEtherB))
    });
    it("emits a purchase event", async () => {
      await expect(
        await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA3.toString() })
      )
        .to.emit(lootbox, "MintTicket")
        .withArgs(
          purchaser.address,
          entityTreasury.address,
          lootbox.address,
          "3",
          buyAmountInEtherA3.mul(BNB_ARCHIVED_PRICE).div(SHARE_PRICE_USD),
          SHARE_PRICE_USD
        );
    });
    it("viewPurchasers() => tracks an EnumerableSet of addresses of purchasers", async () => {
      expect(purchasers.length).to.eq(2);
      expect(purchasers[0]).to.eq(padAddressTo32Bytes(purchaser.address));
      expect(purchasers[1]).to.eq(padAddressTo32Bytes(purchaser2.address));
    });
    it("sending ether direct to lootbox is not a valid purchase nor a valid deposit", async () => {
      // TODO: 
    })
  });

  describe("depositing payout", async () => {
    beforeEach(async () => {
      await usdc_stablecoin.mint(issuingEntity.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      await usdc_stablecoin.connect(issuingEntity).approve(lootbox.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      
      await usdt_stablecoin.mint(issuingEntity.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      await usdt_stablecoin.connect(issuingEntity).approve(lootbox.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
    })
    it("deposits are not allowed if no shares have been sold", async () => {
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      await expect(
        lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      ).to.be.revertedWith("No shares have been sold. Deposits will not be accepted");
      await expect(
        lootbox.connect(issuingEntity).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB1.toString())
      ).to.be.revertedWith("No shares have been sold. Deposits will not be accepted")
    })
    it("anyone can deposit into a Lootbox", async () => {
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      await expect(
        lootbox.connect(deployer).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      ).to.not.be.reverted;
      await expect(
        lootbox.connect(issuingEntity).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB1.toString())
      ).to.not.be.reverted;
    });
    it("depositEarningsNative() => can deposit native token into Lootbox and emits a Deposit event", async () => {
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      const expectedDepositId = "0"
      // native token
      await expect(
        lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      ).to.emit(lootbox, "DepositEarnings")
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
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      const expectedDepositId = "0"
      // erc20 token
      await expect(
        lootbox.connect(issuingEntity).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB1.toString())
      ).to.emit(lootbox, "DepositEarnings")
      .withArgs(
        issuingEntity.address,
        lootbox.address,
        expectedDepositId,
        "0",
        usdc_stablecoin.address,
        depositAmountInUSDCB1.toString()
      );
    });
    it("sending ether direct to lootbox address is not a valid deposit. funds will get trapped", async () => {
      // TODO: 
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      const tx = await issuingEntity.sendTransaction({
        to: lootbox.address,
        value: ethers.utils.parseEther("1")
      })
      
    })
    it("not possible to deposit both native tokens & erc20 in the same transaction", async () => {
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      await expect(
        lootbox.connect(deployer).depositEarningsErc20(
          usdc_stablecoin.address,
          depositAmountInUSDCB1.toString(),
          { value: depositAmountInEtherA1.toString() }
        )
      ).to.be.revertedWith("Deposits of erc20 cannot also include native tokens in the same transaction");
    })
    it("treasury cannot purchase tickets", async () => {
      expect(
        lootbox.connect(entityTreasury).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      ).to.be.revertedWith("Treasury cannot purchase tickets");
    })
    it("deposits will increment the depositId", async () => {
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      await lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      expect(await lootbox.depositIdCounter()).to.eq("1")
      await lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA2.toString() })
      expect(await lootbox.depositIdCounter()).to.eq("2")
    });
    it("viewDepositedTokens() => tracks an EnumerableSet of all erc20 tokens paid out", async () => {
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      await lootbox.connect(issuingEntity).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB1.toString())
      await lootbox.connect(issuingEntity).depositEarningsErc20(usdt_stablecoin.address, depositAmountInUSDCB1.toString())
      const [a, b] = await lootbox.viewDepositedTokens()
      expect(a).to.eq(padAddressTo32Bytes(usdc_stablecoin.address))
      expect(b).to.eq(padAddressTo32Bytes(usdt_stablecoin.address))
    });
    it("trapped tokens are able to be flushed back to treasury", async () => {
      // when sending ether or erc20 tokens directly to the lootbox address, the funds will get trapped
      // ether & erc20 tokens must be deposited using their specified functions (depositEarningsNative() & depositEarningsErc20())
      // in this case, we allow the treasury to flush the trapped tokens back to the treasury (NOT the issuer as we dont have that data)

      // steps
      // 1. iterate through past deposits and sum the amounts
      // 2. compare the deposits vs lootbox balance
      // 3. the difference should be the trapped tokens
      // 4. the treasury can then flush the trapped tokens back to the treasury and emit an event RescueTrappedTokens
      // 5. same process for erc20, but an address must be provided
    })
  })

  describe("withdrawing payout", async () => {

    beforeEach(async () => {

      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA2.toString() })
      await lootbox.connect(purchaser2).purchaseTicket({ value: buyAmountInEtherB.toString() })   // equal to 50%

      await lootbox.connect(issuingEntity).endFundraisingPeriod();

      await lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA1.toString() });
      await lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA2.toString() });

      await usdc_stablecoin.mint(issuingEntity.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      await usdc_stablecoin.connect(issuingEntity).approve(lootbox.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      await lootbox.connect(issuingEntity).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB1.toString())
      await lootbox.connect(issuingEntity).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB2.toString())
      
      await usdt_stablecoin.mint(issuingEntity.address, ethers.BigNumber.from(USDT_STARTING_BALANCE));
      await usdt_stablecoin.connect(issuingEntity).approve(lootbox.address, ethers.BigNumber.from(USDT_STARTING_BALANCE));
      await lootbox.connect(issuingEntity).depositEarningsErc20(usdt_stablecoin.address, depositAmountInUSDTC1.toString())

    })
    
    it("correct amount of native token is withdrawn to owners wallet", async () => {
      const ticketId = "2" // gets 50% of deposits
      const oldNativeBalance = await provider.getBalance(purchaser2.address);
      expect(await lootbox.ticketIdCounter()).to.eq("3"); // 3 total tickets bought
      expect(await lootbox.depositIdCounter()).to.eq("5"); // 4 total deposits made
      const tx = await lootbox.connect(purchaser2).withdrawEarnings(ticketId);
      const receipt = await tx.wait();
      const gasUsed = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice)
      const newNativeBalance = await provider.getBalance(purchaser2.address);
      const expectedNativeBalance = oldNativeBalance
        .sub(gasUsed)
        .add(depositAmountInEtherA1.div(2)) // half of total shares are in ticket2 owned by purchaser2
        .add(depositAmountInEtherA2.div(2)) // half of total shares are in ticket2 owned by purchaser2
      expect(newNativeBalance.toString()).to.eq(
        expectedNativeBalance.toString()
      )
    });
    it("only the owner of the NFT can withdraw with it", async () => {
      expect(
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
        .add(depositAmountInUSDCB2.div(2))
      const newUsdcBalance = await usdc_stablecoin.balanceOf(purchaser2.address);
      expect(expectedApproxBalance.toString()).to.eq(
        newUsdcBalance.toString()
      )
    });
    it("emits a withdraw event", async () => {
      const ticketId = "2"
      const tx = await lootbox.connect(purchaser2).withdrawEarnings(ticketId);
      const events = (await tx.wait()).events || [];
      const depositsForPurchaser2 = [
        { nativeTokenAmount: depositAmountInEtherA1.div(2), erc20Token: ethers.constants.AddressZero, erc20Amount: "0" },
        { nativeTokenAmount: depositAmountInEtherA2.div(2), erc20Token: ethers.constants.AddressZero, erc20Amount: "0" },
        { nativeTokenAmount: "0", erc20Token: usdc_stablecoin.address, erc20Amount: depositAmountInUSDCB1.div(2) },
        { nativeTokenAmount: "0", erc20Token: usdc_stablecoin.address, erc20Amount: depositAmountInUSDCB2.div(2) },
        { nativeTokenAmount: "0", erc20Token: usdt_stablecoin.address, erc20Amount: depositAmountInUSDTC1.div(2) }
      ]
      let expectedDepositId = 0;
      for (const event of events) {
        if (event.args) {
          const { withdrawer, lootbox: lootboxAddr, ticketId, depositId, nativeTokenAmount, erc20Token, erc20Amount } = event.args;
          expect(withdrawer).to.eq(purchaser2.address);
          expect(lootboxAddr).to.eq(lootbox.address);
          expect(ticketId).to.eq(ticketId);
          expect(depositId).to.eq(expectedDepositId);
          expect(nativeTokenAmount).to.eq(depositsForPurchaser2[depositId].nativeTokenAmount);
          expect(erc20Token).to.eq(depositsForPurchaser2[depositId].erc20Token);
          expect(erc20Amount).to.eq(depositsForPurchaser2[depositId].erc20Amount);
          expectedDepositId++;
        }
      }
    });
    it("withdrawing will withdraw from all past unredeemed deposits and not double withdraw from already withdrawn deposits", async () => {
      const ticketId = "2"
      const tx1 = await lootbox.connect(purchaser2).withdrawEarnings(ticketId);
      const events1 = (await tx1.wait()).events || [];
      expect(events1.filter(e => e.args).length).to.eq(5);
      await lootbox.connect(issuingEntity).depositEarningsErc20(usdt_stablecoin.address, depositAmountInUSDTC2.toString())
      const tx2 = await lootbox.connect(purchaser2).withdrawEarnings(ticketId);
      const events2 = (await tx2.wait()).events || [];
      expect(events2.filter(e => e.args).length).to.eq(1);
      for (const event of events2) {
        if (event.args) {
          const { withdrawer, lootbox: lootboxAddr, ticketId, depositId, nativeTokenAmount, erc20Token, erc20Amount } = event.args;
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
      const ticketId = "2"
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
  })

  describe("limitations during fundraising period", async () => {
    beforeEach(async () => {
      await usdc_stablecoin.mint(issuingEntity.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      await usdc_stablecoin.connect(issuingEntity).approve(lootbox.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      
      await usdt_stablecoin.mint(issuingEntity.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      await usdt_stablecoin.connect(issuingEntity).approve(lootbox.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
    })
    it("purchase succeeds if during fundraising period", async () => {
      await expect(
        lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      ).to.not.be.reverted;
    });
    it("purchase fails if outside fundraising period", async () => {
      await lootbox.connect(issuingEntity).endFundraisingPeriod()
      await expect(
        lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      ).to.be.revertedWith("Tickets cannot be purchased after the fundraising period");
    });
    it("deposit succeeds if outside fundraising period", async () => {
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod()
      await expect(
        lootbox.connect(issuingEntity).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB1.toString())
      ).to.not.be.reverted;
      await expect(
        lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      ).to.not.be.reverted;
    });
    it("deposit fails if during fundraising period", async () => {
      await expect(
        lootbox.connect(purchaser).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB1.toString())
      ).to.be.revertedWith("Deposits cannot be made during fundraising period");
      await expect(
        lootbox.connect(purchaser).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      ).to.be.revertedWith("Deposits cannot be made during fundraising period");
    });
    it("withdrawal fails if during fundraising period", async () => {
      const ticketId = "0"
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      expect(lootbox.withdrawEarnings(ticketId)).to.be.revertedWith("Withdrawals cannot be made during fundraising period")
    });
    it("withdrawal succeeds if outside fundraising period", async () => {
      const ticketId = "0"
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod()
      await lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      expect(lootbox.connect(purchaser).withdrawEarnings(ticketId)).to.not.be.reverted
    });
    it("endFundraisingPeriod() => only allows the issuingEntity to end the fundraising period", async () => {
      expect(lootbox.connect(deployer).endFundraisingPeriod()).to.be.revertedWith(generatePermissionRevokeMessage(deployer.address, DAO_ROLE))
      expect(lootbox.connect(issuingEntity).endFundraisingPeriod()).to.not.be.reverted
    });
    it("endFundraisingPeriod() => cannot be called twice", async () => {
      await lootbox.connect(issuingEntity).endFundraisingPeriod()
      expect(lootbox.connect(issuingEntity).endFundraisingPeriod()).to.be.revertedWith("Fundraising period has already ended")
    })
  })

  describe("reading info from Lootbox", async () => {
    beforeEach(async () => {
      await usdc_stablecoin.mint(issuingEntity.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      await usdc_stablecoin.connect(issuingEntity).approve(lootbox.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      
      await usdt_stablecoin.mint(issuingEntity.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
      await usdt_stablecoin.connect(issuingEntity).approve(lootbox.address, ethers.BigNumber.from(USDC_STARTING_BALANCE));
    })
    it("can read info about a specific Ticket", async () => {
      const ticketId = "0"
      const shareOwnershipPercentageDecimals = "8"
      const estimatedSharesReceived = await lootbox.estimateSharesPurchase(buyAmountInEtherA1.toString())
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      const [sharesReceived, percentageSharesOwned] = await lootbox.viewTicketInfo(ticketId);

      expect(sharesReceived.toString()).to.eq(estimatedSharesReceived.toString());
      expect(percentageSharesOwned.toString()).to.eq(ethers.utils.parseUnits("1", shareOwnershipPercentageDecimals))

      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA2.toString() })
      const est3 = await lootbox.estimateSharesPurchase(buyAmountInEtherB.toString())
      await lootbox.connect(purchaser2).purchaseTicket({ value: buyAmountInEtherB.toString() })
      const [rec3, per3] = await lootbox.viewTicketInfo("2");
      expect(est3.toString()).to.eq(rec3.toString());
      expect(per3.toString()).to.eq(ethers.utils.parseUnits("0.5", shareOwnershipPercentageDecimals))
    });
    it("viewPurchasers() => can list out all investors", async () => {
      const beforePurchasers = await lootbox.viewPurchasers()
      expect(beforePurchasers).to.deep.eq([])
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(purchaser2).purchaseTicket({ value: buyAmountInEtherB.toString() })
      const afterPurchasers = await lootbox.viewPurchasers()
      expect(afterPurchasers).to.deep.eq([
        padAddressTo32Bytes(purchaser.address),
        padAddressTo32Bytes(purchaser2.address)
      ])
    });
    it("viewDepositedTokens() => can list out all erc20 tokens deposited", async () => {  
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      await lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB1.toString())
    
      const depositedTokens1 = await lootbox.viewDepositedTokens();
      expect(depositedTokens1).to.deep.eq([
        padAddressTo32Bytes(usdc_stablecoin.address)
      ])

      await lootbox.connect(issuingEntity).depositEarningsErc20(usdt_stablecoin.address, depositAmountInUSDTC1.toString())
      const depositedTokens2 = await lootbox.viewDepositedTokens();
      expect(depositedTokens2).to.deep.eq([
        padAddressTo32Bytes(usdc_stablecoin.address),
        padAddressTo32Bytes(usdt_stablecoin.address)
      ])
    });
    it("can query the total amount deposited in native token", async () => {
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      expect(await lootbox.viewTotalDepositOfNativeToken()).to.eq(ethers.BigNumber.from(0))
      await lootbox.connect(issuingEntity).depositEarningsNative({ value: depositAmountInEtherA1.toString() })
      expect(await lootbox.viewTotalDepositOfNativeToken()).to.eq(depositAmountInEtherA1)
    });
    it("can query the total amount deposited in a specific erc20 token", async () => {
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(issuingEntity).endFundraisingPeriod();
      await lootbox.connect(issuingEntity).depositEarningsErc20(usdc_stablecoin.address, depositAmountInUSDCB1.toString())
      await lootbox.connect(issuingEntity).depositEarningsErc20(usdt_stablecoin.address, depositAmountInUSDTC1.toString())
      const tdUSDC = await lootbox.viewTotalDepositOfErc20Token(usdc_stablecoin.address)
      expect(tdUSDC).to.eq(depositAmountInUSDCB1)
      const tdUSDT = await lootbox.viewTotalDepositOfErc20Token(usdt_stablecoin.address)
      expect(tdUSDT).to.eq(depositAmountInUSDTC1)
    });
    it("viewAllTicketsOfHolder()", async () => {
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA1.toString() })
      await lootbox.connect(purchaser).purchaseTicket({ value: buyAmountInEtherA2.toString() })
      await lootbox.connect(purchaser2).purchaseTicket({ value: buyAmountInEtherB.toString() })

      const ticketsOfPurchaser1 = await lootbox.viewAllTicketsOfHolder(purchaser.address);
      const ticketsOfPurchaser2 = await lootbox.viewAllTicketsOfHolder(purchaser2.address);

      const [ticketId1, ticketId2] = ticketsOfPurchaser1;
      const [ticketId3] = ticketsOfPurchaser2;
      expect(ticketId1.toString()).to.eq("0");
      expect(ticketId2.toString()).to.eq("1");
      expect(ticketId3.toString()).to.eq("2");
    });
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
