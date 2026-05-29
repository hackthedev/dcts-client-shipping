import Settings from "./settings.js";

export const SetAlias = async ({ signer, applicationDataDir }, aliasString) => {
    if(aliasString === undefined) throw new Error("Nickname wasnt set")
    Settings.settings.user.alias = aliasString;
    await Settings.saveSettings()
}
