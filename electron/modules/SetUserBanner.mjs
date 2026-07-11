import Settings from "./settings.js";

export const SetUserBanner = async ({ signer, applicationDataDir }, iconString) => {
    if(iconString === undefined) throw new Error("Icon wasnt set")
    Settings.settings.user.banner = iconString;
    await Settings.saveSettings()
}
