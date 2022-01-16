import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  DAO_ROLE,
  generatePermissionRevokeMessage,
  MINTER_ROLE,
} from "./helpers/test-helpers";

/* eslint-disable */
import {
  BNB,
  BNB__factory,
  CrowdSale,
  CrowdSale__factory,
  DAI,
  DAI__factory,
  ETH,
  ETH__factory,
  GuildToken,
  GuildToken__factory,
  USDC,
  USDC__factory,
  USDT,
  USDT__factory,
  UST,
  UST__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

declare module "mocha" {
  export interface Suite {
    // TODO: get explicit typing
    GuildToken: any;
    token: any;
  }
}

describe("📦 CrowdSale of GUILD token", async function () {
  let deployer: SignerWithAddress;
  let treasury: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let dao: SignerWithAddress;
  let developer: SignerWithAddress;

  let Token: GuildToken__factory;
  let token: GuildToken;

  let CrowdSale: CrowdSale__factory;
  let crowdSale: CrowdSale;

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

  let Ust: UST__factory;
  let ust_stablecoin: UST;
  let ust_pricefeed = "0xcbf8518F8727B8582B22837403cDabc53463D462";

  let Dai: DAI__factory;
  let dai_stablecoin: DAI;
  let dai_pricefeed = "0x132d3C0B1D2cEa0BC552588063bdBb210FDeecfA";

  const GUILD_TOKEN_NAME = "GuildTokenTest";
  const GUILD_TOKEN_SYMBOL = "GUILDT";

  const startingPriceInUSDCents = 7;

  before(async function () {
    [deployer, treasury, dao, developer, purchaser] = await ethers.getSigners();
    Token = await ethers.getContractFactory("GuildToken");
    CrowdSale = await ethers.getContractFactory("CrowdSale");
    Eth = await ethers.getContractFactory("ETH");
    Bnb = await ethers.getContractFactory("BNB");
    Usdc = await ethers.getContractFactory("USDC");
    Usdt = await ethers.getContractFactory("USDT");
    Ust = await ethers.getContractFactory("UST");
    Dai = await ethers.getContractFactory("DAI");
  });

  beforeEach(async function () {
    token = (await upgrades.deployProxy(
      Token,
      [GUILD_TOKEN_NAME, GUILD_TOKEN_SYMBOL, dao.address, developer.address],
      { kind: "uups" }
    )) as GuildToken;
    await token.deployed();

    crowdSale = (await upgrades.deployProxy(
      CrowdSale,
      [
        token.address,
        dao.address,
        developer.address,
        treasury.address,
        startingPriceInUSDCents,
      ],
      {
        kind: "uups",
      }
    )) as CrowdSale;
    await crowdSale.deployed();

    eth_stablecoin = (await Eth.deploy(0)) as ETH;
    bnb_stablecoin = (await Bnb.deploy(0)) as BNB;
    usdc_stablecoin = (await Usdc.deploy(0)) as USDC;
    usdt_stablecoin = (await Usdt.deploy(0)) as USDT;
    ust_stablecoin = (await Ust.deploy(0)) as UST;
    dai_stablecoin = (await Dai.deploy(0)) as DAI;

    // set the stablecoins in crowdsale
    await crowdSale
      .connect(dao)
      .setStablecoins(
        eth_stablecoin.address,
        usdc_stablecoin.address,
        usdt_stablecoin.address,
        ust_stablecoin.address,
        dai_stablecoin.address
      );

    // set the price feeds in crowdsale
    await crowdSale
      .connect(dao)
      .setOracles(
        bnb_pricefeed,
        eth_pricefeed,
        usdc_pricefeed,
        usdt_pricefeed,
        ust_pricefeed,
        dai_pricefeed
      );
  });

  it("sets the GUILD token address correctly", async function () {
    expect(await crowdSale.GUILD()).to.eq(token.address);
  });

  it("sets the treasury address correctly", async function () {
    expect(await crowdSale.TREASURY()).to.eq(treasury.address);
  });

  it("only allows DAO to set stablecoins and pricefeeds", async function () {
    await expect(
      crowdSale
        .connect(purchaser)
        .setStablecoins(
          eth_stablecoin.address,
          usdc_stablecoin.address,
          usdt_stablecoin.address,
          ust_stablecoin.address,
          dai_stablecoin.address
        )
    ).to.be.revertedWith(
      generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
    );
    await expect(
      crowdSale
        .connect(dao)
        .setStablecoins(
          eth_stablecoin.address,
          usdc_stablecoin.address,
          usdt_stablecoin.address,
          ust_stablecoin.address,
          dai_stablecoin.address
        )
    ).to.not.be.revertedWith(
      generatePermissionRevokeMessage(dao.address, DAO_ROLE)
    );
    await expect(
      crowdSale
        .connect(purchaser)
        .setOracles(
          bnb_pricefeed,
          eth_pricefeed,
          usdc_pricefeed,
          usdt_pricefeed,
          ust_pricefeed,
          dai_pricefeed
        )
    ).to.be.revertedWith(
      generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
    );
    await expect(
      crowdSale
        .connect(dao)
        .setOracles(
          bnb_pricefeed,
          eth_pricefeed,
          usdc_pricefeed,
          usdt_pricefeed,
          ust_pricefeed,
          dai_pricefeed
        )
    ).to.not.be.revertedWith(
      generatePermissionRevokeMessage(dao.address, DAO_ROLE)
    );
  });

  it("allows DAO to change the currentPriceInUSDCents", async function () {
    expect(await crowdSale.getCurrentUSDPriceInCents()).to.eq(
      startingPriceInUSDCents
    );
    await expect(
      crowdSale.connect(purchaser).setCurrentUSDPriceInCents(8)
    ).to.be.revertedWith(
      generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
    );
    await expect(
      crowdSale.connect(dao).setCurrentUSDPriceInCents(8)
    ).to.not.be.revertedWith(
      generatePermissionRevokeMessage(crowdSale.address, DAO_ROLE)
    );
    expect(await crowdSale.getCurrentUSDPriceInCents()).to.eq(8);
  });

  it("purchasing fails if CrowdSale is not a whitelisted mint", async () => {
    await usdc_stablecoin.mint(purchaser.address, 1);
    await usdc_stablecoin.connect(purchaser).approve(crowdSale.address, 1);
    await expect(crowdSale.connect(purchaser).buyInUSDC(1)).to.be.revertedWith(
      generatePermissionRevokeMessage(crowdSale.address, MINTER_ROLE)
    );
  });

  it("allows DAO to whitelist the CrowdSale as a valid minter", async () => {
    await expect(
      token.connect(dao).whitelistMint(crowdSale.address, true)
    ).to.not.be.revertedWith(
      generatePermissionRevokeMessage(crowdSale.address, DAO_ROLE)
    );
  });

  describe("pause()", () => {
    describe("called by address with the GOVERNOR_ROLE", () => {
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

  describe("unpause()", () => {
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

  describe("buyer can purchase GUILD tokens using USDC", async () => {
    let stableCoinDecimals: number;
    let seedUserStableCoinAmount: BigNumber;
    let seedTreasuryStableCoinAmount: BigNumber;
    let stablecoinAmount: BigNumber;

    let archivedPrice: BigNumber;
    let startingPriceUSDCents: BigNumber;
    let gamerPurchasedAmount: BigNumber;

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
      startingPriceUSDCents = ethers.BigNumber.from(7);
      gamerPurchasedAmount = stablecoinAmount
        .mul(Math.pow(10, 18 - stableCoinDecimals)) // Converts stablecoins
        .mul(archivedPrice)
        .div(startingPriceUSDCents)
        .div(Math.pow(10, 8 - 2)); // Converts USD cents to 8 decimal

      await usdc_stablecoin.mint(purchaser.address, seedUserStableCoinAmount);
      await usdc_stablecoin.mint(
        treasury.address,
        seedTreasuryStableCoinAmount
      );
      await usdc_stablecoin
        .connect(purchaser)
        .approve(crowdSale.address, stablecoinAmount);
      await token.connect(dao).whitelistMint(crowdSale.address, true);
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
      const archivedPrice = 100005159;
      expect(stablecoinPrice.toNumber()).to.be.equal(archivedPrice);
    });

    it("purchaser approves transfer for 10 USDC", async () => {
      expect(
        await usdc_stablecoin.allowance(purchaser.address, crowdSale.address)
      ).to.equal(stablecoinAmount);
    });

    it("purchaser exchanges 10 USDC for ~142 GUILD at a price of $0.07/GUILD", async () => {
      await expect(
        await crowdSale.connect(purchaser).buyInUSDC(stablecoinAmount)
      )
        .to.emit(crowdSale, "Purchase")
        .withArgs(
          purchaser.address,
          usdc_stablecoin.address,
          stablecoinAmount,
          gamerPurchasedAmount.toString(),
          startingPriceUSDCents.toString()
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
        gamerPurchasedAmount.toString()
      );
    });
  });

  describe("buyer can purchase GUILD tokens using USDT", async () => {
    let stableCoinDecimals: number;
    let seedUserStableCoinAmount: BigNumber;
    let seedTreasuryStableCoinAmount: BigNumber;
    let stablecoinAmount: BigNumber;

    let archivedPrice: BigNumber;
    let startingPriceUSDCents: BigNumber;
    let gamerPurchasedAmount: BigNumber;

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
      startingPriceUSDCents = ethers.BigNumber.from(7);
      gamerPurchasedAmount = stablecoinAmount
        .mul(Math.pow(10, 18 - stableCoinDecimals)) // Converts stablecoins
        .mul(archivedPrice)
        .div(startingPriceUSDCents)
        .div(Math.pow(10, 8 - 2)); // Converts USD cents to 8 decimal

      await usdt_stablecoin.mint(purchaser.address, seedUserStableCoinAmount);
      await usdt_stablecoin.mint(
        treasury.address,
        seedTreasuryStableCoinAmount
      );
      await usdt_stablecoin
        .connect(purchaser)
        .approve(crowdSale.address, stablecoinAmount);
      await token.connect(dao).whitelistMint(crowdSale.address, true);
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

    it("purchaser exchanges 10 USDT for ~142 GUILD at a price of $0.07/GUILD", async () => {
      await expect(
        await crowdSale.connect(purchaser).buyInUSDT(stablecoinAmount)
      )
        .to.emit(crowdSale, "Purchase")
        .withArgs(
          purchaser.address,
          usdt_stablecoin.address,
          stablecoinAmount,
          gamerPurchasedAmount.toString(),
          startingPriceUSDCents.toString()
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
        gamerPurchasedAmount.toString()
      );
    });
  });

  describe("buyer can purchase GUILD tokens using UST", async () => {
    let stableCoinDecimals: number;
    let seedUserStableCoinAmount: BigNumber;
    let seedTreasuryStableCoinAmount: BigNumber;
    let stablecoinAmount: BigNumber;

    let archivedPrice: BigNumber;
    let startingPriceUSDCents: BigNumber;
    let gamerPurchasedAmount: BigNumber;

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

      archivedPrice = ethers.BigNumber.from("100058710");
      startingPriceUSDCents = ethers.BigNumber.from(7);
      gamerPurchasedAmount = stablecoinAmount
        .mul(Math.pow(10, 18 - stableCoinDecimals)) // Converts stablecoins
        .mul(archivedPrice)
        .div(startingPriceUSDCents)
        .div(Math.pow(10, 8 - 2)); // Converts USD cents to 8 decimal
      await ust_stablecoin.mint(purchaser.address, seedUserStableCoinAmount);
      await ust_stablecoin.mint(treasury.address, seedTreasuryStableCoinAmount);
      await ust_stablecoin
        .connect(purchaser)
        .approve(crowdSale.address, stablecoinAmount);
      await token.connect(dao).whitelistMint(crowdSale.address, true);
    });

    it("reverts with pausable error if contract is paused", async () => {
      await crowdSale.connect(dao).pause();
      await expect(
        crowdSale
          .connect(purchaser)
          .buyInUST(purchaser.address, { value: stablecoinAmount.toString() })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("purchaser has 100 ust_stablecoin in wallet", async function () {
      expect(await ust_stablecoin.balanceOf(purchaser.address)).to.equal(
        seedUserStableCoinAmount
      );
    });

    it("has an oracle price feed", async function () {
      const stablecoinPrice = await crowdSale.getUSTPrice();
      expect(stablecoinPrice.toNumber()).to.be.equal(archivedPrice);
    });

    it("purchaser approves transfer for 10 UST", async () => {
      expect(
        await ust_stablecoin.allowance(purchaser.address, crowdSale.address)
      ).to.equal(stablecoinAmount);
    });

    it("purchaser exchanges 10 UST for ~142 GUILD at a price of $0.07/GUILD", async () => {
      await expect(
        await crowdSale.connect(purchaser).buyInUST(stablecoinAmount)
      )
        .to.emit(crowdSale, "Purchase")
        .withArgs(
          purchaser.address,
          ust_stablecoin.address,
          stablecoinAmount,
          gamerPurchasedAmount.toString(),
          startingPriceUSDCents.toString()
        );
      expect(await crowdSale.GUILD()).to.equal(token.address);
      expect(await ust_stablecoin.balanceOf(purchaser.address)).to.equal(
        ethers.utils.parseUnits("90", stableCoinDecimals)
      );
      expect(await ust_stablecoin.balanceOf(treasury.address)).to.equal(
        ethers.utils.parseUnits("210", stableCoinDecimals)
      );
      expect(await token.balanceOf(purchaser.address)).to.equal(
        gamerPurchasedAmount.toString()
      );
      expect(await token.totalSupply()).to.equal(
        gamerPurchasedAmount.toString()
      );
    });
  });

  describe("buyer can purchase GUILD tokens using ETH", async () => {
    let stableCoinDecimals: number;
    let seedUserStableCoinAmount: BigNumber;
    let seedTreasuryStableCoinAmount: BigNumber;
    let stablecoinAmount: BigNumber;

    let archivedPrice: BigNumber;
    let startingPriceUSDCents: BigNumber;
    let gamerPurchasedAmount: BigNumber;

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
      stablecoinAmount = ethers.utils.parseUnits("10", stableCoinDecimals); // $10 ETH

      archivedPrice = ethers.BigNumber.from("365993550000");
      startingPriceUSDCents = ethers.BigNumber.from(7);
      gamerPurchasedAmount = stablecoinAmount
        .mul(Math.pow(10, 18 - stableCoinDecimals)) // Converts stablecoins
        .mul(archivedPrice)
        .div(startingPriceUSDCents)
        .div(Math.pow(10, 8 - 2)); // Converts USD cents to 8 decimal

      await eth_stablecoin.mint(purchaser.address, seedUserStableCoinAmount);
      await eth_stablecoin.mint(treasury.address, seedTreasuryStableCoinAmount);
      await eth_stablecoin
        .connect(purchaser)
        .approve(crowdSale.address, stablecoinAmount);
      await token.connect(dao).whitelistMint(crowdSale.address, true);
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

    it("purchaser exchanges ETH for GUILD at a price of $0.07/GUILD", async () => {
      await expect(
        await crowdSale.connect(purchaser).buyInETH(stablecoinAmount)
      )
        .to.emit(crowdSale, "Purchase")
        .withArgs(
          purchaser.address,
          eth_stablecoin.address,
          stablecoinAmount,
          gamerPurchasedAmount.toString(),
          startingPriceUSDCents.toString()
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
        gamerPurchasedAmount.toString()
      );
    });
  });

  describe("buyer can purchase GUILD tokens using DAI", async () => {
    let stableCoinDecimals: number;
    let seedUserStableCoinAmount: BigNumber;
    let seedTreasuryStableCoinAmount: BigNumber;
    let stablecoinAmount: BigNumber;

    let archivedPrice: BigNumber;
    let startingPriceUSDCents: BigNumber;
    let gamerPurchasedAmount: BigNumber;

    beforeEach(async () => {
      stableCoinDecimals = await usdc_stablecoin.decimals();
      seedUserStableCoinAmount = ethers.utils.parseUnits(
        "100",
        stableCoinDecimals
      ); // 100 USD
      seedTreasuryStableCoinAmount = ethers.utils.parseUnits(
        "200",
        stableCoinDecimals
      ); // 200 USD
      stablecoinAmount = ethers.utils.parseUnits("10", stableCoinDecimals); // $10 USD

      archivedPrice = ethers.BigNumber.from("100036216");
      startingPriceUSDCents = ethers.BigNumber.from(7);
      gamerPurchasedAmount = stablecoinAmount
        .mul(Math.pow(10, 18 - stableCoinDecimals)) // Converts stablecoins
        .mul(archivedPrice)
        .div(startingPriceUSDCents)
        .div(Math.pow(10, 8 - 2)); // Converts USD cents to 8 decimal

      await dai_stablecoin.mint(purchaser.address, seedUserStableCoinAmount);
      await dai_stablecoin.mint(treasury.address, seedTreasuryStableCoinAmount);
      await dai_stablecoin
        .connect(purchaser)
        .approve(crowdSale.address, stablecoinAmount);
      await token.connect(dao).whitelistMint(crowdSale.address, true);
    });

    it("reverts with pausable error if contract is paused", async () => {
      await crowdSale.connect(dao).pause();
      await expect(
        crowdSale
          .connect(purchaser)
          .buyInDAI(purchaser.address, { value: stablecoinAmount.toString() })
      ).to.be.revertedWith("Pausable: paused");
    });

    it("purchaser has 100 dai_stablecoin in wallet", async function () {
      expect(await dai_stablecoin.balanceOf(purchaser.address)).to.equal(
        seedUserStableCoinAmount
      );
    });

    it("has an oracle price feed", async function () {
      const stablecoinPrice = await crowdSale.getDAIPrice();
      expect(stablecoinPrice.toNumber()).to.be.equal(archivedPrice);
    });

    it("purchaser approves transfer for 10 DAI", async () => {
      expect(
        await dai_stablecoin.allowance(purchaser.address, crowdSale.address)
      ).to.equal(stablecoinAmount);
    });

    it("purchaser exchanges 10 DAI for ~142 GUILD at a price of $0.07/GUILD", async () => {
      await expect(
        await crowdSale.connect(purchaser).buyInDAI(stablecoinAmount)
      )
        .to.emit(crowdSale, "Purchase")
        .withArgs(
          purchaser.address,
          dai_stablecoin.address,
          stablecoinAmount,
          gamerPurchasedAmount.toString(),
          startingPriceUSDCents.toString()
        );
      expect(await crowdSale.GUILD()).to.equal(token.address);
      expect(await dai_stablecoin.balanceOf(purchaser.address)).to.equal(
        ethers.utils.parseUnits("90", stableCoinDecimals)
      );
      expect(await dai_stablecoin.balanceOf(treasury.address)).to.equal(
        ethers.utils.parseUnits("210", stableCoinDecimals)
      );
      expect(await token.balanceOf(purchaser.address)).to.equal(
        gamerPurchasedAmount.toString()
      );
      expect(await token.totalSupply()).to.equal(
        gamerPurchasedAmount.toString()
      );
    });
  });

  describe("buyer can purchase GUILD tokens using BNB", async () => {
    let stableCoinDecimals: number;
    let seedUserStableCoinAmount: BigNumber;
    let seedTreasuryStableCoinAmount: BigNumber;
    let stablecoinAmount: BigNumber;

    let archivedPrice: BigNumber;
    let startingPriceUSDCents: BigNumber;
    let gamerPurchasedAmount: BigNumber;

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
      startingPriceUSDCents = ethers.BigNumber.from(7);
      gamerPurchasedAmount = stablecoinAmount
        .mul(Math.pow(10, 18 - stableCoinDecimals)) // Converts stablecoins
        .mul(archivedPrice)
        .div(startingPriceUSDCents)
        .div(Math.pow(10, 8 - 2)); // Converts USD cents to 8 decimal

      await token.connect(dao).whitelistMint(crowdSale.address, true);
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
      expect(
        await (
          await purchaser.getBalance()
        ).gt(ethers.BigNumber.from("9999000000000000000000"))
      ).to.be.equal(true);
      expect(
        await (
          await purchaser.getBalance()
        ).lt(ethers.BigNumber.from("10000000000000000000000"))
      ).to.be.equal(true);
      expect(
        await (
          await treasury.getBalance()
        ).eq(ethers.BigNumber.from("10000000000000000000000"))
      ).to.be.equal(true);
    });

    it("has an oracle price feed", async function () {
      const stablecoinPrice = await crowdSale.getBNBPrice();
      expect(stablecoinPrice.toNumber()).to.be.equal(archivedPrice);
    });

    it("purchaser exchanges native BNB for GUILD at a price of $0.07/GUILD", async () => {
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
          startingPriceUSDCents.toString()
        );
      expect(await crowdSale.GUILD()).to.equal(token.address);
      expect(
        (await purchaser.getBalance()).gt(
          ethers.BigNumber.from("9989000000000000000000")
        )
      ).to.be.equal(true);
      expect(
        (await purchaser.getBalance()).lt(
          ethers.BigNumber.from("9999000000000000000000")
        )
      ).to.be.equal(true);
      expect(
        (await treasury.getBalance()).eq(
          stablecoinAmount.add(ethers.BigNumber.from("10000000000000000000000"))
        )
      ).to.be.equal(true);
      expect(await token.balanceOf(purchaser.address)).to.equal(
        gamerPurchasedAmount.toString()
      );
      expect(await token.totalSupply()).to.equal(
        gamerPurchasedAmount.toString()
      );
    });
  });
});
