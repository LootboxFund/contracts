// ts-node ./scripts/helpers/uploadABIs.ts
import * as dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import fs from "fs";
import { encodeURISafe } from "./logger";
import { SemanticVersion } from "@wormgraph/manifest";
import { manifest } from "../manifest";

const CONSTANTS = {
  webhookEndpoint: manifest.pipedream.sources.onUploadABI.webhookEndpoint,
  bucket: manifest.googleCloud.bucket.id,
  semver: manifest.semver.id,
  chainIdHex: manifest.chain.chainIDHex,
};

export const uploadABI = async ({
  alias,
  pathToFile,
  webhookEndpoint,
  bucket,
  semver,
  chainIdHex,
}: {
  alias: string;
  pathToFile: string;
  webhookEndpoint: string;
  bucket: string;
  semver: SemanticVersion;
  chainIdHex: string;
}) => {
  console.log(`Uploading ABIs to ${CONSTANTS.webhookEndpoint}...`);
  const secret = process.env.WEBHOOK_ABI_UPLOADER_SECRET || "mysecret";
  const metadata = {
    alias,
    bucket,
    semver,
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
    const filePath = `v/${chainIdHex}/abi/${alias}.json`;
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

const ABI_FILES = [
  "artifacts/contracts/LootboxFactory.sol/LootboxFactory.json",
  "artifacts/contracts/Lootbox.sol/Lootbox.json",
];

ABI_FILES.forEach(async (filePath) => {
  const alias = filePath.split("/").pop()!.split(".")[0];
  await uploadABI({
    ...CONSTANTS,
    alias,
    pathToFile: `${__dirname}/../../${filePath}`,
  });
});
