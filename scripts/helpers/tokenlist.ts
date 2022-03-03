import { logToFile } from "./logger";
import { Storage } from "@google-cloud/storage";
import {
  ChainIDHex,
  buildTokenCDNRoute,
  TokenData,
  buildTokenIndexCDNRoutes,
  Address,
} from "@lootboxfund/helpers";
import { manifest } from "../manifest";
import { SemanticVersion } from "@lootboxfund/manifest";

const BUCKET_NAME = manifest.googleCloud.bucket.id;

const storage = new Storage();

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

export const uploadTokenDataToCDN = async ({
  tokenFrag,
  chainIdHex,
  semver,
  loggerPath,
}: TokenFragsWithCDN) => {
  const filePath = buildTokenCDNRoute({
    chainIdHex: chainIdHex,
    semver,
    address: tokenFrag.address,
  });
  logToFile(
    `Uploading ${
      tokenFrag.symbol
    } to Cloud Storage Bucket as https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURISafe(
      filePath
    )}?alt=media \n`,
    loggerPath
  );
  const tokenMold = tokenMolds.find(
    (tokenMold) => tokenMold.symbol === tokenFrag.symbol
  );
  if (!tokenMold) {
    throw new Error(`Could not find a stablecoin mold for ${tokenFrag.symbol}`);
  }
  const tokenData: TokenDataWithCDN = {
    address: tokenFrag.address,
    chainIdHex: chainIdHex,
    chainIdDecimal: parseInt(chainIdHex, 16).toString(),
    decimals: tokenMold.decimals,
    logoURI: tokenMold.logoURI,
    name: tokenMold.name,
    priceOracle: tokenMold.priceOracle,
    symbol: tokenMold.symbol,
    cdnFilePath: filePath,
  };
  await storage
    .bucket(BUCKET_NAME)
    .file(tokenData.cdnFilePath)
    .save(
      JSON.stringify({
        ...tokenData,
        cdnFilePath: undefined,
      })
    );
  await storage.bucket(BUCKET_NAME).file(tokenData.cdnFilePath).makePublic();
};

export const uploadTokenIndexToCDN = async ({
  semver,
  chainIdHex,
  addresses,
  loggerPath,
}: {
  semver: SemanticVersion;
  chainIdHex: ChainIDHex;
  addresses: Address[];
  loggerPath: string;
}) => {
  const filePath = buildTokenIndexCDNRoutes({
    semver,
    chainIdHex,
  });
  await storage
    .bucket(BUCKET_NAME)
    .file(filePath)
    .save(JSON.stringify(addresses));
  await storage.bucket(BUCKET_NAME).file(filePath).makePublic();
  logToFile(
    `Uploading index to Cloud Storage Bucket as https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURISafe(
      filePath
    )}?alt=media \n`,
    loggerPath
  );
};
