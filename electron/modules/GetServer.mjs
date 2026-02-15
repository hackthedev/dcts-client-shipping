import Settings from "./settings.js";

export const GetServer = async ({ signer, applicationDataDir }, ip) => {
    return await Settings.Server.getServer(ip)
}
