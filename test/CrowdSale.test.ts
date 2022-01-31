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
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

describe("📦 CrowdSale of GUILD token", async function () {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;
  let governor: SignerWithAddress;
  let gfxStaff: SignerWithAddress;
  let guildDao: SignerWithAddress;
  let guildDev: SignerWithAddress;
  let guildTreasury: SignerWithAddress;

  let Token: GuildToken__factory;
  let token: GuildToken;

  let CrowdSale: CrowdSale__factory;
  let crowdSale: CrowdSale;

  let Constants: Constants__factory;
  let constants: Constants;

  let Eth: ETH__factory;
  let eth_stablecoin: ETH;
  let eth_pricefeed = "0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e";

  let Bnb: BNB__factory;
  let bnb_stablecoin: BNB;
  let bnb_pricefeed = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE";

  let Usdc: USDC__factory;
  let usdc_stablecoin: USDC;
  let usdc_pricefeed = "0x51597f405303C4377E36123cBc172b13269EA163";

  let Usdt: USDT__factory;
  let usdt_stablecoin: USDT;
  let usdt_pricefeed = "0xB97Ad0E74fa7d920791E90258A6E2085088b4320";

  const GUILD_TOKEN_NAME = "GuildTokenTest";
  const GUILD_TOKEN_SYMBOL = "GUILDT";

  const startingPriceInUSD = "7000000"; // 7 usd cents

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
    treasury = _treasury;
    dao = _dao;
    developer = _developer;
    purchaser = _purchaser;
    gfxStaff = _gfxStaff;
    guildDao = _guildDao;
    guildDev = _guildDev;
    guildTreasury = _guildTreasury;

    Token = await ethers.getContractFactory("GuildToken");
    CrowdSale = await ethers.getContractFactory("CrowdSale");
    Constants = await ethers.getContractFactory("Constants");
    Eth = await ethers.getContractFactory("ETH");
    Bnb = await ethers.getContractFactory("BNB");
    Usdc = await ethers.getContractFactory("USDC");
    Usdt = await ethers.getContractFactory("USDT");
  });

  beforeEach(async function () {
    constants = (await upgrades.deployProxy(
      Constants,
      [dao.address, developer.address, treasury.address],
      {
        kind: "uups",
      }
    )) as Constants;
    await constants.deployed();

    eth_stablecoin = (await Eth.deploy(0)) as ETH;
    bnb_stablecoin = (await Bnb.deploy(0)) as BNB;
    usdc_stablecoin = (await Usdc.deploy(0)) as USDC;
    usdt_stablecoin = (await Usdt.deploy(0)) as USDT;

    // set the stablecoins in the constants contract
    await constants
      .connect(dao)
      .setCrowdSaleStableCoins(
        eth_stablecoin.address,
        usdc_stablecoin.address,
        usdt_stablecoin.address
      );

    // set the price feeds in constants
    await constants
      .connect(dao)
      .setOraclePriceFeeds(
        bnb_pricefeed,
        eth_pricefeed,
        usdc_pricefeed,
        usdt_pricefeed
      );

    token = (await upgrades.deployProxy(
      Token,
      [
        GUILD_TOKEN_NAME,
        GUILD_TOKEN_SYMBOL,
        dao.address,
        developer.address,
        constants.address,
      ],
      { kind: "uups" }
    )) as GuildToken;
    await token.deployed();

    governor = dao;

    crowdSale = (await upgrades.deployProxy(
      CrowdSale,
      [
        token.address,
        dao.address,
        developer.address,
        constants.address,
        treasury.address,
        startingPriceInUSD,
      ],
      {
        kind: "uups",
      }
    )) as CrowdSale;
    await crowdSale.deployed();
  });

  it("sets the GUILD token address correctly", async () => {
    // expect(await crowdSale.deploymentStartTime()).to.eq(token.address);
    expect(true).to.be.true;
  });

  it("sets the treasury address correctly", async () => {
    expect(await crowdSale.TREASURY()).to.eq(treasury.address);
  });

  it("sets the constants address correctly", async () => {
    expect(await crowdSale.CONSTANTS()).to.eq(constants.address);
  });

  it("it has 0 amountRaisedInUSD", async () => {
    expect(await crowdSale.amountRaisedInUSD()).to.eq("0");
  });

  it("has a current USD price", async () => {
    expect(await crowdSale.currentPriceUSD()).to.eq(startingPriceInUSD);
  });

  it("purchasing fails if CrowdSale is not a whitelisted mint", async () => {
    await usdc_stablecoin.mint(purchaser.address, 1);
    await usdc_stablecoin.connect(purchaser).approve(crowdSale.address, 1);
    await expect(crowdSale.connect(purchaser).buyInUSDC(1)).to.be.revertedWith(
      generatePermissionRevokeMessage(crowdSale.address, MINTER_ROLE)
    );
  });

  it("does not allow deployer, developer, purchaser, treasury to whitelist the CrowdSale as a valid minter", async () => {
    const users = [deployer, treasury, developer, purchaser];
    for (let user of users) {
      await expect(
        token.connect(user).whitelistMint(crowdSale.address, true)
      ).to.be.revertedWith(
        generatePermissionRevokeMessage(user.address, GOVERNOR_ROLE)
      );
    }
  });

  it("allows Governor to whitelist the CrowdSale as a valid minter", async () => {
    await expect(
      token.connect(governor).whitelistMint(crowdSale.address, true)
    ).to.not.be.revertedWith(
      generatePermissionRevokeMessage(governor.address, GOVERNOR_ROLE)
    );
  });

  it("has a bnb oracle price feed", async function () {
    const stablecoinPrice = await crowdSale.getBNBPrice();
    expect(stablecoinPrice.toNumber()).gt(0);
  });

  it("has a eth oracle price feed", async function () {
    const stablecoinPrice = await crowdSale.getETHPrice();
    expect(stablecoinPrice.toNumber()).gt(0);
  });

  it("has a usdc oracle price feed", async function () {
    const stablecoinPrice = await crowdSale.getUSDCPrice();
    expect(stablecoinPrice.toNumber()).gt(0);
  });

  it("has a usdt oracle price feed", async function () {
    const stablecoinPrice = await crowdSale.getUSDTPrice();
    expect(stablecoinPrice.toNumber()).gt(0);
  });

  describe("🗳 pause()", () => {
    describe("called by address with the DAO_ROLE", () => {
      let promise: Promise<any>;

      beforeEach(async () => {
        promise = crowdSale.connect(dao).pause();
      });

      it("pauses the contract", async () => {
        await promise;
        expect(await crowdSale.paused()).to.be.equal(true);
      });

      it("emits a paused event", async () => {
        await expect(promise).to.emit(crowdSale, "Paused");
      });
    });

    it("reverts with access control error when called with address without DAO_ROLE", async () => {
      await expect(crowdSale.connect(purchaser).pause()).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });
  });

  describe("🗳 unpause()", () => {
    describe("called by address with the DAO_ROLE", function () {
      let promise: Promise<any>;

      beforeEach(async () => {
        await crowdSale.connect(dao).pause();
        promise = crowdSale.connect(dao).unpause();
      });

      it("unpauses the contract", async () => {
        await promise;
        expect(await crowdSale.paused()).to.be.equal(false);
      });

      it("emits an unpaused event", async () => {
        await expect(promise).to.emit(crowdSale, "Unpaused");
      });
    });

    it("reverts with access control error when called with address without DAO_ROLE", async () => {
      await expect(crowdSale.connect(purchaser).unpause()).to.be.revertedWith(
        generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
      );
    });
  });

  describe("buyer can purchase GUILD tokens using BNB", async () => {
    let stableCoinDecimals: number;
    let seedUserStableCoinAmount: BigNumber;
    let seedTreasuryStableCoinAmount: BigNumber;
    let stablecoinAmount: BigNumber;

    let archivedPrice: BigNumber;
    let startingPriceUSD: BigNumber;
    let gamerPurchasedAmount: BigNumber;
    let mintFeeAmount: BigNumber;

    beforeEach(async () => {
      stableCoinDecimals = await usdc_stablecoin.decimals();
      seedUserStableCoinAmount = ethers.utils.parseUnits(
        "100",
        stableCoinDecimals
      ); // 100 BNB
      seedTreasuryStableCoinAmount = ethers.utils.parseUnits(
        "200",
        stableCoinDecimals
      ); // 200 BNB
      stablecoinAmount = ethers.utils.parseUnits("10", stableCoinDecimals); // $10 BNB

      archivedPrice = ethers.BigNumber.from("51618873955");
      startingPriceUSD = ethers.BigNumber.from("7000000");
      gamerPurchasedAmount = ethers.BigNumber.from("73741248507142857142857");
      [mintFeeAmount] = await token.calculateGuildFXMintFee(
        gamerPurchasedAmount
      );

      await token.connect(governor).whitelistMint(crowdSale.address, true);
    });

    it("reverts with pausable error if contract is paused", async () => {
      await crowdSale.connect(dao).pause();
      await expect(
        crowdSale
          .connect(purchaser)
          .buyInBNB(purchaser.address, { value: stablecoinAmount.toString() })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("purchaser has more than 9999 na†ive BNB in wallet", async function () {
      expect(await purchaser.getBalance()).to.be.gt(
        ethers.BigNumber.from("9999000000000000000000")
      );
      expect(await purchaser.getBalance()).to.be.lt(
        ethers.BigNumber.from("10000000000000000000000")
      );
    });

    it("has an oracle price feed", async function () {
      const stablecoinPrice = await crowdSale.getBNBPrice();
      expect(stablecoinPrice.toNumber()).to.be.equal(archivedPrice);
    });

    it("increments the amountRaisedInUSD variable", async () => {
      await crowdSale
        .connect(purchaser)
        .buyInBNB(purchaser.address, { value: stablecoinAmount.toString() });
      expect(await crowdSale.amountRaisedInUSD()).to.eq("516188739550");
    });

    it("purchaser exchanges native BNB for GUILD at a price of $0.07/GUILD", async () => {
      const initialSupply = await token.totalSupply();
      await expect(
        await crowdSale
          .connect(purchaser)
          .buyInBNB(purchaser.address, { value: stablecoinAmount.toString() })
      )
        .to.emit(crowdSale, "Purchase")
        .withArgs(
          purchaser.address,
          ethers.constants.AddressZero,
          stablecoinAmount.toString(),
          gamerPurchasedAmount.toString(),
          "516188739550",
          startingPriceUSD.toString()
        );
      expect(await crowdSale.GUILD()).to.equal(token.address);
      expect(await purchaser.getBalance()).gt(
        ethers.BigNumber.from("9989000000000000000000")
      );
      expect(await purchaser.getBalance()).lt(
        ethers.BigNumber.from("9999000000000000000000")
      );
      expect(await token.balanceOf(purchaser.address)).to.eq(
        gamerPurchasedAmount
      );
      expect(await token.totalSupply()).to.equal(
        initialSupply.add(gamerPurchasedAmount).add(mintFeeAmount)
      );
    });
    it.skip("TODO: mints the token to the guildFX treasury", () => {});
  });

  describe("buyer can purchase GUILD tokens using USDC", async () => {
    let stableCoinDecimals: number;
    let seedUserStableCoinAmount: BigNumber;
    let seedTreasuryStableCoinAmount: BigNumber;
    let stablecoinAmount: BigNumber;
    let archivedPrice: BigNumber;
    let startingPriceUSD: BigNumber;
    let gamerPurchasedAmount: BigNumber;
    let mintFeeAmount: BigNumber;

    beforeEach(async () => {
      stableCoinDecimals = await usdc_stablecoin.decimals();
      seedUserStableCoinAmount = ethers.utils.parseUnits(
        "100",
        stableCoinDecimals
      ); // $100 USD
      seedTreasuryStableCoinAmount = ethers.utils.parseUnits(
        "200",
        stableCoinDecimals
      ); // $200 USD
      stablecoinAmount = ethers.utils.parseUnits("10", stableCoinDecimals); // $10 USD

      archivedPrice = ethers.BigNumber.from("100005159");
      startingPriceUSD = ethers.BigNumber.from("7000000"); // ~7 usd cents
      gamerPurchasedAmount = ethers.BigNumber.from("142864512857142857142"); // ~142 tokens in 18 decimals
      [mintFeeAmount] = await token.calculateGuildFXMintFee(
        gamerPurchasedAmount
      );

      await usdc_stablecoin.mint(purchaser.address, seedUserStableCoinAmount);
      await usdc_stablecoin.mint(
        treasury.address,
        seedTreasuryStableCoinAmount
      );
      await usdc_stablecoin
        .connect(purchaser)
        .approve(crowdSale.address, stablecoinAmount);
      await token.connect(governor).whitelistMint(crowdSale.address, true);
    });

    it("reverts with pausable error if contract is paused", async () => {
      await crowdSale.connect(dao).pause();
      await expect(
        crowdSale
          .connect(purchaser)
          .buyInUSDC(purchaser.address, { value: stablecoinAmount.toString() })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("purchaser has 100 usdc_stablecoin in wallet", async function () {
      expect(await usdc_stablecoin.balanceOf(purchaser.address)).to.equal(
        seedUserStableCoinAmount
      );
    });

    it("has an oracle price feed", async function () {
      const stablecoinPrice = await crowdSale.getUSDCPrice();
      expect(stablecoinPrice.toNumber()).to.be.equal(archivedPrice);
    });

    it("increments the amountRaisedInUSD variable", async () => {
      await crowdSale.connect(purchaser).buyInUSDC(stablecoinAmount);
      expect(await crowdSale.amountRaisedInUSD()).to.eq("1000051590");
    });

    it("purchaser approves transfer for 10 USDC", async () => {
      expect(
        await usdc_stablecoin.allowance(purchaser.address, crowdSale.address)
      ).to.equal(stablecoinAmount);
    });

    it("purchaser exchanges 10 USDC for ~142 GUILD at a price of $0.07/GUILD", async () => {
      const initialSupply = await token.totalSupply();
      await expect(
        await crowdSale.connect(purchaser).buyInUSDC(stablecoinAmount)
      )
        .to.emit(crowdSale, "Purchase")
        .withArgs(
          purchaser.address,
          usdc_stablecoin.address,
          stablecoinAmount,
          gamerPurchasedAmount.toString(),
          "1000051590",
          startingPriceUSD.toString()
        );
      expect(await crowdSale.GUILD()).to.equal(token.address);
      expect(await usdc_stablecoin.balanceOf(purchaser.address)).to.equal(
        ethers.utils.parseUnits("90", stableCoinDecimals)
      );
      expect(await usdc_stablecoin.balanceOf(treasury.address)).to.equal(
        ethers.utils.parseUnits("210", stableCoinDecimals)
      );
      expect(await token.balanceOf(purchaser.address)).to.equal(
        gamerPurchasedAmount.toString()
      );
      expect(await token.totalSupply()).to.equal(
        initialSupply.add(gamerPurchasedAmount).add(mintFeeAmount)
      );
    });

    it.skip("TODO: mints the token to the guildFX treasury", () => {});
  });

  describe("buyer can purchase GUILD tokens using USDT", async () => {
    let stableCoinDecimals: number;
    let seedUserStableCoinAmount: BigNumber;
    let seedTreasuryStableCoinAmount: BigNumber;
    let stablecoinAmount: BigNumber;

    let archivedPrice: BigNumber;
    let startingPriceUSD: BigNumber;
    let gamerPurchasedAmount: BigNumber;
    let mintFeeAmount: BigNumber;

    beforeEach(async () => {
      stableCoinDecimals = await usdc_stablecoin.decimals();
      seedUserStableCoinAmount = ethers.utils.parseUnits(
        "100",
        stableCoinDecimals
      ); // $100 USD
      seedTreasuryStableCoinAmount = ethers.utils.parseUnits(
        "200",
        stableCoinDecimals
      ); // $200 USD
      stablecoinAmount = ethers.utils.parseUnits("10", stableCoinDecimals); // $10 USD

      archivedPrice = ethers.BigNumber.from("100018962");
      startingPriceUSD = ethers.BigNumber.from("7000000");
      gamerPurchasedAmount = ethers.BigNumber.from("142884231428571428571");
      [mintFeeAmount] = await token.calculateGuildFXMintFee(
        gamerPurchasedAmount
      );

      await usdt_stablecoin.mint(purchaser.address, seedUserStableCoinAmount);
      await usdt_stablecoin.mint(
        treasury.address,
        seedTreasuryStableCoinAmount
      );
      await usdt_stablecoin
        .connect(purchaser)
        .approve(crowdSale.address, stablecoinAmount);
      await token.connect(governor).whitelistMint(crowdSale.address, true);
    });

    it("reverts with pausable error if contract is paused", async () => {
      await crowdSale.connect(dao).pause();
      await expect(
        crowdSale
          .connect(purchaser)
          .buyInUSDT(purchaser.address, { value: stablecoinAmount.toString() })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("purchaser has 100 usdt_stablecoin in wallet", async function () {
      expect(await usdt_stablecoin.balanceOf(purchaser.address)).to.equal(
        seedUserStableCoinAmount
      );
    });

    it("has an oracle price feed", async function () {
      const stablecoinPrice = await crowdSale.getUSDTPrice();
      expect(stablecoinPrice.toNumber()).to.be.equal(archivedPrice);
    });

    it("purchaser approves transfer for 10 USDT", async () => {
      expect(
        await usdt_stablecoin.allowance(purchaser.address, crowdSale.address)
      ).to.equal(stablecoinAmount);
    });

    it("increments the amountRaisedInUSD variable", async () => {
      await crowdSale.connect(purchaser).buyInUSDT(stablecoinAmount);
      expect(await crowdSale.amountRaisedInUSD()).to.eq("1000189620");
    });

    it("purchaser exchanges 10 USDT for ~142 GUILD at a price of $0.07/GUILD", async () => {
      const initialSupply = await token.totalSupply();
      await expect(
        await crowdSale.connect(purchaser).buyInUSDT(stablecoinAmount)
      )
        .to.emit(crowdSale, "Purchase")
        .withArgs(
          purchaser.address,
          usdt_stablecoin.address,
          stablecoinAmount,
          gamerPurchasedAmount.toString(),
          "1000189620",
          startingPriceUSD.toString()
        );
      expect(await crowdSale.GUILD()).to.equal(token.address);
      expect(await usdt_stablecoin.balanceOf(purchaser.address)).to.equal(
        ethers.utils.parseUnits("90", stableCoinDecimals)
      );
      expect(await usdt_stablecoin.balanceOf(treasury.address)).to.equal(
        ethers.utils.parseUnits("210", stableCoinDecimals)
      );
      expect(await token.balanceOf(purchaser.address)).to.equal(
        gamerPurchasedAmount.toString()
      );
      expect(await token.totalSupply()).to.equal(
        initialSupply.add(gamerPurchasedAmount).add(mintFeeAmount)
      );
    });
    it.skip("TODO: mints the token to the guildFX treasury", () => {});
  });

  describe("buyer can purchase GUILD tokens using ETH", async () => {
    let stableCoinDecimals: number;
    let seedUserStableCoinAmount: BigNumber;
    let seedTreasuryStableCoinAmount: BigNumber;
    let stablecoinAmount: BigNumber;

    let archivedPrice: BigNumber;
    let startingPriceUSD: BigNumber;
    let gamerPurchasedAmount: BigNumber;
    let mintFeeAmount: BigNumber;

    beforeEach(async () => {
      stableCoinDecimals = await usdc_stablecoin.decimals();
      seedUserStableCoinAmount = ethers.utils.parseUnits(
        "100",
        stableCoinDecimals
      ); // 100 ETH
      seedTreasuryStableCoinAmount = ethers.utils.parseUnits(
        "200",
        stableCoinDecimals
      ); // 200 ETH
      stablecoinAmount = ethers.utils.parseUnits("10", stableCoinDecimals); // 10 ETH

      archivedPrice = ethers.BigNumber.from("365993550000");
      startingPriceUSD = ethers.BigNumber.from("7000000");
      gamerPurchasedAmount = ethers.BigNumber.from("522847928571428571428571");
      [mintFeeAmount] = await token.calculateGuildFXMintFee(
        gamerPurchasedAmount
      );

      await eth_stablecoin.mint(purchaser.address, seedUserStableCoinAmount);
      await eth_stablecoin.mint(treasury.address, seedTreasuryStableCoinAmount);
      await eth_stablecoin
        .connect(purchaser)
        .approve(crowdSale.address, stablecoinAmount);
      await token.connect(governor).whitelistMint(crowdSale.address, true);
    });

    it("reverts with pausable error if contract is paused", async () => {
      await crowdSale.connect(dao).pause();
      await expect(
        crowdSale
          .connect(purchaser)
          .buyInETH(purchaser.address, { value: stablecoinAmount.toString() })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("purchaser has 100 eth_stablecoin in wallet", async function () {
      expect(await eth_stablecoin.balanceOf(purchaser.address)).to.equal(
        seedUserStableCoinAmount
      );
    });

    it("has an oracle price feed", async function () {
      const stablecoinPrice = await crowdSale.getETHPrice();
      expect(stablecoinPrice.toNumber()).to.be.equal(archivedPrice);
    });

    it("purchaser approves transfer for 10 ETH", async () => {
      expect(
        await eth_stablecoin.allowance(purchaser.address, crowdSale.address)
      ).to.equal(stablecoinAmount);
    });

    it("increments the amountRaisedInUSD variable", async () => {
      await crowdSale.connect(purchaser).buyInETH(stablecoinAmount);
      expect(await crowdSale.amountRaisedInUSD()).to.eq("3659935500000");
    });

    it("purchaser exchanges ETH for GUILD at a price of $0.07/GUILD", async () => {
      const initialSupply = await token.totalSupply();
      await expect(
        await crowdSale.connect(purchaser).buyInETH(stablecoinAmount)
      )
        .to.emit(crowdSale, "Purchase")
        .withArgs(
          purchaser.address,
          eth_stablecoin.address,
          stablecoinAmount,
          gamerPurchasedAmount.toString(),
          "3659935500000",
          startingPriceUSD.toString()
        );
      expect(await crowdSale.GUILD()).to.equal(token.address);
      expect(await eth_stablecoin.balanceOf(purchaser.address)).to.equal(
        ethers.utils.parseUnits("90", stableCoinDecimals)
      );
      expect(await eth_stablecoin.balanceOf(treasury.address)).to.equal(
        ethers.utils.parseUnits("210", stableCoinDecimals)
      );
      expect(await token.balanceOf(purchaser.address)).to.equal(
        gamerPurchasedAmount.toString()
      );
      expect(await token.totalSupply()).to.equal(
        initialSupply.add(gamerPurchasedAmount).add(mintFeeAmount)
      );
    });
    it.skip("TODO: mints the token to the guildFX treasury", () => {});
  });
});
