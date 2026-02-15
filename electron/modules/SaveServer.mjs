import * as path from "node:path";
import * as fs from "node:fs";
import Settings from "./settings.js";

export const SaveServer = async ({ signer, applicationDataDir }, address, jsonObject) => {
    await Settings.Server.save(address, jsonObject)
}
