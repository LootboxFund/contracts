import { expect } from "chai";
import { ethers, waffle, upgrades, network } from "hardhat";
import {
  WHITELISTER_ROLE,
  signWhitelist,
  DAO_ROLE,
  generateNonce,
} from "./helpers/test-helpers";
import { manifest } from "../scripts/manifest";
import { LootboxEscrow, PartyBasket, PartyBasket__factory } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe.only("📦 PartyBasket smart contract", () => {
  let PartyBasket: PartyBasket__factory;
  let partyBasket: PartyBasket;

  let deployer: SignerWithAddress;
  let whitelistKey: SignerWithAddress;
  let maliciousKey: SignerWithAddress;
  let mintingKey: SignerWithAddress;
  let admin: SignerWithAddress;

  beforeEach(async () => {
    PartyBasket = await ethers.getContractFactory("PartyBasket");
    const accounts = await ethers.getSigners();

    mintingKey = accounts[0];
    whitelistKey = accounts[1];
    maliciousKey = accounts[2];
    deployer = accounts[3];
    admin = accounts[4];
  });

  it("reverts when name is empty string", async () => {
    await expect(
      PartyBasket.deploy(
        "",
        maliciousKey.address,
        admin.address,
        whitelistKey.address
      )
    ).to.be.revertedWith("Name cannot be empty");
  });

  it("reverts when lootbox is zero address", async () => {
    await expect(
      PartyBasket.deploy(
        "PartyBasket",
        ethers.constants.AddressZero,
        admin.address,
        whitelistKey.address
      )
    ).to.be.revertedWith("Lootbox address cannot be the zero address");
  });

  it("reverts when admin is zero address", async () => {
    await expect(
      PartyBasket.deploy(
        "PartyBasket",
        maliciousKey.address,
        ethers.constants.AddressZero,
        whitelistKey.address
      )
    ).to.be.revertedWith("Admin address cannot be the zero address");
  });

  it("reverts when whitelistKey is zero address", async () => {
    await expect(
      PartyBasket.deploy(
        "PartyBasket",
        "0xf1d92ef22db63bd8590eed61362ee851eec2dbdc",
        admin.address,
        ethers.constants.AddressZero
      )
    ).to.be.revertedWith("Whitelister cannot be the zero address");
  });

  describe("After construction", () => {
    let lootbox: LootboxEscrow;

    beforeEach(async () => {
      const lootboxFactory = await ethers.getContractFactory("LootboxEscrow");

      lootbox = (await upgrades.deployProxy(
        lootboxFactory,
        [
          "NAME",
          "SYMBOL",
          "baseURI",
          ethers.BigNumber.from("100000"),
          ethers.utils.parseUnits("5000000", "18"), // 50k shares, 18 decimals
          deployer.address,
          deployer.address,
          "2000000",
          deployer.address,
          deployer.address,
        ],
        { kind: "uups" }
      )) as LootboxEscrow;

      partyBasket = await PartyBasket.deploy(
        "PartyBasket",
        lootbox.address,
        admin.address,
        whitelistKey.address
      );

      // bulk mint a lootbox for the partyBasket
      await lootbox.bulkMintNFTs(partyBasket.address, "10", {
        value: "100000000000000000",
      });
    });

    it("has correct name", async () => {
      const name = await partyBasket.name();
      expect(name).to.equal("PartyBasket");
    });

    it("has correct lootbox address", async () => {
      const lootboxAddress = await partyBasket.lootboxAddress();
      expect(lootboxAddress).to.equal(lootbox.address);
    });

    it("grants the whitelistKey the WHITELISTER role", async () => {
      const isWhitelister = await partyBasket.hasRole(
        WHITELISTER_ROLE,
        whitelistKey.address
      );
      expect(isWhitelister).to.equal(true);
    });

    it("grants the admin the DAO_ROLE role", async () => {
      const isAdmin = await partyBasket.hasRole(DAO_ROLE, admin.address);
      expect(isAdmin).to.equal(true);
    });

    it("has the correct DOMAIN_SEPARATOR", async () => {
      const expectedDomainSeparator = await partyBasket.DOMAIN_SEPARATOR();

      const domainSeparator = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "bytes32", "uint256", "address"],
          [
            ethers.utils.keccak256(
              ethers.utils.toUtf8Bytes(
                "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
              )
            ),
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PartyBasket")),
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("1")),
            network.config.chainId,
            partyBasket.address,
          ]
        )
      );

      expect(domainSeparator).to.equal(expectedDomainSeparator);
    });

    it("has the expected semver", async () => {
      expect(await partyBasket.semver()).to.eq(manifest.semver.id);
    });

    describe("redeemBounty()", () => {
      it("reverts when called with invalid calldata", async () => {
        await expect(
          partyBasket.connect(maliciousKey).redeemBounty("saldkmals", 0)
        ).to.be.reverted; // 'Error: invalid arrayify value (argument="value", value="saldkmals", code=INVALID_ARGUMENT, version=bytes/5.6.0)'

        await expect(
          partyBasket
            .connect(maliciousKey)
            .redeemBounty(ethers.constants.AddressZero, 0)
        ).to.be.revertedWith("ECDSA: invalid signature length");
      });

      it("reverts when the signer does not have the minter role", async () => {
        const signature = await signWhitelist(
          network.config.chainId || 0,
          partyBasket.address,
          maliciousKey,
          mintingKey.address,
          generateNonce()
        );

        await expect(
          partyBasket.connect(maliciousKey).redeemBounty(signature, 0)
        ).to.be.revertedWith("Invalid Signature");
      });

      it("reverts when called with a valid signature, but different mintingKey address", async () => {
        const signature = await signWhitelist(
          network.config.chainId || 0,
          partyBasket.address,
          whitelistKey,
          mintingKey.address,
          generateNonce()
        );

        await expect(
          partyBasket.connect(maliciousKey).redeemBounty(signature, 0)
        ).to.be.revertedWith("Invalid Signature");
      });

      it("reverts when called with a valid whitelistKey & mintingKey, but different nonce", async () => {
        const signature = await signWhitelist(
          network.config.chainId || 0,
          partyBasket.address,
          whitelistKey,
          mintingKey.address,
          generateNonce()
        );

        await expect(
          partyBasket.connect(maliciousKey).redeemBounty(signature, 1)
        ).to.be.revertedWith("Invalid Signature");
      });

      it("reverts when called with the same signature multiple times", async () => {
        const nonce = generateNonce();
        const signature = await signWhitelist(
          network.config.chainId || 0,
          partyBasket.address,
          whitelistKey,
          maliciousKey.address,
          nonce
        );

        await expect(
          partyBasket.connect(maliciousKey).redeemBounty(signature, nonce)
        ).to.not.be.reverted;

        await expect(
          partyBasket.connect(maliciousKey).redeemBounty(signature, nonce)
        ).to.be.revertedWith("signature used");
      });

      it("reverts when called with no NFTs in the basket", async () => {
        const nonce = generateNonce();

        const partyBasket2 = await PartyBasket.deploy(
          "PartyBasket",
          lootbox.address,
          admin.address,
          whitelistKey.address
        );

        const signature = await signWhitelist(
          network.config.chainId || 0,
          partyBasket2.address,
          whitelistKey,
          mintingKey.address,
          nonce
        );

        await expect(
          partyBasket2.connect(mintingKey).redeemBounty(signature, nonce)
        ).to.be.revertedWith("No NFTs available");
      });

      it("reverts with Pauseable error when paused", async () => {
        const nonce = generateNonce();
        const signature = await signWhitelist(
          network.config.chainId || 0,
          partyBasket.address,
          whitelistKey,
          mintingKey.address,
          nonce
        );
        await partyBasket.connect(admin).pause();
        await expect(
          partyBasket.connect(mintingKey).redeemBounty(signature, nonce)
        ).to.be.revertedWith("Pausable: paused");
      });

      it("does not revert when called with appropriate signer", async () => {
        const nonce = generateNonce();
        const signature = await signWhitelist(
          network.config.chainId || 0,
          partyBasket.address,
          whitelistKey,
          mintingKey.address,
          nonce
        );

        await expect(
          partyBasket.connect(mintingKey).redeemBounty(signature, nonce)
        ).to.not.be.reverted;
      });

      it("sends the bounty to minter", async () => {
        const nonce = generateNonce();
        const signature = await signWhitelist(
          network.config.chainId || 0,
          partyBasket.address,
          whitelistKey,
          mintingKey.address,
          nonce
        );

        const beforeTickets = await partyBasket.viewNFTs();

        await partyBasket.connect(mintingKey).redeemBounty(signature, nonce);

        const afterTickets = await partyBasket.viewNFTs();

        expect(afterTickets.length).to.eq(beforeTickets.length - 1);
        expect(await lootbox.ownerOf(beforeTickets[0])).to.eq(
          mintingKey.address
        );
      });

      it("emits a BountyRedeemed event", async () => {
        const nonce = generateNonce();
        const signature = await signWhitelist(
          network.config.chainId || 0,
          partyBasket.address,
          whitelistKey,
          mintingKey.address,
          nonce
        );

        const tickets = await partyBasket.viewNFTs();

        await expect(
          await partyBasket.connect(mintingKey).redeemBounty(signature, nonce)
        )
          .to.emit(partyBasket, "BountyRedeemed")
          .withArgs(
            partyBasket.address,
            mintingKey.address,
            lootbox.address,
            tickets[0]
          );
      });
    });
  });
});
