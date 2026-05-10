import Settings from "./settings.js";

export const SetHomeServer = async ({ signer, applicationDataDir }, address) => {
    if(address?.trim()?.length === 0) throw new Error("No address provided");
    await Settings.Server.setHomeServer(address)
}
