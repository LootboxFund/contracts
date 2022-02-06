// ts-node ./scripts/helpers/uploadABIs.ts
import * as dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import fs from "fs";
import { encodeURISafe } from "./logger";

export const uploadABI = async ({
  alias,
  pathToFile,
  webhookEndpoint,
  bucket,
  semvar,
  chainIdHex,
}: {
  alias: string;
  pathToFile: string;
  webhookEndpoint: string;
  bucket: string;
  semvar: string;
  chainIdHex: string;
}) => {
  const secret = process.env.WEBHOOK_ABI_UPLOADER_SECRET || "mysecret";
  const metadata = {
    alias,
    bucket,
    semvar,
    chainIdHex,
  };
  fs.readFile(pathToFile, "utf8", async (err, abi) => {
    if (err) {
      console.error(err);
      return;
    }
    const data = {
      metadata,
      abi,
    };
    const filePath = `v/${semvar}/${chainIdHex}/abi/${alias}.json`;
    const downloadablePath = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURISafe(
      filePath
    )}?alt=media \n`;
    console.log(`
    
    Uploading ABI to ${downloadablePath}
    
    `);
    await axios
      .post(webhookEndpoint, data, {
        headers: {
          secret,
        },
      })
      .then((data) => {
        // console.log(data);
      })
      .catch((err) => {
        console.log(err);
      });
  });
};

const CONSTANTS = {
  webhookEndpoint: "https://eef236c059a42b8b5d39ae05efddede7.m.pipedream.net",
  bucket: "guildfx-exchange.appspot.com",
  semvar: "0.0.1-sandbox",
  chainIdHex: "0x61",
};

const ABI_FILES = [
  "artifacts/contracts/Constants.sol/Constants.json",
  "artifacts/contracts/CrowdSale.sol/CrowdSale.json",
  "artifacts/contracts/CrowdSaleFactory.sol/CrowdSaleFactory.json",
  "artifacts/contracts/GuildFactory.sol/GuildFactory.json",
  "artifacts/contracts/GuildToken.sol/GuildToken.json",
];

ABI_FILES.forEach(async (filePath) => {
  const alias = filePath.split("/").pop()!.split(".")[0];
  await uploadABI({
    ...CONSTANTS,
    alias,
    pathToFile: `${__dirname}/../../${filePath}`,
  });
});
