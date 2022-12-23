import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { randomUUID } from "crypto";
import { ContractTransaction, ethers as _ethers } from "ethers";
import { ethers } from "hardhat";
import { random } from "lodash";
import {
  LootboxCosmic,
  LootboxCosmicFactory,
  LootboxCosmicFactory__factory,
} from "../typechain";
import {
  DAO_ROLE,
  generatePermissionRevokeMessage,
  stripZeros,
} from "./helpers/test-helpers";

const LOOTBOX_NAME = "Pinata Lootbox";
const LOOTBOX_SYMBOL = "PINATA";
const LOOTBOX_ID = "jlshdbflsdjbfldjhfbvjhdfbvjkhrsdkj2131212313n";
const BASE_URI = `https://storage.googleapis.com/lootbox-data-staging`;
const EXPECTED_BASE_URI = `${BASE_URI}/${LOOTBOX_ID}`;

// needed to prevent "too many requests" error
const timeout = async (ms: number = 1000) => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res(undefined);
    }, ms);
  });
};

describe("📦 LootboxCosmicFactory smart contract", () => {
  let LootboxCosmicFactory: LootboxCosmicFactory__factory;

  let deployer: SignerWithAddress;
  let whitelistKey: SignerWithAddress;
  let maliciousKey: SignerWithAddress;
  let lootboxDeployer: SignerWithAddress;
  let lootboxDAO: SignerWithAddress;
  let user: SignerWithAddress;
  let minter: SignerWithAddress;

  beforeEach(async () => {
    LootboxCosmicFactory = await ethers.getContractFactory(
      "LootboxCosmicFactory"
    );
    const accounts = await ethers.getSigners();

    deployer = accounts[0];
    whitelistKey = accounts[1];
    maliciousKey = accounts[2];
    lootboxDeployer = accounts[3];
    minter = accounts[4];
    lootboxDAO = accounts[5];
    user = accounts[6];
  });

  it("reverts if lootbox dao is zero address", async () => {
    await expect(
      LootboxCosmicFactory.deploy(
        ethers.constants.AddressZero,
        whitelistKey.address,
        BASE_URI
      )
    ).to.be.revertedWith("E1");
  });

  it("reverts if whitelister is zero address", async () => {
    await expect(
      LootboxCosmicFactory.deploy(
        lootboxDAO.address,
        ethers.constants.AddressZero,
        BASE_URI
      )
    ).to.be.revertedWith("E2");
  });

  it("reverts if base uri is empty", async () => {
    await expect(
      LootboxCosmicFactory.deploy(lootboxDAO.address, whitelistKey.address, "")
    ).to.be.revertedWith("E3");
  });

  it("grants the dao the DAO_ROLE", async () => {
    const factory = await LootboxCosmicFactory.deploy(
      lootboxDAO.address,
      whitelistKey.address,
      BASE_URI
    );

    expect(await factory.hasRole(DAO_ROLE, lootboxDAO.address)).to.be.true;
    expect(await factory.hasRole(DAO_ROLE, deployer.address)).to.be.false;
    expect(await factory.hasRole(DAO_ROLE, user.address)).to.be.false;
  });

  it("has the values stored semver", async () => {
    const factory = await LootboxCosmicFactory.deploy(
      lootboxDAO.address,
      whitelistKey.address,
      BASE_URI
    );

    expect(await factory.semver()).to.eq("0.7.2-demo");
  });

  it("persists the base URI", async () => {
    const factory = await LootboxCosmicFactory.deploy(
      lootboxDAO.address,
      whitelistKey.address,
      BASE_URI
    );

    expect(await factory.baseTokenURI()).to.eq(BASE_URI);
  });

  it("has zero lootboxes addresses", async () => {
    const factory = await LootboxCosmicFactory.deploy(
      lootboxDAO.address,
      whitelistKey.address,
      BASE_URI
    );
    const lootboxAddresses = await factory.viewLootboxes();
    expect(lootboxAddresses?.length).to.eq(0);
  });

  describe("createLootbox()", () => {
    let lootbox: LootboxCosmic;
    let factory: LootboxCosmicFactory;
    let maxTickets: number;
    let createLootboxTx: ContractTransaction;
    let nonce: string;

    beforeEach(async () => {
      maxTickets = random(10, 1000);

      factory = await LootboxCosmicFactory.deploy(
        lootboxDAO.address,
        whitelistKey.address,
        BASE_URI
      );

      nonce = randomUUID();

      createLootboxTx = await factory
        .connect(lootboxDeployer)
        .createLootbox(
          LOOTBOX_NAME,
          LOOTBOX_SYMBOL,
          maxTickets,
          LOOTBOX_ID,
          nonce
        );
      await createLootboxTx.wait();

      const addresses = await factory.viewLootboxes();
      const lootboxAddr = ethers.utils.getAddress(stripZeros(addresses[0]));

      lootbox = await ethers.getContractAt("LootboxCosmic", lootboxAddr);
    });

    it("reverts when contract is paused", async () => {
      await factory.connect(lootboxDAO).pause();
      await expect(
        factory
          .connect(lootboxDeployer)
          .createLootbox(
            LOOTBOX_NAME,
            LOOTBOX_SYMBOL,
            maxTickets,
            LOOTBOX_ID,
            nonce
          )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("tracks the lootbox address in memory", async () => {
      const addrs = await factory.viewLootboxes();
      expect(addrs.map(stripZeros).indexOf(lootbox.address));
    });

    it("sets the lootbox max tickets", async () => {
      expect(await lootbox.maxTickets()).to.eq(maxTickets);
    });

    it("sets the lootbox name", async () => {
      expect(await lootbox.name()).to.eq(LOOTBOX_NAME);
    });

    it("sets the lootbox symbol", async () => {
      expect(await lootbox.symbol()).to.eq(LOOTBOX_SYMBOL);
    });

    it("sets the base uri", async () => {
      expect(await lootbox._tokenURI()).to.eq(EXPECTED_BASE_URI);
    });

    it("the lootbox grants the issuer the DAO role", async () => {
      expect(await lootbox.hasRole(DAO_ROLE, lootboxDeployer.address)).to.be
        .true;
    });

    it("emits the lootbox created event", async () => {
      await expect(createLootboxTx)
        .to.emit(factory, "LootboxCreated")
        .withArgs(
          LOOTBOX_NAME,
          lootbox.address,
          lootboxDeployer.address,
          maxTickets,
          EXPECTED_BASE_URI,
          LOOTBOX_ID,
          nonce
        );
    });
  });

  describe("pause()", () => {
    let factory: LootboxCosmicFactory;

    beforeEach(async () => {
      factory = await LootboxCosmicFactory.deploy(
        lootboxDAO.address,
        whitelistKey.address,
        BASE_URI
      );
    });

    describe("called by address with the DAO_ROLE", () => {
      let promise: Promise<any>;

      beforeEach(async () => {
        promise = factory.connect(lootboxDAO).pause();
      });

      it("pauses the contract", async () => {
        await promise;
        expect(await factory.paused()).to.be.equal(true);
      });

      it("emits a paused event", async () => {
        await expect(promise).to.emit(factory, "Paused");
      });
    });

    it("reverts with access control error when called with address without DAO_ROLE", async () => {
      await expect(factory.connect(maliciousKey).pause()).to.be.revertedWith(
        generatePermissionRevokeMessage(maliciousKey.address, DAO_ROLE)
      );
    });
  });

  describe("unpause()", () => {
    let factory: LootboxCosmicFactory;

    beforeEach(async () => {
      factory = await LootboxCosmicFactory.deploy(
        lootboxDAO.address,
        whitelistKey.address,
        BASE_URI
      );
    });

    describe("called by address with the DAO_ROLE", async () => {
      let promise: Promise<any>;

      beforeEach(async () => {
        await factory.connect(lootboxDAO).pause();
        promise = factory.connect(lootboxDAO).unpause();
      });

      it("unpauses the contract", async () => {
        await promise;
        expect(await factory.paused()).to.be.equal(false);
      });

      it("emits an unpaused event", async () => {
        await expect(promise).to.emit(factory, "Unpaused");
      });
    });

    it("reverts with access control error when called with address without DAO_ROLE", async () => {
      await expect(factory.connect(maliciousKey).unpause()).to.be.revertedWith(
        generatePermissionRevokeMessage(maliciousKey.address, DAO_ROLE)
      );
    });
  });
});
