import Settings from "./settings.js";

export const DeleteServer = async ({ signer, applicationDataDir }, ip) => {
    return await Settings.Server.deleteServer(ip)
}
