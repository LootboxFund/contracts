import { expect } from "chai";
import { ethers, network, waffle } from "hardhat";
import {
  BULKMINTER_ROLE,
  DAO_ROLE,
  generateNonce,
  generatePermissionRevokeMessage,
  padAddressTo32Bytes,
  signWhitelist,
  stripZeros,
  WHITELISTER_ROLE,
} from "./helpers/test-helpers";
import { manifest } from "../scripts/manifest";

/* eslint-disable */
import {
  BNB,
  BNB__factory,
  USDC,
  USDC__factory,
  USDT,
  USDT__factory,
  LootboxCosmic,
  LootboxCosmic__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, constants } from "ethers";
import { SUPERSTAFF_ROLE } from "./helpers/test-helpers";
import { min, random } from "lodash";

// const BNB_ARCHIVED_PRICE = "41771363251"; // $417.36614642 USD per BNB

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

describe.only("📦 LootboxCosmic smart contract", async function () {
  let Lootbox: LootboxCosmic__factory;
  let lootbox: LootboxCosmic;
  let deployer: SignerWithAddress;
  let whitelister: SignerWithAddress;
  let issuingEntity: SignerWithAddress;
  let superstaff: SignerWithAddress;
  let malicious: SignerWithAddress;
  let minter: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let user: SignerWithAddress;
  let USDC_STARTING_BALANCE: BigNumber;
  let USDT_STARTING_BALANCE: BigNumber;
  let LOOTBOX_MAX_TICKETS: number;

  before(async () => {
    [
      deployer,
      minter,
      issuingEntity,
      superstaff,
      whitelister,
      malicious,
      purchaser,
      user,
    ] = await ethers.getSigners();
  });
  beforeEach(() => {
    LOOTBOX_MAX_TICKETS = random(10, 1000);
    USDC_STARTING_BALANCE = ethers.BigNumber.from(random(1, 100)).mul(
      "1000000000000000000000"
    );
    USDT_STARTING_BALANCE = ethers.BigNumber.from(random(1, 100)).mul(
      "1000000000000000000000"
    );
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
          superstaff.address,
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
          superstaff.address,
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
          superstaff.address,
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
          superstaff.address,
          whitelister.address
        )
      ).to.be.revertedWith("invalid issuer");
    });

    it("reverts if superstaff is zero", async () => {
      await expect(
        Lootbox.deploy(
          "name",
          "symbol",
          BASE_URI,
          10,
          issuingEntity.address,
          constants.AddressZero,
          whitelister.address
        )
      ).to.be.revertedWith("invalid superstaff");
    });

    it("reverts if whitelister is zero", async () => {
      await expect(
        Lootbox.deploy(
          "name",
          "symbol",
          BASE_URI,
          10,
          issuingEntity.address,
          superstaff.address,
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
          superstaff.address,
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
          superstaff.address,
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
        LOOTBOX_MAX_TICKETS,
        issuingEntity.address,
        superstaff.address,
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

    it("has Cosmic variant", async () => {
      expect(await lootbox.VARIANT()).to.eq("Cosmic");
    });

    it("starts the ticket counter at 0", async () => {
      expect(await lootbox.ticketIdCounter()).to.eq(0);
    });

    it("starts the deposit counter at 0", async () => {
      expect(await lootbox.depositIdCounter()).to.eq(0);
    });

    it("has flushed equal to false", async () => {
      expect(await lootbox.flushed()).to.be.false;
    });

    it("has isPayingOut equal to false", async () => {
      expect(await lootbox.isPayingOut()).to.be.false;
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
      expect(await lootbox.maxTickets()).to.eq(LOOTBOX_MAX_TICKETS);
    });

    it("grants the issuer the DAO role", async () => {
      expect(await lootbox.hasRole(DAO_ROLE, issuingEntity.address)).to.be.true;
    });

    it("grants the superstaff the SUPERSTAFF role", async () => {
      expect(await lootbox.hasRole(SUPERSTAFF_ROLE, superstaff.address)).to.be
        .true;
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
      const redeemerTicketIds: { [key: string]: number[] } = {};

      beforeEach(async () => {
        redeemers = [user, minter];
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

    // TODO: need more comprehensive tests
    // 5)... overall, what should happen if maxTickets changes?
    // 6) flushing tests
    // 7) still need to build out nft randomization

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
            .withArgs(minter.address, lootbox.address, beforeTicketIdx);
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

        it("rejects if the maxTickets has been hit", async () => {
          // lets just set up a new test so we dont have to mint too many
          const ticketsToMint = random(1, 6);

          const testLootbox = await Lootbox.deploy(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            BASE_URI,
            ticketsToMint,
            issuingEntity.address,
            superstaff.address,
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

      it("reverts when isPayingOut is true", async () => {
        let depositer = user;
        const depositAmount = ethers.BigNumber.from(USDC_STARTING_BALANCE)
          .mul(random(1, 1000))
          .div(10000);
        const initMaxTickets = await lootbox.maxTickets();
        const isPayingOut = await lootbox.isPayingOut();
        // Should be false to start
        expect(isPayingOut).to.be.false;
        // We need to toggle ispayingout by initializing a withdrawal....
        await lootbox.connect(depositer).depositEarningsNative({
          value: depositAmount,
        });
        // Mint an NFT to minter
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
        await lootbox.connect(minter).withdrawEarnings("0");
        const isPayingOut2 = await lootbox.isPayingOut();
        expect(isPayingOut2).to.be.true;
        await expect(
          lootbox.connect(issuingEntity).changeMaxTickets(initMaxTickets.add(1))
        ).to.be.revertedWith("Lootbox is paying out");
        expect(await lootbox.maxTickets()).to.eq(initMaxTickets);
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
    });

    describe("changing the max tickets (side effects)", () => {
      it("", async () => {
        expect(false).to.be.true;
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
        const ticketCount = ethers.BigNumber.from("1000000000000000000")
          .mul(random(1, 1000))
          .div(1000);
        lootbox = await Lootbox.deploy(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          BASE_URI,
          ticketCount,
          issuingEntity.address,
          superstaff.address,
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
        const ticketCount = ethers.BigNumber.from("1000000000000000000")
          .mul(random(1, 1000))
          .div(1000);
        const testDiffs = ["1", "10", "100000", ticketCount.sub(1).toString()];
        for (let diff of testDiffs) {
          lootbox = await Lootbox.deploy(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            BASE_URI,
            ticketCount,
            issuingEntity.address,
            superstaff.address,
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
          nativeDepositAmount = ethers.BigNumber.from(USDC_STARTING_BALANCE)
            .mul(random(1, 100))
            .div(1000);
          erc20DepositAmount = ethers.BigNumber.from(USDC_STARTING_BALANCE)
            .mul(random(1, 100))
            .div(1000);
          await lootbox.connect(depositer).depositEarningsNative({
            value: nativeDepositAmount,
          });
          await lootbox
            .connect(depositer)
            .depositEarningsErc20(usdc_stablecoin.address, erc20DepositAmount);
        });

        it("changes isPayingOut to true only if isPayingOut is false", async () => {
          expect(await lootbox.isPayingOut()).to.be.false;
          await expect(lootbox.connect(minter).withdrawEarnings(ticketId)).to
            .not.be.reverted;
          expect(await lootbox.isPayingOut()).to.be.true;

          await lootbox
            .connect(depositer)
            .depositEarningsErc20(
              usdc_stablecoin.address,
              ethers.BigNumber.from(USDC_STARTING_BALANCE).div(10)
            );

          expect(await lootbox.isPayingOut()).to.be.true;
          await expect(lootbox.connect(minter).withdrawEarnings(ticketId)).to
            .not.be.reverted;
          expect(await lootbox.isPayingOut()).to.be.true; // stays the same lol
        });

        it("transfers the correct amount of native & or erc20", async () => {
          const expectedNativeYieldPerTicket =
            nativeDepositAmount.div(LOOTBOX_MAX_TICKETS);
          const expectedUsdcYieldPerTicket =
            erc20DepositAmount.div(LOOTBOX_MAX_TICKETS);

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

        it("emits the correct WithdrawEarnings event", async () => {
          const expectedNativeYieldPerTicket =
            nativeDepositAmount.div(LOOTBOX_MAX_TICKETS);
          const expectedUsdcYieldPerTicket =
            erc20DepositAmount.div(LOOTBOX_MAX_TICKETS);

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
      let expectedNativeYieldPerTicket: BigNumber = ethers.BigNumber.from(0);
      let expectedUsdcYieldPerTicket: BigNumber = ethers.BigNumber.from(0);
      let expectedUsdtYieldPerTicket: BigNumber = ethers.BigNumber.from(0);

      beforeEach(async () => {
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
          const nativeDepositAmount = ethers.BigNumber.from(
            USDC_STARTING_BALANCE
          )
            .mul(random(1, 100))
            .div(1000);
          expectedNativeYieldPerTicket = expectedNativeYieldPerTicket.add(
            nativeDepositAmount.div(LOOTBOX_MAX_TICKETS)
          );

          const erc20DepositAmount = ethers.BigNumber.from(
            USDC_STARTING_BALANCE
          )
            .mul(random(1, 100))
            .div(1000);
          expectedUsdcYieldPerTicket = expectedUsdcYieldPerTicket.add(
            erc20DepositAmount.div(LOOTBOX_MAX_TICKETS)
          );

          const usdtDepositAmount = ethers.BigNumber.from(USDC_STARTING_BALANCE)
            .mul(random(1, 100))
            .div(1000);

          expectedUsdtYieldPerTicket = expectedUsdtYieldPerTicket.add(
            usdtDepositAmount.div(LOOTBOX_MAX_TICKETS)
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
      const redeemerTicketIds: { [key: string]: number[] } = {};
      let expectedNativeYieldPerTicket: BigNumber = ethers.BigNumber.from(0);
      let expectedUsdcYieldPerTicket: BigNumber = ethers.BigNumber.from(0);
      let expectedUsdtYieldPerTicket: BigNumber = ethers.BigNumber.from(0);

      beforeEach(async () => {
        LOOTBOX_MAX_TICKETS = LOOTBOX_MAX_TICKETS = random(1, 10); // Change the default so its more sustainable for our tests
        depositers = [issuingEntity, deployer];
        redeemers = [user, minter];

        lootbox = await Lootbox.deploy(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          BASE_URI,
          LOOTBOX_MAX_TICKETS,
          issuingEntity.address,
          superstaff.address,
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

        for (let ticketIdx = 0; ticketIdx < LOOTBOX_MAX_TICKETS; ticketIdx++) {
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
          await timeout(200);
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
          const depositAmount = USDC_STARTING_BALANCE.mul(random(100, 300)).div(
            10000
          );
          const depositCurrency = random(0, 2);

          if (depositCurrency === 0) {
            // native
            await lootbox.connect(depositer).depositEarningsNative({
              value: depositAmount,
            });
            expectedNativeYieldPerTicket = expectedNativeYieldPerTicket.add(
              depositAmount.div(LOOTBOX_MAX_TICKETS)
            );
          } else if (depositCurrency === 1) {
            // usdc
            await lootbox
              .connect(depositer)
              .depositEarningsErc20(usdc_stablecoin.address, depositAmount);
            expectedUsdcYieldPerTicket = expectedUsdcYieldPerTicket.add(
              depositAmount.div(LOOTBOX_MAX_TICKETS)
            );
          } else {
            // usdt
            await lootbox
              .connect(depositer)
              .depositEarningsErc20(usdt_stablecoin.address, depositAmount);
            expectedUsdtYieldPerTicket = expectedUsdtYieldPerTicket.add(
              depositAmount.div(LOOTBOX_MAX_TICKETS)
            );
          }
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

        // expect(lootboxFinalBalanceNative.toNumber()).to.eq(0);
        // expect(lootboxFinalBalanceUSDC.toNumber()).to.eq(0);
        // expect(lootboxFinalBalanceUSDT.toNumber()).to.eq(0);
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

        nativeDepositAmount = USDC_STARTING_BALANCE.mul(random(100, 300)).div(
          10000
        );

        usdcDepositAmount = USDC_STARTING_BALANCE.mul(random(100, 300)).div(
          10000
        );
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

      it("increments depositId", async () => {
        expect(await lootbox.depositIdCounter()).to.eq(0);
        await lootbox.connect(depositer).depositEarningsNative({
          value: nativeDepositAmount,
        });
        expect(await lootbox.depositIdCounter()).to.eq(1);
        await lootbox
          .connect(depositer)
          .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount);
        expect(await lootbox.depositIdCounter()).to.eq(2);
      });

      it("emits correct evets for erc20 & native", async () => {
        let nativePromise = lootbox.connect(depositer).depositEarningsNative({
          value: nativeDepositAmount,
        });

        let erc20Promise = lootbox
          .connect(depositer)
          .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount);

        await expect(nativePromise)
          .to.emit(lootbox, "DepositEarnings")
          .withArgs(
            depositer.address,
            lootbox.address,
            0,
            nativeDepositAmount,
            constants.AddressZero,
            0
          );

        await expect(erc20Promise)
          .to.emit(lootbox, "DepositEarnings")
          .withArgs(
            depositer.address,
            lootbox.address,
            1,
            0,
            usdc_stablecoin.address,
            usdcDepositAmount
          );
      });

      it("tracks the deposit event correctly", async () => {
        await lootbox.connect(depositer).depositEarningsNative({
          value: nativeDepositAmount,
        });

        await lootbox
          .connect(depositer)
          .depositEarningsErc20(usdc_stablecoin.address, usdcDepositAmount);

        const [receiptNative, receiptUSDC] = await lootbox.viewAllDeposits();

        expect(padAddressTo32Bytes(receiptNative[0])).to.eq(
          padAddressTo32Bytes(depositer.address)
        );
        expect(receiptNative[1]).to.eq(0);
        expect(receiptNative[3]).to.eq(nativeDepositAmount);
        expect(padAddressTo32Bytes(receiptNative[4])).to.eq(
          padAddressTo32Bytes(constants.AddressZero)
        );
        expect(receiptNative[5]).to.eq(0);

        expect(padAddressTo32Bytes(receiptUSDC[0])).to.eq(
          padAddressTo32Bytes(depositer.address)
        );
        expect(receiptUSDC[1]).to.eq(1);
        expect(receiptUSDC[3]).to.eq(0);
        expect(padAddressTo32Bytes(receiptUSDC[4])).to.eq(
          padAddressTo32Bytes(usdc_stablecoin.address)
        );
        expect(receiptUSDC[5]).to.eq(usdcDepositAmount);
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
              0
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
              ethers.BigNumber.from(USDC_STARTING_BALANCE).div(10)
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
              ethers.BigNumber.from(USDT_STARTING_BALANCE).div(10)
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
