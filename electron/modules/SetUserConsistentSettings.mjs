import Settings from "./settings.js";

export const SetUserConsistentSettings = async ({ signer, applicationDataDir }, boolean) => {
    if(boolean === undefined || typeof boolean !== "boolean") throw new Error("Bool not set")
    Settings.settings.user.consistent = !!boolean;
    await Settings.saveSettings()
}
