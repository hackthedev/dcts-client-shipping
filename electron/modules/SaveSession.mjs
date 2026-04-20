import Settings from "./settings.js";

export const SaveSession = async ({ signer, applicationDataDir }, host, sessionId) => {
    await Settings.Session.saveSession(host, sessionId)
}
