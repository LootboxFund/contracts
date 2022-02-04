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
  /** GuildFX staff address */
  guia: string;
  /** GuildFX staff address */
  cana: string;
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
  "0x61": {
    // --- Multisigs ---
    gfxTreasury: "0xe61e3516e98667A1c79F067DDeDB9005D911CF65",
    gfxDAO: "0xebf0bBcfC341f22F587D579cE631935267DA7294",
    gfxDeveloper: "0x767B123Bd05697d8Dda135D1D0092a94ac5a7510",

    // --- Contract addresses (from deploy scripts) ---
    gfxConstants: "0x5523D8c92CE44f11b66607899415381eeBef1324", // from running npm "npm run deploy:testnet:guild-factory"
    gfxGuildFactory: "0x3A416836Ea500fe18838Bd67BAF15A8606b25ACc", // from running "npm run deploy:testnet:guild-factory"
    // [🚨🚨🚨 NOTE 🚨🚨🚨] $gfxCrowdSaleFactory needs to get updated when gfxGuildFactory changes!
    gfxCrowdSaleFactory: "0x5cCA43369cFd4743F45d1c7379Df0fd53563bCEA", // from running "npm run deploy:testnet:crowdsale-factory"

    // --- GuildFX admins
    Oxnewton: "0x2C83b49EdB3f00A38331028e2D8bFA3Cd93B8288",
    Oxterran: "0x26dE296ff2DF4eA26aB688B8680531D2B1Bb461F",
    guia: "0xd58aa0057934eD345C07d14Db6EC48428c62b388",
    cana: "0x1e069c19Fd6f436e1754097bDE43CD594FC5711f",

    // --- Artemis Super Admin multisig ---
    artemisSuperAdmin: "0x8d380584A7B11231A7AA6F03CE3141C9F07688e4",
  },
};

// Chainlink addresses from https://docs.chain.link/docs/binance-smart-chain-addresses
export const STABLECOINS: IStableCoins = {
  // BSC MAINNET
  // 56: {},
  // BSC TESTNET 0x61 = 97
  "0x61": {
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
