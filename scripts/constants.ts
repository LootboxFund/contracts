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
    gfxTreasury: "0xFec4243C1934907CF41298F868FdcCDfca9D7484",
    gfxDAO: "0x6A721843BAf298D49C709D0d77D23aDDE650AE44",
    gfxDeveloper: "0x6A721843BAf298D49C709D0d77D23aDDE650AE44",
    Oxnewton: "0x2C83b49EdB3f00A38331028e2D8bFA3Cd93B8288",
    Oxterran: "0x26dE296ff2DF4eA26aB688B8680531D2B1Bb461F",
    gfxConstants: "0x64F79B84CaA7e8f5763e578F4EA67385C68Fc74b",
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
