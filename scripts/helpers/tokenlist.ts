import { logToFile } from "./logger";
import { filterMap, removeUndefined } from "./tsUtil";
import { Storage } from "@google-cloud/storage";
import {
  ChainIDHex,
  buildTokenMoldCDNRoute,
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

export interface TokenDataWithCDN extends TokenData {
  cdnFilePath: string;
}
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
  logToFile(
    `Uploading ${tokenFrag.symbol} to Cloud Storage Bucket ${BUCKET_NAME} as ${tokenFrag.address}.json \n`,
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
    cdnFilePath: buildTokenMoldCDNRoute({
      chainIdHex: chainIdHex,
      semvar,
      address: tokenFrag.address,
    }),
  };
  await storage
    .bucket(BUCKET_NAME)
    .file(tokenData.cdnFilePath)
    .save(
      JSON.stringify(
        removeUndefined({
          ...tokenData,
          cdnFilePath: undefined,
        })
      )
    );
  await storage.bucket(BUCKET_NAME).file(tokenData.cdnFilePath).makePublic();
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
  await storage
    .bucket(BUCKET_NAME)
    .file(filePath)
    .save(JSON.stringify(addresses));
  await storage.bucket(BUCKET_NAME).file(filePath).makePublic();
  logToFile(
    `
  Saving index to cloud bucket ${BUCKET_NAME} ${filePath} \n
  `,
    loggerPath
  );
};