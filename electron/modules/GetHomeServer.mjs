import Settings from "./settings.js";

export const GetHomeServer = async ({ signer, applicationDataDir }) => {
    return await Settings.Server.getHomeServer()
}
