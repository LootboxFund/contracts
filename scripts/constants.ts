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
  crimson: string;
  /** GuildFX staff address */
  cana: string;
  /** GuildFX staff address */
  mklion: string;
  /** GuildFX Constants address (from deploy script "./scripts/deployGuildFactory.dev.ts") */
  gfxConstants: string;
  /** GuildFX Guild Factory address (from deploy script "./scripts/deployGuildFactory.dev.ts") */
  gfxGuildFactory: string;
  /** GuildFX Crowdsale Factory address (from deploy script "./scripts/deployCrowdsale.dev.ts") */
  gfxCrowdSaleFactory: string;
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
  USDC: {
    priceFeed: string;
  };
  USDT: {
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
    gfxTreasury: "0xA5bF075f453464f3EC8B64Ea50076f70bbB0d994",
    gfxDAO: "0x6897CD98857dBf3E3d54aaB250a85B5aBBAE7b9D",
    gfxDeveloper: "0xA471dfd91666EA3EC4a0975f6c30AA1C79c6791D",

    // --- Contract addresses (from deploy scripts) 🚨 must be updated when deploy scripts are run! ---
    gfxConstants: "0x5523D8c92CE44f11b66607899415381eeBef1324", // from running npm "npm run deploy:testnet:guild-factory"
    gfxGuildFactory: "0x3A416836Ea500fe18838Bd67BAF15A8606b25ACc", // from running "npm run deploy:testnet:guild-factory"
    gfxCrowdSaleFactory: "0x5cCA43369cFd4743F45d1c7379Df0fd53563bCEA", // from running "npm run deploy:testnet:crowdsale-factory"

    // --- GuildFX admins
    Oxnewton: "0x2C83b49EdB3f00A38331028e2D8bFA3Cd93B8288",
    Oxterran: "0x26dE296ff2DF4eA26aB688B8680531D2B1Bb461F",
    crimson: "0xd58aa0057934eD345C07d14Db6EC48428c62b388",
    cana: "0x1e069c19Fd6f436e1754097bDE43CD594FC5711f",
    mklion: "_________________________________________",
  },
  // RINKEBY
  "0x4": {
    // --- Multisigs ---
    gfxTreasury: "0x316DC88C61147824E6BFe535dE55C7D4a3Ef09C0",
    gfxDAO: "0xc67818C9fB15cA831177a2c8176Bc6a7483bB74E",
    gfxDeveloper: "0x3d7237b3836Abb20353d68452Abf139e6F256C4C",

    // --- Contract addresses (from deploy scripts) 🚨 must be updated when deploy scripts are run! ---
    gfxConstants: "0xd8862aDFEBc1f2f17e7612AbeE13583Ae96394Fe", // from running npm "npm run deploy:testnet:guild-factory"
    gfxGuildFactory: "0x828195351362F5781d08Ec15Ad1122aFf298F7bb", // from running "npm run deploy:testnet:guild-factory"
    gfxCrowdSaleFactory: "0xafdAAFc812fC1145cE04f800400ebbcaD4283257", // from running "npm run deploy:testnet:crowdsale-factory"

    // --- GuildFX admins
    Oxnewton: "0x2C83b49EdB3f00A38331028e2D8bFA3Cd93B8288",
    Oxterran: "0x26dE296ff2DF4eA26aB688B8680531D2B1Bb461F",
    crimson: "0xd58aa0057934eD345C07d14Db6EC48428c62b388",
    cana: "0x1e069c19Fd6f436e1754097bDE43CD594FC5711f",
    mklion: "_________________________________________",
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
    USDC: {
      priceFeed: "0x90c069C4538adAc136E051052E14c1cD799C41B7",
    },
    USDT: {
      priceFeed: "0xEca2605f0BCF2BA5966372C99837b1F182d3D620",
    },
  },
  // Rinkeby
  "0x4": {
    BNB: {
      priceFeed: "0xcf0f51ca2cDAecb464eeE4227f5295F2384F84ED",
    },
    ETH: {
      priceFeed: "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
    },
    USDC: {
      priceFeed: "0xa24de01df22b63d23Ebc1882a5E3d4ec0d907bFB",
    },
    USDT: {
      priceFeed: "0xa24de01df22b63d23Ebc1882a5E3d4ec0d907bFB", // Chainlink does not have a USDT pricefeed on rinkeby. Re-using USDC pricefeed.
    },
  },
};
