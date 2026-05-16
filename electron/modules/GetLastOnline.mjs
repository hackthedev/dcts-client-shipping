import Settings from "./settings.js";

export const GetLastOnline = async ({ signer, applicationDataDir }) => {
    return await Settings.Client.getLastOnline() ?? null;
}
