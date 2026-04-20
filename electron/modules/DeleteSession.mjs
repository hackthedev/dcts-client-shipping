import Settings from "./settings.js";

export const DeleteSession = async ({ signer, applicationDataDir }, host) => {
    await Settings.Session.deleteSession(host)
}
