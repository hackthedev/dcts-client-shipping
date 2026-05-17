import Settings from "./settings.js";

export const GetSession = async ({ signer, applicationDataDir }, host) => {
    return await Settings.Session.getSession(host)
}
