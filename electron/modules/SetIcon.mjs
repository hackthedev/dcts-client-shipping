import Settings from "./settings.js";

export const SetUserIcon = async ({ signer, applicationDataDir }, iconString) => {
    if(!iconString) throw new Error("Icon wasnt set")
    Settings.settings.user.icon = iconString;
}
