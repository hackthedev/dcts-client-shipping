import Settings from "./settings.js";

export const GetServers = async ({ signer, applicationDataDir }, json) => {
    return await Settings.Server.getServers()
}
