import { expect } from "chai";
import { ethers, network, waffle } from "hardhat";
import {
  DAO_ROLE,
  generateNonce,
  generatePermissionRevokeMessage,
  padAddressTo32Bytes,
  signWhitelist,
  WHITELISTER_ROLE,
  randomBN,
} from "./helpers/test-helpers";
import { manifest } from "../scripts/manifest";
import {
  USDC,
  USDC__factory,
  USDT,
  USDT__factory,
  LootboxCosmic,
  LootboxCosmic__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, constants, Contract, ContractTransaction } from "ethers";
import { random } from "lodash";

const LOOTBOX_NAME = "Pinata Lootbox";
const LOOTBOX_SYMBOL = "PINATA";
const BASE_URI = "https://storage.googleapis.com/lootbox-data-staging";
const provider = waffle.provider;

// needed to prevent "too many requests" error
const timeout = async (ms: number = 1000) => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res(undefined);
    }, ms);
  });
};

describe("📦 LootboxCosmic smart contract", async function () {
  let Lootbox: LootboxCosmic__factory;
  let lootbox: LootboxCosmic;
  let deployer: SignerWithAddress;
  let whitelister: SignerWithAddress;
  let issuingEntity: SignerWithAddress;
  let malicious: SignerWithAddress;
  let minter: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let user: SignerWithAddress;
  let NATIVE_STARTING_BALANCE: BigNumber;
  let USDC_STARTING_BALANCE: BigNumber;
  let USDT_STARTING_BALANCE: BigNumber;
  let lootboxMaxTickets: number;

  before(async () => {
    [deployer, minter, issuingEntity, whitelister, malicious, purchaser, user] =
      await ethers.getSigners();
  });
  beforeEach(() => {
    lootboxMaxTickets = random(10, 1000);
    NATIVE_STARTING_BALANCE = randomBN("10000000000000000000");

    USDC_STARTING_BALANCE = randomBN("1000000000000000000000");
    USDT_STARTING_BALANCE = randomBN("1000000000000000000000");
  });

  describe("Before constructor & deployment", async () => {
    beforeEach(async () => {
      Lootbox = await ethers.getContractFactory("LootboxCosmic");
    });

    it("reverts if name is empty", async () => {
      await expect(
        Lootbox.deploy(
          "",
          "symbol",
          BASE_URI,
          10,
          issuingEntity.address,
          whitelister.address
        )
      ).to.be.revertedWith("invalid name");
    });

    it("reverts if symbol is empty", async () => {
      await expect(
        Lootbox.deploy(
          "name",
          "",
          BASE_URI,
          10,
          issuingEntity.address,
          whitelister.address
        )
      ).to.be.revertedWith("invalid symbol");
    });

    it("reverts if URI is empty", async () => {
      await expect(
        Lootbox.deploy(
          "name",
          "symbol",
          "",
          10,
          issuingEntity.address,
          whitelister.address
        )
      ).to.be.revertedWith("invalid URI");
    });

    it("reverts if issuing entity is zero", async () => {
      await expect(
        Lootbox.deploy(
          "name",
          "symbol",
          BASE_URI,
          10,
          constants.AddressZero,
          whitelister.address
        )
      ).to.be.revertedWith("invalid issuer");
    });

    it("reverts if whitelister is zero", async () => {
      await expect(
        Lootbox.deploy(
          "name",
          "symbol",
          BASE_URI,
          10,
          issuingEntity.address,
          constants.AddressZero
        )
      ).to.be.revertedWith("Whitelister cannot be the zero address");
    });

    it("reverts if maxTickets is zero", async () => {
      await expect(
        Lootbox.deploy(
          "name",
          "symbol",
          BASE_URI,
          0,
          issuingEntity.address,
          whitelister.address
        )
      ).to.be.revertedWith("invalid maxTickets");
    });

    it("reverts if maxTickets is negative", async () => {
      await expect(
        Lootbox.deploy(
          "name",
          "symbol",
          BASE_URI,
          -1,
          issuingEntity.address,
          whitelister.address
        )
        // ).to.be.revertedWith("value out-of-bounds");
      ).to.be.reverted;
    });
  });

  describe("After construction & deployment", () => {
    let Usdc: USDC__factory;
    let usdc_stablecoin: USDC;
    let Usdt: USDT__factory;
    let usdt_stablecoin: USDT;

    beforeEach(async () => {
      Lootbox = await ethers.getContractFactory("LootboxCosmic");
      lootbox = await Lootbox.deploy(
        LOOTBOX_NAME,
        LOOTBOX_SYMBOL,
        BASE_URI,
        lootboxMaxTickets,
        issuingEntity.address,
        whitelister.address
      );

      // Bnb = await ethers.getContractFactory("BNB");
      Usdc = await ethers.getContractFactory("USDC");
      Usdt = await ethers.getContractFactory("USDT");

      usdc_stablecoin = (await Usdc.deploy(0)) as USDC;
      usdt_stablecoin = (await Usdt.deploy(0)) as USDT;
    });

    it(`has the expected semver ${manifest.semver.id}`, async () => {
      expect(await lootbox.SEMVER()).to.eq(manifest.semver.id);
    });

    it("has the createdAt timestamp", async () => {
      expect(await lootbox.createdAt()).to.be.gt(10000000);
    });

    it("has Cosmic variant", async () => {
      expect(await lootbox.VARIANT()).to.eq("Cosmic");
    });

    it("starts the ticket counter at 0", async () => {
      expect(await lootbox.ticketIdCounter()).to.eq(0);
    });

    it("starts the deposit counter at 0", async () => {
      expect(await lootbox.depositIdCounter()).to.eq(0);
    });

    it("yields zero total deposit of native & any erc20 token", async () => {
      expect(await lootbox.viewTotalDepositOfNativeToken()).to.eq(0);
      expect(
        await lootbox.viewTotalDepositOfErc20Token(usdc_stablecoin.address)
      ).to.eq(0);
    });

    it("has flushed equal to false", async () => {
      expect(await lootbox.flushed()).to.be.false;
    });

    it("sets the name correctly", async () => {
      expect(await lootbox.name()).to.eq(LOOTBOX_NAME);
    });

    it("sets the symbol correctly", async () => {
      expect(await lootbox.symbol()).to.eq(LOOTBOX_SYMBOL);
    });

    it("sets the _tokenURI correctly", async () => {
      expect(await lootbox._tokenURI()).to.eq(BASE_URI);
    });

    it("sets the maxTickets correctly", async () => {
      expect(await lootbox.maxTickets()).to.eq(lootboxMaxTickets);
    });

    it("grants the issuer the DAO role", async () => {
      expect(await lootbox.hasRole(DAO_ROLE, issuingEntity.address)).to.be.true;
    });

    it("grants the whitelister the WHITELISTER role", async () => {
      expect(await lootbox.hasRole(WHITELISTER_ROLE, whitelister.address)).to.be
        .true;
    });

    it("has the correct DOMAIN_SEPARATOR", async () => {
      const domainSeparator = await lootbox.DOMAIN_SEPARATOR();

      const expectedDomainSeparator = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "bytes32", "uint256", "address"],
          [
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes(
                "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
              )
            ),
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("LootboxCosmic")),
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1")),
            network.config.chainId,
            lootbox.address,
          ]
        )
      );

      expect(domainSeparator).to.equal(expectedDomainSeparator);
    });

    it("has an empty array of minters", async () => {
      expect(await lootbox.minters(0)).to.eq(constants.AddressZero);
    });

    describe("viewAllTicketsOfHolder()", () => {
      let redeemers: SignerWithAddress[];
      let redeemerTicketIds: { [key: string]: number[] };

      beforeEach(async () => {
        redeemers = [user, minter];
        redeemerTicketIds = {};
        // we have to whitelist & mint out tickets
        let ticketCounter = 0;
        for (let redeemer of redeemers) {
          const ntickets = random(1, 5); // randomly mint this many tickets...
          for (let ticketIdx = 0; ticketIdx < ntickets; ticketIdx++) {
            const nonce = generateNonce();
            const signature = await signWhitelist(
              network.config.chainId || 0,
              lootbox.address,
              whitelister,
              redeemer.address,
              nonce,
              "LootboxCosmic"
            );

            const tx = await lootbox.connect(redeemer).mint(signature, nonce);
            await tx.wait();
            if (!redeemerTicketIds[redeemer.address]) {
              redeemerTicketIds[redeemer.address] = [ticketCounter];
            } else {
              redeemerTicketIds[redeemer.address].push(ticketCounter);
            }
            ticketCounter++;
          }
        }
      });

      it("returns empty array if no tickets minted for user", async () => {
        const usertickets = await lootbox.viewAllTicketsOfHolder(
          malicious.address
        );
        expect(usertickets.length).to.eq(0);
      });

      it("correctly shows the tickets for each user", async () => {
        for (let [addr, tickets] of Object.entries(redeemerTicketIds)) {
          const usertickets = await lootbox.viewAllTicketsOfHolder(addr);
          await timeout(200);
          const tixparsed = usertickets.map((bn) => bn.toNumber());
          for (let tid of tickets) {
            expect(tixparsed).includes(tid);
          }
        }
      });
    });

    describe("flush tokens", async () => {
      let flushTarget: SignerWithAddress;
      let depositers: SignerWithAddress[];
      beforeEach(async () => {
        flushTarget = user;
        depositers = [issuingEntity, deployer];
        for (let depositer of depositers) {
          await usdc_stablecoin.mint(
            depositer.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );
          await usdc_stablecoin
            .connect(depositer)
            .approve(
              lootbox.address,
              ethers.BigNumber.from(USDC_STARTING_BALANCE)
            );

          await timeout(400);

          await usdt_stablecoin.mint(
            depositer.address,
            ethers.BigNumber.from(USDT_STARTING_BALANCE)
          );
          await usdt_stablecoin
            .connect(depositer)
            .approve(
              lootbox.address,
              ethers.BigNumber.from(USDT_STARTING_BALANCE)
            );
        }
      });

      it("rejects if caller does not have DAO role", async () => {
        await expect(
          lootbox.connect(purchaser).flushTokens(flushTarget.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
        );
        await expect(
          lootbox.connect(purchaser).flushTokens(flushTarget.address)
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(purchaser.address, DAO_ROLE)
        );
        await expect(
          lootbox.connect(issuingEntity).flushTokens(flushTarget.address)
        ).to.not.be.revertedWith(
          generatePermissionRevokeMessage(issuingEntity.address, DAO_ROLE)
        );
      });

      it("reverts if called withing 120 days from lootbox creation", async () => {
        await expect(
          lootbox.connect(issuingEntity).flushTokens(flushTarget.address)
        ).to.be.revertedWith("Must wait 120 days");

        await network.provider.send("evm_increaseTime", [86400 * 100]); // increase number of seconds (86400 seconds in a day)
        await network.provider.send("evm_mine");

        await expect(
          lootbox.connect(issuingEntity).flushTokens(flushTarget.address)
        ).to.be.revertedWith("Must wait 120 days");

        await network.provider.send("evm_increaseTime", [86400 * 20]); // increase number of seconds (86400 seconds in a day)
        await network.provider.send("evm_mine");

        await expect(
          lootbox.connect(issuingEntity).flushTokens(flushTarget.address)
        ).to.be.not.be.revertedWith("Must wait 120 days");
      });

      it("when it does not revert, it also sets 'flushed' to true", async () => {
        await network.provider.send("evm_increaseTime", [86400 * 120]); // increase number of seconds (86400 seconds in a day)
        await network.provider.send("evm_mine");

        const initFlushed = await lootbox.flushed();
        expect(initFlushed).to.be.false;
        await expect(
          lootbox.connect(issuingEntity).flushTokens(flushTarget.address)
        ).to.not.be.reverted;
        expect(await lootbox.flushed()).to.be.true;
      });

      describe("given a random number of deposits only", async () => {
        let runningDepositNative: BigNumber;
        let runningDepositUSDC: BigNumber;
        let runningDepositUSDT: BigNumber;
        let expectedNativeYieldPerTicket: BigNumber;
        let expectedUsdcYieldPerTicket: BigNumber;
        let expectedUsdtYieldPerTicket: BigNumber;

        beforeEach(async () => {
          runningDepositNative = ethers.BigNumber.from(0);
          runningDepositUSDC = ethers.BigNumber.from(0);
          runningDepositUSDT = ethers.BigNumber.from(0);
          expectedNativeYieldPerTicket = ethers.BigNumber.from(0);
          expectedUsdcYieldPerTicket = ethers.BigNumber.from(0);
          expectedUsdtYieldPerTicket = ethers.BigNumber.from(0);

          for (let depositer of depositers) {
            if (random(0, 1) === 1) {
              // make native deposit
              const amt = randomBN(NATIVE_STARTING_BALANCE).div(100);

              await lootbox
                .connect(depositer)
                .depositEarningsNative({ value: amt });
              runningDepositNative = runningDepositNative.add(amt);
              expectedNativeYieldPerTicket = expectedNativeYieldPerTicket.add(
                amt.div(lootboxMaxTickets)
              );
              await timeout(200);
            }
            if (random(0, 1) === 1) {
              // make usdc deposit
              const amt = randomBN(USDC_STARTING_BALANCE).div(100);
              await lootbox
                .connect(depositer)
                .depositEarningsErc20(usdc_stablecoin.address, amt);
              runningDepositUSDC = runningDepositUSDC.add(amt);
              expectedUsdcYieldPerTicket = expectedUsdcYieldPerTicket.add(
                amt.div(lootboxMaxTickets)
              );
              await timeout(200);
            }

            if (random(0, 1) === 1) {
              // make usdt deposit
              const amt = randomBN(USDT_STARTING_BALANCE).div(100);
              await lootbox
                .connect(depositer)
                .depositEarningsErc20(usdt_stablecoin.address, amt);
              runningDepositUSDT = runningDepositUSDT.add(amt);
              expectedUsdtYieldPerTicket = expectedUsdtYieldPerTicket.add(
                amt.div(lootboxMaxTickets)
              );
              await timeout(200);
            }
          }

          await network.provider.send("evm_increaseTime", [86400 * 120]); // increase number of seconds (86400 seconds in a day)
          await network.provider.send("evm_mine");
        });

        it("flushes all tokens correctly to the provided address", async () => {
          const initNative = await flushTarget.getBalance();
          const initUSDC = await usdc_stablecoin.balanceOf(flushTarget.address);
          const initUSDT = await usdt_stablecoin.balanceOf(flushTarget.address);

          await lootbox.connect(issuingEntity).flushTokens(flushTarget.address);

          const newNative = await flushTarget.getBalance();
          const newUSDC = await usdc_stablecoin.balanceOf(flushTarget.address);
          const newUSDT = await usdt_stablecoin.balanceOf(flushTarget.address);

          const expectedNative = runningDepositNative.eq(0)
            ? initNative
            : initNative.add(runningDepositNative);
          expect(newNative).to.eq(expectedNative);
          const expectedUSDC = runningDepositUSDC.eq(0)
            ? initUSDC
            : initUSDC.add(runningDepositUSDC);
          expect(newUSDC).to.eq(expectedUSDC);
          const expectedUSDT = runningDepositUSDT.eq(0)
            ? initUSDT
            : initUSDT.add(runningDepositUSDT);
          expect(newUSDT).to.eq(expectedUSDT);
        });

        it("flushes all tokens correctly after paying a few token redeemers", async () => {
          const nonce1 = generateNonce();
          const signature1 = await signWhitelist(
            network.config.chainId || 0,
            lootbox.address,
            whitelister,
            minter.address,
            nonce1,
            "LootboxCosmic"
          );

          const nonce2 = generateNonce();
          const signature2 = await signWhitelist(
            network.config.chainId || 0,
            lootbox.address,
            whitelister,
            minter.address,
            nonce2,
            "LootboxCosmic"
          );

          await lootbox.connect(minter).mint(signature1, nonce1);
          await lootbox.connect(minter).mint(signature2, nonce2);

          await lootbox.connect(minter).withdrawEarnings(0);
          await lootbox.connect(minter).withdrawEarnings(1);

          const initNative = await flushTarget.getBalance();
          const initUSDC = await usdc_stablecoin.balanceOf(flushTarget.address);
          const initUSDT = await usdt_stablecoin.balanceOf(flushTarget.address);

          await lootbox.connect(issuingEntity).flushTokens(flushTarget.address);

          const newNative = await flushTarget.getBalance();
          const newUSDC = await usdc_stablecoin.balanceOf(flushTarget.address);
          const newUSDT = await usdt_stablecoin.balanceOf(flushTarget.address);

          const expectedNative = runningDepositNative.eq(0)
            ? initNative
            : initNative
                .add(runningDepositNative)
                .sub(expectedNativeYieldPerTicket)
                .sub(expectedNativeYieldPerTicket);
          expect(newNative).to.eq(expectedNative);
          const expectedUSDC = runningDepositUSDC.eq(0)
            ? initUSDC
            : initUSDC
                .add(runningDepositUSDC)
                .sub(expectedUsdcYieldPerTicket)
                .sub(expectedUsdcYieldPerTicket);
          expect(newUSDC).to.eq(expectedUSDC);
          const expectedUSDT = runningDepositUSDT.eq(0)
            ? initUSDT
            : initUSDT
                .add(runningDepositUSDT)
                .sub(expectedUsdtYieldPerTicket)
                .sub(expectedUsdtYieldPerTicket);
          expect(newUSDT).to.eq(expectedUSDT);
        });
      });
    });

    describe("mint()", () => {
      it("reverts when called with invalid calldata", async () => {
        await expect(lootbox.connect(malicious).mint("saldkmals", 0)).to.be
          .reverted; // Error: invalid arrayify value (argument="value", value="saldkmals", code=INVALID_ARGUMENT, version=bytes/5.6.1)

        await expect(
          lootbox.connect(malicious).mint(ethers.constants.AddressZero, 0)
        ).to.be.revertedWith("ECDSA: invalid signature length");
      });

      it("reverts when the signer does not have the minter role", async () => {
        const signature = await signWhitelist(
          network.config.chainId || 0,
          lootbox.address,
          malicious,
          minter.address,
          generateNonce(),
          "LootboxCosmic"
        );

        await expect(
          lootbox.connect(malicious).mint(signature, 0)
        ).to.be.revertedWith("Invalid Signature");
      });

      it("reverts when called with a valid signature, but different mintingKey address", async () => {
        const signature = await signWhitelist(
          network.config.chainId || 0,
          lootbox.address,
          whitelister,
          minter.address,
          generateNonce(),
          "LootboxCosmic"
        );

        await expect(
          lootbox.connect(malicious).mint(signature, 0)
        ).to.be.revertedWith("Invalid Signature");
      });

      it("reverts when called with a valid whitelistKey & mintingKey, but different nonce", async () => {
        const signature = await signWhitelist(
          network.config.chainId || 0,
          lootbox.address,
          whitelister,
          minter.address,
          generateNonce(),
          "LootboxCosmic"
        );

        await expect(
          lootbox.connect(malicious).mint(signature, 1)
        ).to.be.revertedWith("Invalid Signature");
      });

      it("reverts when called with the same signature multiple times", async () => {
        const nonce = generateNonce();
        const signature = await signWhitelist(
          network.config.chainId || 0,
          lootbox.address,
          whitelister,
          malicious.address,
          nonce,
          "LootboxCosmic"
        );

        await expect(lootbox.connect(malicious).mint(signature, nonce)).to.not
          .be.reverted;

        await expect(
          lootbox.connect(malicious).mint(signature, nonce)
        ).to.be.revertedWith("signature used");
      });

      describe("Given a valid signature", () => {
        let signature: string;
        let nonce: string;

        beforeEach(async () => {
          nonce = generateNonce();
          signature = await signWhitelist(
            network.config.chainId || 0,
            lootbox.address,
            whitelister,
            minter.address,
            nonce,
            "LootboxCosmic"
          );
        });

        it("reverts with Pauseable error when paused", async () => {
          await lootbox.connect(issuingEntity).pause();
          await expect(
            lootbox.connect(minter).mint(signature, nonce)
          ).to.be.revertedWith("Pausable: paused");
        });

        it("reverts if the maxTickets has been hit", async () => {
          // lets just set up a new test so we dont have to mint too many
          const ticketsToMint = random(1, 6);

          const testLootbox = await Lootbox.deploy(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            BASE_URI,
            ticketsToMint,
            issuingEntity.address,
            whitelister.address
          );

          for (let ticketIdx = 0; ticketIdx < ticketsToMint; ticketIdx++) {
            const nonce = generateNonce();
            const signature = await signWhitelist(
              network.config.chainId || 0,
              testLootbox.address,
              whitelister,
              minter.address,
              nonce,
              "LootboxCosmic"
            );

            await testLootbox.connect(minter).mint(signature, nonce);
          }

          // try to do 1 extra mint and it should revert because of max tickets
          const nonceExtra = generateNonce();
          const signatureExtra = await signWhitelist(
            network.config.chainId || 0,
            testLootbox.address,
            whitelister,
            minter.address,
            nonceExtra,
            "LootboxCosmic"
          );

          await expect(
            testLootbox.connect(minter).mint(signatureExtra, nonceExtra)
          ).to.be.revertedWith("Sold out");
        });

        it("reverts if the maxTickets has been hit, but if maxTickets increases, subsequent calls do not revert", async () => {
          // lets just set up a new test so we dont have to mint too many
          const ticketsToMint = random(1, 6);

          const testLootbox = await Lootbox.deploy(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            BASE_URI,
            ticketsToMint,
            issuingEntity.address,
            whitelister.address
          );

          for (let ticketIdx = 0; ticketIdx < ticketsToMint; ticketIdx++) {
            const nonce = generateNonce();
            const signature = await signWhitelist(
              network.config.chainId || 0,
              testLootbox.address,
              whitelister,
              minter.address,
              nonce,
              "LootboxCosmic"
            );

            await testLootbox.connect(minter).mint(signature, nonce);
          }

          // try to do 1 extra mint and it should revert because of max tickets
          const nonceExtra = generateNonce();
          const signatureExtra = await signWhitelist(
            network.config.chainId || 0,
            testLootbox.address,
            whitelister,
            minter.address,
            nonceExtra,
            "LootboxCosmic"
          );

          await expect(
            testLootbox.connect(minter).mint(signatureExtra, nonceExtra)
          ).to.be.revertedWith("Sold out");

          // Update max tickets
          await testLootbox
            .connect(issuingEntity)
            .changeMaxTickets(ticketsToMint + 3);

          await expect(
            testLootbox.connect(minter).mint(signatureExtra, nonceExtra)
          ).to.not.be.reverted;
        });

        it("does not revert when called with appropriate signer", async () => {
          await expect(lootbox.connect(minter).mint(signature, nonce)).to.not.be
            .reverted;
        });

        it("sends the NFT to minter", async () => {
          const beforeTicketId = await lootbox.ticketIdCounter();

          await lootbox.connect(minter).mint(signature, nonce);

          const afterTicketId = await lootbox.ticketIdCounter();

          expect(afterTicketId).to.eq(beforeTicketId.add(1));
          expect(await lootbox.ownerOf(beforeTicketId)).to.eq(minter.address);
          await expect(lootbox.ownerOf(afterTicketId)).to.be.reverted; // hasnt been minted yet
        });

        it("emits a MintTicket event", async () => {
          const beforeTicketIdx = await lootbox.ticketIdCounter();

          await expect(await lootbox.connect(minter).mint(signature, nonce))
            .to.emit(lootbox, "MintTicket")
            .withArgs(minter.address, lootbox.address, nonce, beforeTicketIdx);
        });

        it("increments the minters variable with the minters address", async () => {
          const initMinters = await lootbox.minters(0);
          expect(initMinters).to.eq(constants.AddressZero);

          await lootbox.connect(minter).mint(signature, nonce);
          const firstMinter = await lootbox.minters(0);
          expect(firstMinter).to.eq(minter.address);

          // See what happens when we add another one
          const nonce2 = generateNonce();
          const signature2 = await signWhitelist(
            network.config.chainId || 0,
            lootbox.address,
            whitelister,
            user.address,
            nonce2,
            "LootboxCosmic"
          );

          expect(await lootbox.minters(1)).to.eq(constants.AddressZero);
          await lootbox.connect(user).mint(signature2, nonce2);
          expect(await lootbox.minters(1)).to.eq(user.address);
          // make sure the first one is still good to go
          expect(await lootbox.minters(0)).to.eq(minter.address);
        });

        it("ownership of the NFT changes properly", async () => {
          const ticketId = await lootbox.ticketIdCounter();
          await lootbox.connect(minter).mint(signature, nonce);
          expect(await lootbox.ownerOf(ticketId)).to.eq(minter.address);
          await lootbox
            .connect(minter)
            .transferFrom(minter.address, purchaser.address, ticketId);
          expect(await lootbox.ownerOf(ticketId)).to.eq(purchaser.address);
        });

        it("only the owner of the NFT can change the ownership", async () => {
          const ticketId = await lootbox.ticketIdCounter();
          await lootbox.connect(minter).mint(signature, nonce);

          await expect(
            lootbox
              .connect(purchaser)
              .transferFrom(minter.address, purchaser.address, ticketId)
          ).to.be.revertedWith(
            "ERC721: caller is not token owner nor approved"
          );

          await expect(
            lootbox
              .connect(purchaser)
              .transferFrom(purchaser.address, minter.address, ticketId)
          ).to.be.revertedWith(
            "ERC721: caller is not token owner nor approved"
          );
        });
      });
    });

    describe("changing the max tickets (unit tests)", () => {
      it("only allows the wallet with the DAO role, otherwise reverts", async () => {
        const initMaxTickets = await lootbox.maxTickets();
        await expect(
          lootbox.connect(malicious).changeMaxTickets(initMaxTickets.add(1))
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(malicious.address, DAO_ROLE)
        );
        await expect(
          lootbox.connect(deployer).changeMaxTickets(initMaxTickets.add(1))
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(deployer.address, DAO_ROLE)
        );
        await expect(
          lootbox.connect(user).changeMaxTickets(initMaxTickets.add(1))
        ).to.be.revertedWith(
          generatePermissionRevokeMessage(user.address, DAO_ROLE)
        );
        await expect(
          lootbox.connect(issuingEntity).changeMaxTickets(initMaxTickets.add(1))
        ).to.not.be.reverted;
      });

      it("reverts targetMaxTickets is 0 or less than 0 or less than current maxTickets, otherwise, does not revert", async () => {
        const initMaxTickets = await lootbox.maxTickets();
        await expect(
          lootbox.connect(issuingEntity).changeMaxTickets(initMaxTickets)
        ).to.be.revertedWith("Must be greater than maxTickets");
        await expect(
          lootbox.connect(issuingEntity).changeMaxTickets(initMaxTickets.sub(1))
        ).to.be.revertedWith("Must be greater than maxTickets");
        await expect(
          lootbox.connect(issuingEntity).changeMaxTickets(0)
        ).to.be.revertedWith("Must be greater than maxTickets");
        await expect(lootbox.connect(issuingEntity).changeMaxTickets(-1)).to.be
          .reverted; // Not sure how to catch these errors
        await expect(
          lootbox.connect(issuingEntity).changeMaxTickets(initMaxTickets.add(1))
        ).to.not.be.reverted;
      });

      it("you can change maxTickets multiple times, and it can only be increasing", async () => {
        let maxTicketsTally = await lootbox.maxTickets();
        const numsToAdd = [2, 4, 100, 10000000];
        for (let n of numsToAdd) {
          maxTicketsTally = maxTicketsTally.add(n);
          await expect(
            lootbox
              .connect(issuingEntity)
              .changeMaxTickets(maxTicketsTally.sub(n).sub(2))
          ).to.be.revertedWith("Must be greater than maxTickets");
          await expect(
            lootbox.connect(issuingEntity).changeMaxTickets(maxTicketsTally)
          ).to.not.be.reverted;
        }
      });

      describe("interactions with deposits", () => {
        let depositer: SignerWithAddress;
        let nativeDepositAmount: BigNumber;
        let usdcDepositAmount: BigNumber;

        beforeEach(async () => {
          depositer = deployer;

          await usdc_stablecoin.mint(
            depositer.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );

          await timeout(200);
          await usdc_stablecoin
            .connect(depositer)
            .approve(
              lootbox.address,
              ethers.BigNumber.from(USDC_STARTING_BALANCE)
            );

          nativeDepositAmount = randomBN(NATIVE_STARTING_BALANCE).div(100);

          usdcDepositAmount = randomBN(USDC_STARTING_BALANCE).div(100);
        });

        it("changing max tickets gets snapshotted on deposits", async () => {
          await lootbox
            .connect(depositer)
            .depositEarningsNative({ value: nativeDepositAmount });
          await timeout(300);
          await lootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount);

          // So Max tickets should be lootboxMaxTickets
          const [nativeDeposit, erc20Deposit] = await lootbox.viewAllDeposits();

          expect(nativeDeposit[7]).to.eq(lootboxMaxTickets);
          expect(erc20Deposit[7]).to.eq(lootboxMaxTickets);

          // Change the max tickets
          const newMaxTickets = lootboxMaxTickets * random(2, 100);
          await lootbox.connect(issuingEntity).changeMaxTickets(newMaxTickets);

          const [nativeDepositDUPE, erc20DepositDUPE] =
            await lootbox.viewAllDeposits();

          expect(nativeDepositDUPE[7]).to.eq(lootboxMaxTickets);
          expect(erc20DepositDUPE[7]).to.eq(lootboxMaxTickets);

          // new deposits will have the new max tickets tho

          await lootbox
            .connect(depositer)
            .depositEarningsNative({ value: nativeDepositAmount });
          await timeout(300);
          await lootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount);
          await timeout(300);
          await lootbox
            .connect(depositer)
            .depositEarningsNative({ value: nativeDepositAmount });
          await timeout(300);
          await lootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount);
          await timeout(300);

          // So Max tickets should be new max
          const [_, __, nativeDepositNEW, erc20DepositNEW] =
            await lootbox.viewAllDeposits();
          expect(nativeDepositNEW[7]).to.eq(newMaxTickets);
          expect(erc20DepositNEW[7]).to.eq(newMaxTickets);
        });

        it("changing max tickets gets snapshotted on pro-rated deposits", async () => {
          await lootbox
            .connect(depositer)
            .depositEarningsNative({ value: nativeDepositAmount });
          await timeout(300);
          await lootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount);
          await timeout(300);

          // So Max tickets should be lootboxMaxTickets
          const [nativeDepositProrated, erc20DepositProrated] =
            await lootbox.viewProratedDepositsForTicket(0);
          expect(nativeDepositProrated[4]).to.eq(
            nativeDepositAmount.div(lootboxMaxTickets)
          );
          expect(nativeDepositProrated[8]).to.eq(lootboxMaxTickets);

          expect(erc20DepositProrated[6]).to.eq(
            usdcDepositAmount.div(lootboxMaxTickets)
          );
          expect(erc20DepositProrated[8]).to.eq(lootboxMaxTickets);

          // Change the max tickets
          const newMaxTickets = lootboxMaxTickets * random(2, 100);
          await lootbox.connect(issuingEntity).changeMaxTickets(newMaxTickets);

          // Old deposits should have the same max tickets
          const [nativeDepositProratedDUPE, erc20DepositProratedDUPE] =
            await lootbox.viewProratedDepositsForTicket(0);
          expect(nativeDepositProratedDUPE[4]).to.eq(
            nativeDepositAmount.div(lootboxMaxTickets)
          );
          expect(nativeDepositProratedDUPE[8]).to.eq(lootboxMaxTickets);

          expect(erc20DepositProratedDUPE[6]).to.eq(
            usdcDepositAmount.div(lootboxMaxTickets)
          );
          expect(erc20DepositProratedDUPE[8]).to.eq(lootboxMaxTickets);

          // new deposits will have the new max tickets tho

          await lootbox
            .connect(depositer)
            .depositEarningsNative({ value: nativeDepositAmount });
          await lootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount);

          // So Max tickets should be new max
          const [_, __, nativeDepositProratedNEW, erc20DepositProratedNEW] =
            await lootbox.viewProratedDepositsForTicket(0);
          expect(nativeDepositProratedNEW[4]).to.eq(
            nativeDepositAmount.div(newMaxTickets)
          );
          expect(nativeDepositProratedNEW[8]).to.eq(newMaxTickets);

          expect(erc20DepositProratedNEW[6]).to.eq(
            usdcDepositAmount.div(newMaxTickets)
          );
          expect(erc20DepositProratedNEW[8]).to.eq(newMaxTickets);
        });

        it("prorated deposits only show if the ticket id is less than the maxTickets", async () => {
          const testLootbox = await Lootbox.deploy(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            BASE_URI,
            1,
            issuingEntity.address,
            whitelister.address
          );

          await usdc_stablecoin
            .connect(depositer)
            .approve(
              testLootbox.address,
              ethers.BigNumber.from(USDC_STARTING_BALANCE)
            );
          await timeout(300);
          await testLootbox
            .connect(depositer)
            .depositEarningsNative({ value: nativeDepositAmount });
          await timeout(300);
          await testLootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount);
          await timeout(300);
          const initDeposits0 = await testLootbox.viewProratedDepositsForTicket(
            0
          );

          expect(initDeposits0.length).to.eq(2);

          const [nativeDepositInit, erc20DepositInit] = initDeposits0;

          expect(nativeDepositInit[0]).to.eq(depositer.address);
          expect(nativeDepositInit[1]).to.eq(0); // ticketid
          expect(nativeDepositInit[2]).to.eq(0); // deposit id
          expect(nativeDepositInit[3]).to.be.false;
          expect(nativeDepositInit[4]).to.eq(nativeDepositAmount.div(1));
          expect(nativeDepositInit[5]).to.eq(ethers.constants.AddressZero);
          expect(nativeDepositInit[6]).to.eq(0);
          expect(nativeDepositInit[8]).to.eq(1);

          expect(erc20DepositInit[0]).to.eq(depositer.address);
          expect(erc20DepositInit[1]).to.eq(0); // ticketid
          expect(erc20DepositInit[2]).to.eq(1); // deposit id
          expect(erc20DepositInit[3]).to.be.false;
          expect(erc20DepositInit[4]).to.eq(0);
          expect(erc20DepositInit[5]).to.eq(usdc_stablecoin.address);
          expect(erc20DepositInit[6]).to.eq(usdcDepositAmount.div(1));
          expect(erc20DepositInit[8]).to.eq(1);

          const ticketDepositsInit1 =
            await testLootbox.viewProratedDepositsForTicket(1);

          expect(ticketDepositsInit1.length).to.eq(0);

          // now we need to increase the maxtickets cap

          await testLootbox.connect(issuingEntity).changeMaxTickets(2);
          await timeout(300);

          // make another couple of deposits
          const nativeDepositAmount2 = randomBN(nativeDepositAmount);
          const usdcDepositAmount2 = randomBN(usdcDepositAmount);
          await testLootbox
            .connect(depositer)
            .depositEarningsNative({ value: nativeDepositAmount2 });
          await timeout(300);
          await testLootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount2);
          await timeout(300);

          const ticketDeposits0 =
            await testLootbox.viewProratedDepositsForTicket(0);
          expect(ticketDeposits0.length).to.eq(4);
          const ticketDeposits1 =
            await testLootbox.viewProratedDepositsForTicket(1);
          expect(ticketDeposits1.length).to.eq(2);

          expect(ticketDeposits0[0][0]).to.eq(depositer.address);
          expect(ticketDeposits0[0][1]).to.eq(0); // ticketid
          expect(ticketDeposits0[0][2]).to.eq(0); // deposit id
          expect(ticketDeposits0[0][3]).to.be.false;
          expect(ticketDeposits0[0][4]).to.eq(nativeDepositAmount.div(1));
          expect(ticketDeposits0[0][5]).to.eq(ethers.constants.AddressZero);
          expect(ticketDeposits0[0][6]).to.eq(0);
          expect(ticketDeposits0[0][8]).to.eq(1);

          expect(ticketDeposits0[1][0]).to.eq(depositer.address);
          expect(ticketDeposits0[1][1]).to.eq(0); // ticketid
          expect(ticketDeposits0[1][2]).to.eq(1); // deposit id
          expect(ticketDeposits0[1][3]).to.be.false;
          expect(ticketDeposits0[1][4]).to.eq(0);
          expect(ticketDeposits0[1][5]).to.eq(usdc_stablecoin.address);
          expect(ticketDeposits0[1][6]).to.eq(usdcDepositAmount.div(1));
          expect(ticketDeposits0[1][8]).to.eq(1);

          expect(ticketDeposits0[2][0]).to.eq(depositer.address);
          expect(ticketDeposits0[2][1]).to.eq(0); // ticketid
          expect(ticketDeposits0[2][2]).to.eq(2); // deposit id
          expect(ticketDeposits0[2][3]).to.be.false;
          expect(ticketDeposits0[2][4]).to.eq(nativeDepositAmount2.div(2));
          expect(ticketDeposits0[2][5]).to.eq(ethers.constants.AddressZero);
          expect(ticketDeposits0[2][6]).to.eq(0);
          expect(ticketDeposits0[2][8]).to.eq(2);

          expect(ticketDeposits0[3][0]).to.eq(depositer.address);
          expect(ticketDeposits0[3][1]).to.eq(0); // ticketid
          expect(ticketDeposits0[3][2]).to.eq(3); // deposit id
          expect(ticketDeposits0[3][3]).to.be.false;
          expect(ticketDeposits0[3][4]).to.eq(0);
          expect(ticketDeposits0[3][5]).to.eq(usdc_stablecoin.address);
          expect(ticketDeposits0[3][6]).to.eq(usdcDepositAmount2.div(2));
          expect(ticketDeposits0[3][8]).to.eq(2);

          expect(ticketDeposits1[0][0]).to.eq(depositer.address);
          expect(ticketDeposits1[0][1]).to.eq(1); // ticketid
          expect(ticketDeposits1[0][2]).to.eq(2); // deposit id
          expect(ticketDeposits1[0][3]).to.be.false;
          expect(ticketDeposits1[0][4]).to.eq(nativeDepositAmount2.div(2));
          expect(ticketDeposits1[0][5]).to.eq(ethers.constants.AddressZero);
          expect(ticketDeposits1[0][6]).to.eq(0);
          expect(ticketDeposits1[0][8]).to.eq(2);

          expect(ticketDeposits1[1][0]).to.eq(depositer.address);
          expect(ticketDeposits1[1][1]).to.eq(1); // ticketid
          expect(ticketDeposits1[1][2]).to.eq(3); // deposit id
          expect(ticketDeposits1[1][3]).to.be.false;
          expect(ticketDeposits1[1][4]).to.eq(0);
          expect(ticketDeposits1[1][5]).to.eq(usdc_stablecoin.address);
          expect(ticketDeposits1[1][6]).to.eq(usdcDepositAmount2.div(2));
          expect(ticketDeposits1[1][8]).to.eq(2);
        });
      });
    });

    describe("withdrawing payout (unit tests)", () => {
      let depositer: SignerWithAddress;
      let ticketId = 0;

      beforeEach(async () => {
        depositer = user;
        await usdc_stablecoin.mint(depositer.address, USDC_STARTING_BALANCE);
        await timeout(400);
        await usdc_stablecoin
          .connect(depositer)
          .approve(lootbox.address, USDC_STARTING_BALANCE);
        await timeout(400);

        const nonce = generateNonce();
        const signature = await signWhitelist(
          network.config.chainId || 0,
          lootbox.address,
          whitelister,
          minter.address,
          nonce,
          "LootboxCosmic"
        );
        await lootbox.connect(minter).mint(signature, nonce);
      });

      it("when the deposit is equal to maxTickets, it pays out 1 unit", async () => {
        const ticketCount = randomBN("1000000000000000000");

        lootbox = await Lootbox.deploy(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          BASE_URI,
          ticketCount,
          issuingEntity.address,
          whitelister.address
        );

        const nonce = generateNonce();
        const signature = await signWhitelist(
          network.config.chainId || 0,
          lootbox.address,
          whitelister,
          minter.address,
          nonce,
          "LootboxCosmic"
        );

        await lootbox.connect(minter).mint(signature, nonce);

        await lootbox
          .connect(depositer)
          .depositEarningsNative({ value: ticketCount });

        // withdraw and compare native balance
        const initNativeBalance = await minter.getBalance();

        const res = await lootbox.connect(minter).withdrawEarnings(0);
        const receipt = await res.wait();
        const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const newNativeBalance = await minter.getBalance();
        expect(newNativeBalance).to.eq(initNativeBalance.sub(gasUsed).add(1));
      });

      it("when deposit is smaller than maxTickets, it pays out nothing", async () => {
        const ticketCount = randomBN("1000000000000000000");

        const testDiffs = ["1", "10", "100000", ticketCount.sub(1).toString()];
        for (let diff of testDiffs) {
          lootbox = await Lootbox.deploy(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            BASE_URI,
            ticketCount,
            issuingEntity.address,
            whitelister.address
          );

          const nonce = generateNonce();
          const signature = await signWhitelist(
            network.config.chainId || 0,
            lootbox.address,
            whitelister,
            minter.address,
            nonce,
            "LootboxCosmic"
          );

          await lootbox.connect(minter).mint(signature, nonce);

          await lootbox
            .connect(depositer)
            .depositEarningsNative({ value: ticketCount.sub(diff) });

          // withdraw and compare native balance
          const initNativeBalance = await minter.getBalance();

          const res = await lootbox.connect(minter).withdrawEarnings(0);
          const receipt = await res.wait();
          const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
          const newNativeBalance = await minter.getBalance();
          expect(newNativeBalance).lt(initNativeBalance);
          expect(newNativeBalance).to.eq(initNativeBalance.sub(gasUsed));
        }
      });

      it("reverts if contract is paused", async () => {
        await lootbox.connect(issuingEntity).pause();

        await expect(
          lootbox.connect(minter).withdrawEarnings(ticketId)
        ).to.be.revertedWith("Pausable: paused");
      });
      it("reverts if the desired ticket has not been minted yet", async () => {
        await expect(
          lootbox.connect(minter).withdrawEarnings(2)
        ).to.be.revertedWith("ERC721: invalid token ID");
      });

      it("reverts if the caller does not own the ticket", async () => {
        await expect(
          lootbox.connect(malicious).withdrawEarnings(ticketId)
        ).to.be.revertedWith("You do not own this ticket");
      });

      it("reverts if there has been no deposits yet", async () => {
        await expect(
          lootbox.connect(minter).withdrawEarnings(ticketId)
        ).to.be.revertedWith("No deposits");
      });

      describe("given a native & erc20 deposit", () => {
        let nativeDepositAmount: BigNumber;
        let erc20DepositAmount: BigNumber;

        beforeEach(async () => {
          nativeDepositAmount = randomBN(NATIVE_STARTING_BALANCE).div(10);
          erc20DepositAmount = randomBN(USDC_STARTING_BALANCE).div(10);

          await lootbox.connect(depositer).depositEarningsNative({
            value: nativeDepositAmount,
          });
          await timeout(300);
          await lootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, erc20DepositAmount);
          await timeout(200);
        });

        it("transfers the correct amount of native & or erc20", async () => {
          const expectedNativeYieldPerTicket =
            nativeDepositAmount.div(lootboxMaxTickets);
          const expectedUsdcYieldPerTicket =
            erc20DepositAmount.div(lootboxMaxTickets);

          const nativeBalanceInit = await minter.getBalance();
          const usdcBalanceInit = await usdc_stablecoin.balanceOf(
            minter.address
          );

          const res = await lootbox.connect(minter).withdrawEarnings(ticketId);
          const receipt = await res.wait();
          const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

          expect(await minter.getBalance()).to.eq(
            nativeBalanceInit.add(expectedNativeYieldPerTicket).sub(gasUsed)
          );
          expect(await usdc_stablecoin.balanceOf(minter.address)).to.eq(
            usdcBalanceInit.add(expectedUsdcYieldPerTicket)
          );
        });

        it("calling withdrawal multiple times does not revert, but does not double add balance", async () => {
          await lootbox.connect(minter).withdrawEarnings(ticketId);

          const nativebalance = await minter.getBalance();
          const erc20Balance = await usdc_stablecoin.balanceOf(minter.address);

          const res = await lootbox.connect(minter).withdrawEarnings(ticketId);
          const receipt = await res.wait();
          const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

          // not change (other than gas fee subtraction lul)
          expect(await minter.getBalance()).to.eq(nativebalance.sub(gasUsed));
          expect(await usdc_stablecoin.balanceOf(minter.address)).to.eq(
            erc20Balance
          );
        });

        it("updates the depositRedemptions to true", async () => {
          expect(await lootbox.depositRedemptions(0, 0)).to.be.false;
          expect(await lootbox.depositRedemptions(0, 1)).to.be.false;

          await lootbox.connect(minter).withdrawEarnings(ticketId);

          expect(await lootbox.depositRedemptions(0, 0)).to.be.true;
          expect(await lootbox.depositRedemptions(0, 1)).to.be.true;
        });

        it("emits the correct WithdrawEarnings event", async () => {
          const expectedNativeYieldPerTicket =
            nativeDepositAmount.div(lootboxMaxTickets);
          const expectedUsdcYieldPerTicket =
            erc20DepositAmount.div(lootboxMaxTickets);

          const response = lootbox.connect(minter).withdrawEarnings(0);
          await expect(response)
            .to.emit(lootbox, "WithdrawEarnings")
            .withArgs(
              minter.address,
              lootbox.address,
              0,
              0,
              expectedNativeYieldPerTicket,
              constants.AddressZero,
              0
            );

          await expect(response).to.emit(lootbox, "WithdrawEarnings").withArgs(
            minter.address,
            lootbox.address,
            0,
            1, // second deposit
            0,
            usdc_stablecoin.address,
            expectedUsdcYieldPerTicket
          );
        });
      });
    });

    describe("withdrawing payout (comprehensive tests)", () => {
      let depositers: SignerWithAddress[];
      let redeemers: SignerWithAddress[];
      const redeemerTicketIds: { [key: string]: number[] } = {};
      let expectedNativeYieldPerTicket: BigNumber;
      let expectedUsdcYieldPerTicket: BigNumber;
      let expectedUsdtYieldPerTicket: BigNumber;

      beforeEach(async () => {
        expectedNativeYieldPerTicket = ethers.BigNumber.from(0);
        expectedUsdcYieldPerTicket = ethers.BigNumber.from(0);
        expectedUsdtYieldPerTicket = ethers.BigNumber.from(0);

        depositers = [issuingEntity, deployer];
        redeemers = [user, minter];
        for (let depositer of depositers) {
          // setup
          await usdc_stablecoin.mint(
            depositer.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );
          await timeout(400);
          await usdc_stablecoin
            .connect(depositer)
            .approve(
              lootbox.address,
              ethers.BigNumber.from(USDC_STARTING_BALANCE)
            );
          await timeout(400);
          await usdt_stablecoin.mint(
            depositer.address,
            ethers.BigNumber.from(USDT_STARTING_BALANCE)
          );
          await timeout(400);
          await usdt_stablecoin
            .connect(depositer)
            .approve(
              lootbox.address,
              ethers.BigNumber.from(USDT_STARTING_BALANCE)
            );
          await timeout(400);
        }

        // we have to whitelist & mint out tickets
        let ticketCounter = 0;
        for (
          let redeemerIdx = 0;
          redeemerIdx < redeemers.length;
          redeemerIdx++
        ) {
          let redeemer = redeemers[redeemerIdx];
          const ntickets = random(1, 5); // randomly mint this many tickets...
          for (let ticketIdx = 0; ticketIdx < ntickets; ticketIdx++) {
            const nonce = generateNonce();
            const signature = await signWhitelist(
              network.config.chainId || 0,
              lootbox.address,
              whitelister,
              redeemer.address,
              nonce,
              "LootboxCosmic"
            );
            await lootbox.connect(redeemer).mint(signature, nonce);
            if (!redeemerTicketIds[redeemer.address]) {
              redeemerTicketIds[redeemer.address] = [ticketCounter];
            } else {
              redeemerTicketIds[redeemer.address].push(ticketCounter);
            }
            ticketCounter++;
          }
        }

        for (let depositer of depositers) {
          const nativeDepositAmount = randomBN(NATIVE_STARTING_BALANCE).div(10);
          expectedNativeYieldPerTicket = expectedNativeYieldPerTicket.add(
            nativeDepositAmount.div(lootboxMaxTickets)
          );

          const erc20DepositAmount = randomBN(USDC_STARTING_BALANCE).div(10);
          expectedUsdcYieldPerTicket = expectedUsdcYieldPerTicket.add(
            erc20DepositAmount.div(lootboxMaxTickets)
          );

          const usdtDepositAmount = randomBN(USDC_STARTING_BALANCE).div(10);

          expectedUsdtYieldPerTicket = expectedUsdtYieldPerTicket.add(
            usdtDepositAmount.div(lootboxMaxTickets)
          );

          await lootbox.connect(depositer).depositEarningsNative({
            value: nativeDepositAmount,
          });
          await timeout(400);

          await lootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, erc20DepositAmount);
          await timeout(400);

          await lootbox
            .connect(depositer)
            .depositEarningsErc20(usdt_stablecoin.address, usdtDepositAmount);
          await timeout(400);
        }
      });

      it("pays out all tickets correctly", async () => {
        // just redeem all ticket holders and make sure the money add up
        for (let redeemer of redeemers) {
          const tickets = redeemerTicketIds[redeemer.address];
          for (let ticketId of tickets) {
            const nativeBalanceInit = await redeemer.getBalance();
            await timeout(200);
            const usdcBalanceInit = await usdc_stablecoin.balanceOf(
              redeemer.address
            );
            const usdtBalanceInit = await usdt_stablecoin.balanceOf(
              redeemer.address
            );
            await timeout(200);

            const res = await lootbox
              .connect(redeemer)
              .withdrawEarnings(ticketId);
            await timeout(200);
            const receipt = await res.wait();
            const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            // NEED TO GET expected yield
            expect(await redeemer.getBalance()).to.eq(
              nativeBalanceInit.add(expectedNativeYieldPerTicket).sub(gasUsed)
            );
            await timeout(200);
            expect(await usdc_stablecoin.balanceOf(redeemer.address)).to.eq(
              usdcBalanceInit.add(expectedUsdcYieldPerTicket)
            );
            await timeout(200);
            expect(await usdt_stablecoin.balanceOf(redeemer.address)).to.eq(
              usdtBalanceInit.add(expectedUsdtYieldPerTicket)
            );
            await timeout(200);
          }
        }
      });
    });

    describe("withdrawing payout (full ticket distribution)", () => {
      let depositers: SignerWithAddress[];
      let redeemers: SignerWithAddress[];
      let redeemerTicketIds: { [key: string]: number[] };
      let expectedNativeYieldPerTicket: BigNumber;
      let expectedUsdcYieldPerTicket: BigNumber;
      let expectedUsdtYieldPerTicket: BigNumber;

      beforeEach(async () => {
        expectedNativeYieldPerTicket = ethers.BigNumber.from(0);
        expectedUsdcYieldPerTicket = ethers.BigNumber.from(0);
        expectedUsdtYieldPerTicket = ethers.BigNumber.from(0);
        redeemerTicketIds = {};

        lootboxMaxTickets = lootboxMaxTickets = random(1, 10); // Change the default so its more sustainable for our tests
        depositers = [issuingEntity, deployer];
        redeemers = [user, minter];

        lootbox = await Lootbox.deploy(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          BASE_URI,
          lootboxMaxTickets,
          issuingEntity.address,
          whitelister.address
        );

        for (let depositer of depositers) {
          // setup
          await usdc_stablecoin.mint(
            depositer.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );
          await timeout(400);
          await usdc_stablecoin
            .connect(depositer)
            .approve(
              lootbox.address,
              ethers.BigNumber.from(USDC_STARTING_BALANCE)
            );
          await timeout(400);
          await usdt_stablecoin.mint(
            depositer.address,
            ethers.BigNumber.from(USDT_STARTING_BALANCE)
          );
          await timeout(400);
          await usdt_stablecoin
            .connect(depositer)
            .approve(
              lootbox.address,
              ethers.BigNumber.from(USDT_STARTING_BALANCE)
            );
          await timeout(400);
        }

        for (let ticketIdx = 0; ticketIdx < lootboxMaxTickets; ticketIdx++) {
          // Randomly choose the redeemer
          const redeemer =
            redeemers[Math.floor(Math.random() * redeemers.length)];

          // Mint all the tickets
          const nonce = generateNonce();
          const signature = await signWhitelist(
            network.config.chainId || 0,
            lootbox.address,
            whitelister,
            redeemer.address,
            nonce,
            "LootboxCosmic"
          );
          await lootbox.connect(redeemer).mint(signature, nonce);
          await timeout(300);
          if (!redeemerTicketIds[redeemer.address]) {
            redeemerTicketIds[redeemer.address] = [ticketIdx];
          } else {
            redeemerTicketIds[redeemer.address].push(ticketIdx);
          }
        }

        // Make some random deposits
        const ndeposits = random(1, 5);
        for (let depositIdx = 0; depositIdx < ndeposits; depositIdx++) {
          // Choose random depositer
          const depositer =
            depositers[Math.floor(Math.random() * depositers.length)];

          // Randomly choose how much monays to deposit
          const depositAmount = randomBN(USDC_STARTING_BALANCE).div(100);
          const depositCurrency = random(0, 2);

          if (depositCurrency === 0) {
            // native
            await lootbox.connect(depositer).depositEarningsNative({
              value: depositAmount,
            });
            expectedNativeYieldPerTicket = expectedNativeYieldPerTicket.add(
              depositAmount.div(lootboxMaxTickets)
            );
          } else if (depositCurrency === 1) {
            // usdc
            await lootbox
              .connect(depositer)
              .depositEarningsErc20(usdc_stablecoin.address, depositAmount);
            expectedUsdcYieldPerTicket = expectedUsdcYieldPerTicket.add(
              depositAmount.div(lootboxMaxTickets)
            );
          } else {
            // usdt
            await lootbox
              .connect(depositer)
              .depositEarningsErc20(usdt_stablecoin.address, depositAmount);
            expectedUsdtYieldPerTicket = expectedUsdtYieldPerTicket.add(
              depositAmount.div(lootboxMaxTickets)
            );
          }
          await timeout(300);
        }
      });

      it("pays out each ticket the same amount & lootbox has near-zero balance after distribution", async () => {
        for (const [address, tickets] of Object.entries(redeemerTicketIds)) {
          // We need to withdraw each ticket & make sure the same mmoney
          const user = redeemers.find(
            (r) => r.address === address
          ) as SignerWithAddress;
          expect(user).to.not.be.undefined;

          let runningBalanceNative = await user.getBalance();
          let runningBalanceUSDC = await usdc_stablecoin.balanceOf(
            user.address
          );
          let runningBalanceUSDT = await usdt_stablecoin.balanceOf(
            user.address
          );

          // make the withdraw call
          for (let ticketIdx of tickets) {
            const res = await lootbox.connect(user).withdrawEarnings(ticketIdx);
            const receipt = await res.wait();
            const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            // Makesure they have the right balance
            runningBalanceNative = runningBalanceNative
              .add(expectedNativeYieldPerTicket)
              .sub(gasUsed);
            runningBalanceUSDC = runningBalanceUSDC.add(
              expectedUsdcYieldPerTicket
            );
            runningBalanceUSDT = runningBalanceUSDT.add(
              expectedUsdtYieldPerTicket
            );
          }

          const finalBalanceNative = await user.getBalance();
          const finalBalanceUSDC = await usdc_stablecoin.balanceOf(
            user.address
          );
          const finalBalanceUSDT = await usdt_stablecoin.balanceOf(
            user.address
          );

          expect(finalBalanceNative).to.eq(runningBalanceNative);
          expect(finalBalanceUSDC).to.eq(runningBalanceUSDC);
          expect(finalBalanceUSDT).to.eq(runningBalanceUSDT);
        }

        // Lootbox should have zero balance....
        const lootboxFinalBalanceNative = await provider.getBalance(
          lootbox.address
        );
        const lootboxFinalBalanceUSDC = await usdc_stablecoin.balanceOf(
          lootbox.address
        );
        const lootboxFinalBalanceUSDT = await usdt_stablecoin.balanceOf(
          lootbox.address
        );

        // Lootbox balance should be near zero - but, not exactly zero because of
        // round off truncations in the smarty contract
        expect(lootboxFinalBalanceNative.toNumber()).to.be.lt(100);
        expect(lootboxFinalBalanceUSDC.toNumber()).to.be.lt(100);
        expect(lootboxFinalBalanceUSDT.toNumber()).to.be.lt(100);
      });
    });

    describe("withdrawing payout (interactions with changing maxTickets)", () => {
      let depositers: SignerWithAddress[];
      let redeemers: SignerWithAddress[];
      let expectedNativeYield: BigNumber[];
      let expectedUSDCYield: BigNumber[];
      let expectedUSDTYield: BigNumber[];
      let maxTicketsHistory: number[];
      let redeemerTicketIds: { [key: string]: number[] }[];
      let lootbox: LootboxCosmic;

      beforeEach(async () => {
        depositers = [issuingEntity, malicious, purchaser];
        redeemers = [user, minter, purchaser];

        expectedNativeYield = [];
        expectedUSDCYield = [];
        expectedUSDTYield = [];
        redeemerTicketIds = [];
        maxTicketsHistory = [];

        const seedMaxTickets = random(1, 4);

        lootbox = await Lootbox.deploy(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          BASE_URI,
          seedMaxTickets,
          issuingEntity.address,
          whitelister.address
        );

        // set up minting erc20
        for (let depositer of depositers) {
          // setup
          await usdc_stablecoin.mint(
            depositer.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );
          await timeout(300);
          await usdc_stablecoin
            .connect(depositer)
            .approve(
              lootbox.address,
              ethers.BigNumber.from(USDC_STARTING_BALANCE)
            );
          await timeout(300);
          await usdt_stablecoin.mint(
            depositer.address,
            ethers.BigNumber.from(USDT_STARTING_BALANCE)
          );
          await timeout(300);
          await usdt_stablecoin
            .connect(depositer)
            .approve(
              lootbox.address,
              ethers.BigNumber.from(USDT_STARTING_BALANCE)
            );
          await timeout(300);
        }

        const maxTicketsChangeRounds = random(2, 5);

        for (let round = 0; round <= maxTicketsChangeRounds; round++) {
          expectedNativeYield.push(ethers.BigNumber.from(0));
          expectedUSDCYield.push(ethers.BigNumber.from(0));
          expectedUSDTYield.push(ethers.BigNumber.from(0));
          redeemerTicketIds.push({});

          const newMaxTickets =
            round === 0
              ? seedMaxTickets
              : // : maxTicketsHistory[round - 1] + random(1, 4);
                maxTicketsHistory[round - 1] + 1;

          if (round !== 0) {
            await lootbox
              .connect(issuingEntity)
              .changeMaxTickets(newMaxTickets);
          }

          maxTicketsHistory.push(newMaxTickets);

          // Make some random deposits
          const ndeposits = random(1, 4);
          for (let _depositIdx = 0; _depositIdx < ndeposits; _depositIdx++) {
            // Choose random depositer
            const depositer =
              depositers[Math.floor(Math.random() * depositers.length)];

            // Randomly choose how much monays to deposit
            const depositAmount = randomBN(USDC_STARTING_BALANCE).div(100);

            const depositCurrency = random(0, 2);

            if (depositCurrency === 0) {
              // native
              await lootbox.connect(depositer).depositEarningsNative({
                value: depositAmount,
              });
              expectedNativeYield[round] = expectedNativeYield[round].add(
                depositAmount.div(newMaxTickets)
              );
            } else if (depositCurrency === 1) {
              // usdc
              await lootbox
                .connect(depositer)
                .depositEarningsErc20(usdc_stablecoin.address, depositAmount);

              expectedUSDCYield[round] = expectedUSDCYield[round].add(
                depositAmount.div(newMaxTickets)
              );
            } else {
              // usdt
              await lootbox
                .connect(depositer)
                .depositEarningsErc20(usdt_stablecoin.address, depositAmount);

              expectedUSDTYield[round] = expectedUSDTYield[round].add(
                depositAmount.div(newMaxTickets)
              );
            }
            await timeout(300);
          }

          for (
            let ticketIdx = round === 0 ? 0 : maxTicketsHistory[round - 1];
            ticketIdx < newMaxTickets;
            ticketIdx++
          ) {
            // Randomly choose the redeemer
            const redeemer =
              redeemers[Math.floor(Math.random() * redeemers.length)];

            // Mint all the tickets
            const nonce = generateNonce();
            const signature = await signWhitelist(
              network.config.chainId || 0,
              lootbox.address,
              whitelister,
              redeemer.address,
              nonce,
              "LootboxCosmic"
            );
            await lootbox.connect(redeemer).mint(signature, nonce);
            await timeout(300);
            if (!redeemerTicketIds[round][redeemer.address]) {
              redeemerTicketIds[round][redeemer.address] = [ticketIdx];
            } else {
              redeemerTicketIds[round][redeemer.address].push(ticketIdx);
            }
          }
        }
      });

      it("pays each ticket the cumulative sum of round deposits where their ticketID < maxTickets", async () => {
        for (let round = 0; round < redeemerTicketIds.length; round++) {
          const expectedNativeYieldForRound = expectedNativeYield
            .slice(round, redeemerTicketIds.length)
            .reduce((prev, val) => prev.add(val), ethers.BigNumber.from(0));
          const expectedUSDCYieldForRound = expectedUSDCYield
            .slice(round, redeemerTicketIds.length)
            .reduce((prev, val) => prev.add(val), ethers.BigNumber.from(0));
          const expectedUSDTYieldForRound = expectedUSDTYield
            .slice(round, redeemerTicketIds.length)
            .reduce((prev, val) => prev.add(val), ethers.BigNumber.from(0));

          for (const [redeemerAddr, tickets] of Object.entries(
            redeemerTicketIds[round]
          )) {
            // We need to withdraw each ticket & make sure the correct mmoney
            const userInUse = redeemers.find(
              (r) => r.address === redeemerAddr
            ) as SignerWithAddress;

            expect(userInUse).to.not.be.undefined;
            let runningBalanceNative = await userInUse.getBalance();
            let runningBalanceUSDC = await usdc_stablecoin.balanceOf(
              userInUse.address
            );
            let runningBalanceUSDT = await usdt_stablecoin.balanceOf(
              userInUse.address
            );

            for (let ticketIdx of tickets) {
              const res = await lootbox
                .connect(userInUse)
                .withdrawEarnings(ticketIdx);
              const receipt = await res.wait();
              const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
              await timeout(300);

              // Makesure they have the right balance
              runningBalanceNative = runningBalanceNative
                .add(expectedNativeYieldForRound)
                .sub(gasUsed);
              runningBalanceUSDC = runningBalanceUSDC.add(
                expectedUSDCYieldForRound
              );
              runningBalanceUSDT = runningBalanceUSDT.add(
                expectedUSDTYieldForRound
              );
            }

            const finalBalanceNative = await userInUse.getBalance();
            await timeout(300);
            const finalBalanceUSDC = await usdc_stablecoin.balanceOf(
              userInUse.address
            );
            await timeout(300);
            const finalBalanceUSDT = await usdt_stablecoin.balanceOf(
              userInUse.address
            );

            expect(finalBalanceNative).to.eq(runningBalanceNative);
            expect(finalBalanceUSDC).to.eq(runningBalanceUSDC.toString());
            expect(finalBalanceUSDT).to.eq(runningBalanceUSDT.toString());
          }
        }

        // Lootbox should have zero balance....
        const lootboxFinalBalanceNative = await provider.getBalance(
          lootbox.address
        );
        const lootboxFinalBalanceUSDC = await usdc_stablecoin.balanceOf(
          lootbox.address
        );
        const lootboxFinalBalanceUSDT = await usdt_stablecoin.balanceOf(
          lootbox.address
        );

        // Lootbox balance should be near zero - but, not exactly zero because of
        // round off truncations in the smarty contract
        expect(lootboxFinalBalanceNative.toNumber()).to.be.lt(100);
        expect(lootboxFinalBalanceUSDC.toNumber()).to.be.lt(100);
        expect(lootboxFinalBalanceUSDT.toNumber()).to.be.lt(100);
      });
    });

    describe("depositing payout (unit tests)", () => {
      let depositer: SignerWithAddress;
      let nativeDepositAmount: BigNumber;
      let usdcDepositAmount: BigNumber;

      beforeEach(async () => {
        depositer = deployer;

        await usdc_stablecoin.mint(
          depositer.address,
          ethers.BigNumber.from(USDC_STARTING_BALANCE)
        );

        await usdc_stablecoin
          .connect(depositer)
          .approve(
            lootbox.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );

        nativeDepositAmount = randomBN(USDC_STARTING_BALANCE).div(10);

        usdcDepositAmount = randomBN(USDC_STARTING_BALANCE).div(10);
      });

      it("reverts when contract is paused", async () => {
        await lootbox.connect(issuingEntity).pause();
        await expect(
          lootbox.connect(depositer).depositEarningsNative({
            value: nativeDepositAmount,
          })
        ).to.be.revertedWith("Pausable: paused");
        await expect(
          lootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount)
        ).to.be.revertedWith("Pausable: paused");
      });

      it("not possible to deposit both native tokens & erc20 in the same transaction", async () => {
        await expect(
          lootbox
            .connect(depositer)
            .depositEarningsErc20(
              usdc_stablecoin.address,
              ethers.BigNumber.from(USDC_STARTING_BALANCE).div(1000000),
              {
                value: nativeDepositAmount,
              }
            )
        ).to.be.revertedWith("Cannot include native balance");
      });

      it("deposits will increment the depositId", async () => {
        expect(await lootbox.depositIdCounter()).to.eq("0");
        await lootbox.connect(depositer).depositEarningsNative({
          value: nativeDepositAmount,
        });
        expect(await lootbox.depositIdCounter()).to.eq("1");
        await timeout(400);
        await lootbox.connect(depositer).depositEarningsNative({
          value: nativeDepositAmount,
        });
        expect(await lootbox.depositIdCounter()).to.eq("2");
        await timeout(400);
        await lootbox
          .connect(depositer)
          .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount);
        expect(await lootbox.depositIdCounter()).to.eq("3");
        await timeout(400);
      });

      describe("given two deposits of native and erc20 token", async () => {
        let nativeTx: ContractTransaction;
        let erc20Tx: ContractTransaction;

        beforeEach(async () => {
          nativeTx = await lootbox.connect(depositer).depositEarningsNative({
            value: nativeDepositAmount,
          });

          erc20Tx = await lootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount);
        });

        it("counts the total native & erc20 token amount correctly", async () => {
          expect(await lootbox.viewTotalDepositOfNativeToken()).to.eq(
            nativeDepositAmount
          );
          expect(
            await lootbox.viewTotalDepositOfErc20Token(usdc_stablecoin.address)
          ).to.eq(usdcDepositAmount);

          const nativeDepositAmount2 = randomBN(USDC_STARTING_BALANCE).div(10);

          const usdcDepositAmount2 = randomBN(USDC_STARTING_BALANCE).div(10);

          // Make sure it gets updated
          await lootbox.connect(depositer).depositEarningsNative({
            value: nativeDepositAmount2,
          });

          await lootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount2);

          expect(await lootbox.viewTotalDepositOfNativeToken()).to.eq(
            nativeDepositAmount.add(nativeDepositAmount2)
          );
          expect(
            await lootbox.viewTotalDepositOfErc20Token(usdc_stablecoin.address)
          ).to.eq(usdcDepositAmount.add(usdcDepositAmount2));
        });

        it("tracks the deposit event correctly", async () => {
          const [receiptNative, receiptUSDC] = await lootbox.viewAllDeposits();

          expect(receiptNative[0]).to.eq(depositer.address);
          expect(receiptNative[1]).to.eq(0);
          expect(receiptNative[3]).to.eq(nativeDepositAmount);
          expect(receiptNative[4]).to.eq(constants.AddressZero);
          expect(receiptNative[5]).to.eq(0);
          expect(receiptNative[7]).to.eq(lootboxMaxTickets);

          expect(padAddressTo32Bytes(receiptUSDC[0])).to.eq(
            padAddressTo32Bytes(depositer.address)
          );
          expect(receiptUSDC[1]).to.eq(1);
          expect(receiptUSDC[3]).to.eq(0);
          expect(receiptUSDC[4]).to.eq(usdc_stablecoin.address);
          expect(receiptUSDC[5]).to.eq(usdcDepositAmount);
          expect(receiptUSDC[7]).to.eq(lootboxMaxTickets);
        });

        it("tracks the pro-rated deposit event correctly", async () => {
          // mint ticket to check prorated data
          const nonce = generateNonce();
          const signature = await signWhitelist(
            network.config.chainId || 0,
            lootbox.address,
            whitelister,
            minter.address,
            nonce,
            "LootboxCosmic"
          );
          await lootbox.connect(minter).mint(signature, nonce);

          const proratedDeposits = await lootbox.viewProratedDepositsForTicket(
            0
          );

          expect(proratedDeposits.length).to.eq(2);

          const [nativeDeposit, erc20Deposit] = proratedDeposits;

          expect(nativeDeposit[0]).to.eq(depositer.address);
          expect(nativeDeposit[1]).to.eq(0); // ticketid
          expect(nativeDeposit[2]).to.eq(0); // deposit id
          expect(nativeDeposit[3]).to.be.false;
          expect(nativeDeposit[4]).to.eq(
            nativeDepositAmount.div(lootboxMaxTickets)
          );
          expect(nativeDeposit[5]).to.eq(ethers.constants.AddressZero);
          expect(nativeDeposit[6]).to.eq(0);
          expect(nativeDeposit[8]).to.eq(lootboxMaxTickets);

          expect(erc20Deposit[0]).to.eq(depositer.address);
          expect(erc20Deposit[1]).to.eq(0); // ticketid
          expect(erc20Deposit[2]).to.eq(1); // deposit id
          expect(erc20Deposit[3]).to.be.false;
          expect(erc20Deposit[4]).to.eq(0);
          expect(erc20Deposit[5]).to.eq(usdc_stablecoin.address);
          expect(erc20Deposit[6]).to.eq(
            usdcDepositAmount.div(lootboxMaxTickets)
          );
          expect(erc20Deposit[8]).to.eq(lootboxMaxTickets);
        });

        it("emits correct events for erc20 & native", async () => {
          await expect(nativeTx)
            .to.emit(lootbox, "DepositEarnings")
            .withArgs(
              depositer.address,
              lootbox.address,
              0,
              nativeDepositAmount,
              constants.AddressZero,
              0,
              lootboxMaxTickets
            );

          await expect(erc20Tx)
            .to.emit(lootbox, "DepositEarnings")
            .withArgs(
              depositer.address,
              lootbox.address,
              1,
              0,
              usdc_stablecoin.address,
              usdcDepositAmount,
              lootboxMaxTickets
            );
        });
      });
    });

    describe("depositing payout (comprehensive tests)", () => {
      let depositers: SignerWithAddress[];
      let redeemers: SignerWithAddress[];

      beforeEach(async () => {
        depositers = [issuingEntity, malicious, purchaser];
        redeemers = [user, minter];
        for (let depositer of depositers) {
          await usdc_stablecoin.mint(
            depositer.address,
            ethers.BigNumber.from(USDC_STARTING_BALANCE)
          );
          await timeout(400);
          await usdc_stablecoin
            .connect(depositer)
            .approve(
              lootbox.address,
              ethers.BigNumber.from(USDC_STARTING_BALANCE)
            );
          await timeout(400);

          await usdt_stablecoin.mint(
            depositer.address,
            ethers.BigNumber.from(USDT_STARTING_BALANCE)
          );
          await timeout(400);
          await usdt_stablecoin
            .connect(depositer)
            .approve(
              lootbox.address,
              ethers.BigNumber.from(USDT_STARTING_BALANCE)
            );
          await timeout(400);
        }

        for (let redeemer of redeemers) {
          const nonce = generateNonce();
          const signature = await signWhitelist(
            network.config.chainId || 0,
            lootbox.address,
            whitelister,
            redeemer.address,
            nonce,
            "LootboxCosmic"
          );

          await lootbox.connect(redeemer).mint(signature, nonce);
          await timeout(400);
        }
      });
      it("can deposit NATIVE & ERC20 token which emits Deposit events & tracks correct deposit receipts", async () => {
        let expectedDepositId = 0;
        for (let depositer of depositers) {
          const depositNative = lootbox
            .connect(depositer)
            .depositEarningsNative({
              value: ethers.BigNumber.from(USDC_STARTING_BALANCE).div(10),
            });
          const depositUsdc = lootbox
            .connect(depositer)
            .depositEarningsErc20(
              usdc_stablecoin.address,
              ethers.BigNumber.from(USDC_STARTING_BALANCE).div(10)
            );
          const depositUsdt = lootbox
            .connect(depositer)
            .depositEarningsErc20(
              usdt_stablecoin.address,
              ethers.BigNumber.from(USDT_STARTING_BALANCE).div(10)
            );

          await expect(depositNative)
            .to.emit(lootbox, "DepositEarnings")
            .withArgs(
              depositer.address,
              lootbox.address,
              expectedDepositId,
              ethers.BigNumber.from(USDC_STARTING_BALANCE).div(10),
              constants.AddressZero,
              0,
              lootboxMaxTickets
            );

          await timeout(400);
          expectedDepositId += 1;

          await expect(depositUsdc)
            .to.emit(lootbox, "DepositEarnings")
            .withArgs(
              depositer.address,
              lootbox.address,
              expectedDepositId,
              0,
              usdc_stablecoin.address,
              ethers.BigNumber.from(USDC_STARTING_BALANCE).div(10),
              lootboxMaxTickets
            );

          await timeout(400);
          expectedDepositId += 1;

          await expect(depositUsdt)
            .to.emit(lootbox, "DepositEarnings")
            .withArgs(
              depositer.address,
              lootbox.address,
              expectedDepositId,
              0,
              usdt_stablecoin.address,
              ethers.BigNumber.from(USDT_STARTING_BALANCE).div(10),
              lootboxMaxTickets
            );

          await timeout(400);
          expectedDepositId += 1;

          await expect(depositNative).to.not.be.reverted;
          await expect(depositUsdc).to.not.be.reverted;
          await expect(depositUsdt).to.not.be.reverted;
        }

        const depositReceipts = await lootbox.viewAllDeposits();

        expectedDepositId = 0;
        for (let depositer of depositers) {
          const receiptNative = depositReceipts[expectedDepositId];
          expect(padAddressTo32Bytes(receiptNative[0])).to.eq(
            padAddressTo32Bytes(depositer.address)
          );
          expect(receiptNative[1]).to.eq(expectedDepositId);
          // expect(a[1]).to.eq() // block number
          expect(receiptNative[3]).to.eq(
            ethers.BigNumber.from(USDC_STARTING_BALANCE).div(10)
          );
          expect(padAddressTo32Bytes(receiptNative[4])).to.eq(
            padAddressTo32Bytes(constants.AddressZero)
          );
          expect(receiptNative[5]).to.eq(0);

          expectedDepositId += 1;

          const receiptUSDC = depositReceipts[expectedDepositId];
          expect(padAddressTo32Bytes(receiptUSDC[0])).to.eq(
            padAddressTo32Bytes(depositer.address)
          );
          expect(receiptUSDC[1]).to.eq(expectedDepositId);
          // expect(a[1]).to.eq() // block number
          expect(receiptUSDC[3]).to.eq(0);
          expect(padAddressTo32Bytes(receiptUSDC[4])).to.eq(
            padAddressTo32Bytes(usdc_stablecoin.address)
          );
          expect(receiptUSDC[5]).to.eq(
            ethers.BigNumber.from(USDC_STARTING_BALANCE).div(10)
          );

          expectedDepositId += 1;

          const receiptUSDT = depositReceipts[expectedDepositId];
          expect(padAddressTo32Bytes(receiptUSDT[0])).to.eq(
            padAddressTo32Bytes(depositer.address)
          );
          expect(receiptUSDT[1]).to.eq(expectedDepositId);
          expect(receiptUSDT[3]).to.eq(0);
          expect(padAddressTo32Bytes(receiptUSDT[4])).to.eq(
            padAddressTo32Bytes(usdt_stablecoin.address)
          );
          expect(receiptUSDT[5]).to.eq(
            ethers.BigNumber.from(USDT_STARTING_BALANCE).div(10)
          );
          expectedDepositId += 1;
        }
      });
    });

    describe("tokenURI()", () => {
      it("tokenURI should return the correct path for ticket URIs (with lowercase addresses)", async () => {
        let tickets = [0, 1, 2, 3, 4, 5];
        for (const ticket of tickets) {
          const uriPath = await lootbox.tokenURI(ticket);
          expect(uriPath).to.eq(
            `${BASE_URI}/${lootbox.address.toLowerCase()}/${ticket}.json`
          );
        }
      });
    });

    describe("burn()", () => {
      it("no ability to burn NFT tickets", async () => {
        expect("burn" in lootbox).to.be.false;
      });
    });

    describe("pause()", () => {
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
        await expect(lootbox.connect(malicious).pause()).to.be.revertedWith(
          generatePermissionRevokeMessage(malicious.address, DAO_ROLE)
        );
      });
    });

    describe("unpause()", () => {
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
        await expect(lootbox.connect(malicious).unpause()).to.be.revertedWith(
          generatePermissionRevokeMessage(malicious.address, DAO_ROLE)
        );
      });
    });
  });
});
