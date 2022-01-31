import { logToFile } from "./logger";
import { filterMap, removeUndefined } from "@guildfx/helpers";
import { Storage } from "@google-cloud/storage";
import axios from "axios";
import {
  ChainIDHex,
  buildTokenCDNRoute,
  TokenData,
  buildTokenIndexCDNRoutes,
  Address,
  SemanticVersion,
} from "@guildfx/helpers";

const BUCKET_NAME = "guildfx-exchange.appspot.com";

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
    priceOracle: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526",
  },
  {
    decimals: 18,
    logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
    name: "Wrapped Ethereum",
    symbol: "ETH",
    priceOracle: "0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7",
  },
  {
    decimals: 18,
    logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
    name: "USD Circle",
    symbol: "USDC",
    priceOracle: "0x90c069C4538adAc136E051052E14c1cD799C41B7",
  },
  {
    decimals: 18,
    logoURI: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png",
    name: "Tether",
    symbol: "USDT",
    priceOracle: "0xEca2605f0BCF2BA5966372C99837b1F182d3D620",
  },
];

export type TokenFragsWithCDN = {
  tokenFrag: TokenFragment;
  chainIdHex: ChainIDHex;
  semvar: SemanticVersion;
  loggerPath: string;
};

export const uploadTokenDataToCDN = async ({
  tokenFrag,
  chainIdHex,
  semvar,
  loggerPath,
}: TokenFragsWithCDN) => {
  const filePath = buildTokenCDNRoute({
    chainIdHex: chainIdHex,
    semvar,
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
  const tokenData: TokenData = {
    address: tokenFrag.address,
    chainIdHex: chainIdHex,
    chainIdDecimal: parseInt(chainIdHex, 16).toString(),
    decimals: tokenMold.decimals,
    logoURI: tokenMold.logoURI,
    name: tokenMold.name,
    priceOracle: tokenMold.priceOracle,
    symbol: tokenMold.symbol,
  };
  await axios.post("https://89f633ef6cb67740697f3c0885695a46.m.pipedream.net", {
    semvar: "0.0.1-sandbox",
    chainIdHex: "0x61",
    prefix: "tokens",
    data: tokenData,
  });
  // await storage
  //   .bucket(BUCKET_NAME)
  //   .file(tokenData.cdnFilePath)
  //   .save(
  //     JSON.stringify(
  //       removeUndefined({
  //         ...tokenData,
  //         cdnFilePath: undefined,
  //       })
  //     )
  //   );
  // await storage.bucket(BUCKET_NAME).file(tokenData.cdnFilePath).makePublic();
};

export const uploadTokenIndexToCDN = async ({
  semvar,
  chainIdHex,
  addresses,
  loggerPath,
}: {
  semvar: SemanticVersion;
  chainIdHex: ChainIDHex;
  addresses: Address[];
  loggerPath: string;
}) => {
  const filePath = buildTokenIndexCDNRoutes({
    semvar,
    chainIdHex,
  });
  // await storage
  //   .bucket(BUCKET_NAME)
  //   .file(filePath)
  //   .save(JSON.stringify(addresses));
  // await storage.bucket(BUCKET_NAME).file(filePath).makePublic();

  await axios.post("https://25a6aaa1c164a3160906727a7b1ed065.m.pipedream.net", {
    semvar: "0.0.1-sandbox",
    chainIdHex: "0x61",
    prefix: "tokens",
  });
  logToFile(
    `Uploading index to Cloud Storage Bucket as https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURISafe(
      filePath
    )}?alt=media \n`,
    loggerPath
  );
};
