// ts-node ./scripts/helpers/uploadABIs.ts
import * as dotenv from "dotenv";
dotenv.config();

import { SemanticVersion } from "@wormgraph/manifest";
import axios from "axios";
import fs from "fs";
import { encodeURISafe } from "./logger";
import { manifest } from "../manifest";
import { getSecret } from "./secrets";

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
  // console.log(`Uploading ABIs to ${CONSTANTS.webhookEndpoint}...`);
  const secret = await getSecret({ name: "PD_ABI_UPLOADER_SECRET" });

  if (!secret) {
    return;
  }

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
    const filePath = `${chainIdHex}/${alias}.json`;
    // This dosent look like it actually gets used, just logged
    const downloadablePath = `https://storage.googleapis.com/${bucket}/${encodeURISafe(
      filePath
    )}`;

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

console.log('\n\n🚨 Make sure the ABI files do not exist in the GBucket already. Otherwise, the pipedream webhook might fail with "Missing delete permission error" which is not properly reported in this script. 🚨')

const ABI_FILES = [
  "artifacts/contracts/LootboxInstantFactory.sol/LootboxInstantFactory.json",
  "artifacts/contracts/LootboxEscrowFactory.sol/LootboxEscrowFactory.json",
];

const abiBucket = manifest.storage.buckets.abi;

const CONSTANTS = {
  webhookEndpoint: manifest.pipedream.sources.onUploadABI.webhookEndpoint,
  bucket: abiBucket.id,
  semver: manifest.semver.id,
  chainIdHex: manifest.chain.chainIDHex,
};

ABI_FILES.forEach(async (filePath) => {
  const alias = filePath.split("/").pop()!.split(".")[0];
  await uploadABI({
    ...CONSTANTS,
    alias,
    pathToFile: `${__dirname}/../../${filePath}`,
  });
});
