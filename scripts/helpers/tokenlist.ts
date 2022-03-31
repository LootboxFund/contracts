import { Storage } from "@google-cloud/storage";
import { ChainIDHex, TokenData, Address } from "@wormgraph/helpers";
import { SemanticVersion } from "@wormgraph/manifest";

export type TokenFragment = {
  symbol: string;
  address: Address;
};

export const encodeURISafe = (stringFragment: string) =>
  encodeURIComponent(stringFragment).replace(/'/g, "%27").replace(/"/g, "%22");

export const tokenMolds: Omit<
  TokenData,
  "address" | "chainIdHex" | "chainIdDecimal"
>[] = [
  {
    decimals: 18,
    logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png",
    name: "Binance Smart Chain",
    symbol: "tBNB",
    priceOracle: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526" as Address,
  },
  {
    decimals: 18,
    logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
    name: "Wrapped Ethereum",
    symbol: "ETH",
    priceOracle: "0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7" as Address,
  },
  {
    decimals: 18,
    logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
    name: "USD Circle",
    symbol: "USDC",
    priceOracle: "0x90c069C4538adAc136E051052E14c1cD799C41B7" as Address,
  },
  {
    decimals: 18,
    logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png",
    name: "Tether",
    symbol: "USDT",
    priceOracle: "0xEca2605f0BCF2BA5966372C99837b1F182d3D620" as Address,
  },
];

export interface TokenDataWithCDN extends TokenData {
  cdnFilePath: string;
}
export type TokenFragsWithCDN = {
  tokenFrag: TokenFragment;
  chainIdHex: ChainIDHex;
  semver: SemanticVersion;
  loggerPath: string;
};
