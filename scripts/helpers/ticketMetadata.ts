import { ChainIDHex } from "@wormgraph/helpers";
import { manifest } from "../manifest";

export const buildBaseMetadataPath = (chainIdHex: ChainIDHex) => {
  const filePath = `${manifest.storage.buckets.data}/${chainIdHex}`;
  return `${manifest.storage.downloadUrl}/${filePath}`;
};
