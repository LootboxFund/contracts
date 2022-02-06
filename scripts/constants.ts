interface IAddressesByChain {
  /** Created as gnosis multi-sig in Defender */
  gfxTreasury: string;
  /** Created as gnosis multi-sig in Defender */
  gfxDAO: string;
  /** Created as gnosis multi-sig in Defender */
  gfxDeveloper: string;
  /** GuildFX Founder address (should be linked in openzeppelin Defender) */
  Oxnewton: string;
  /** GuildFX Founder address (should be linked in openzeppelin Defender) */
  Oxterran: string;
  /** GuildFX Constants address (from deploy script "./scripts/deployGuildFactory.dev.ts") */
  gfxConstants: string;
  /** GuildFX Guild Factory address (from deploy script "./scripts/deployGuildFactory.dev.ts") */
  gfxGuildFactory: string;
  /** GuildFX Crowdsale Factory address (from deploy script "./scripts/deployCrowdsale.dev.ts") */
  gfxCrowdSaleFactory: string;
  /** Multisig address for the super admin (treasury + dao + developer in one) from Defender */
  artemisSuperAdmin: string;
}

interface IAddresses {
  [key: string]: IAddressesByChain;
}

interface IStableCoinAddressesByChain {
  BNB: {
    priceFeed: string;
  };
  ETH: {
    priceFeed: string;
  };
  DAI: {
    priceFeed: string;
  };
  USDC: {
    priceFeed: string;
  };
  USDT: {
    priceFeed: string;
  };
  UST: {
    priceFeed: string;
  };
}

interface IStableCoins {
  [key: string]: IStableCoinAddressesByChain;
}

// TODO: Probably put this in @guildfx/helpers
export const addresses: IAddresses = {
  // BSC MAINNET
  // 56: {},
  // BSC TESTNET 0x61 = 97
  "61": {
    // --- Multisigs ---
    gfxTreasury: "0xA5bF075f453464f3EC8B64Ea50076f70bbB0d994",
    gfxDAO: "0x6897CD98857dBf3E3d54aaB250a85B5aBBAE7b9D",
    gfxDeveloper: "0xA471dfd91666EA3EC4a0975f6c30AA1C79c6791D",

    // --- Contract addresses (from deploy scripts) ---
    gfxConstants: "0x53274a4F89734B020A1DB9D47Ad95AA8735a8072", // from running npm "npm run deploy:testnet:guild-factory"
    gfxGuildFactory: "0x670D6E8Ecf9a8AF062a8Ebd23E71a834031118Bd", // from running "npm run deploy:testnet:guild-factory"
    // [🚨🚨🚨 NOTE 🚨🚨🚨] $gfxCrowdSaleFactory needs to get updated when gfxGuildFactory changes!
    gfxCrowdSaleFactory: "0x90c662c401C7dB81c09BD78429DB5220297f8219", // from running "npm run deploy:testnet:crowdsale-factory"

    // --- GuildFX admins
    Oxnewton: "0x2C83b49EdB3f00A38331028e2D8bFA3Cd93B8288",
    Oxterran: "0x26dE296ff2DF4eA26aB688B8680531D2B1Bb461F",

    // --- Artemis Super Admin multisig ---
    artemisSuperAdmin: "0x8d380584A7B11231A7AA6F03CE3141C9F07688e4",
  },
};

// Chainlink addresses from https://docs.chain.link/docs/binance-smart-chain-addresses
export const STABLECOINS: IStableCoins = {
  // BSC MAINNET
  // 56: {},
  // BSC TESTNET 0x61 = 97
  "61": {
    BNB: {
      priceFeed: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526",
    },
    ETH: {
      priceFeed: "0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7",
    },
    DAI: {
      priceFeed: "0xE4eE17114774713d2De0eC0f035d4F7665fc025D",
    },
    USDC: {
      priceFeed: "0x90c069C4538adAc136E051052E14c1cD799C41B7",
    },
    USDT: {
      priceFeed: "0xEca2605f0BCF2BA5966372C99837b1F182d3D620",
    },
    UST: {
      priceFeed: "0xEca2605f0BCF2BA5966372C99837b1F182d3D620", // Note: chainlink does not have UST on testnet, using USDT for now
    },
  },
};
