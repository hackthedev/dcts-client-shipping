import Settings from "./settings.js";

export const SetLastOnline = async ({ signer, applicationDataDir }, timestamp) => {
    if(!timestamp) timestamp = new Date().getTime();
    await Settings.Client.setLastOnline(timestamp);
}
