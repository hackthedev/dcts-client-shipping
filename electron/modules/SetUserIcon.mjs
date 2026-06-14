import Settings from "./settings.js";

export const SetUserIcon = async ({ signer, applicationDataDir }, iconString) => {
    if(iconString === undefined) throw new Error("Icon wasnt set")
    Settings.settings.user.icon = iconString;
    await Settings.saveSettings()
}
