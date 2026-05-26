import Settings from "./settings.js";

export const SetNickname = async ({ signer, applicationDataDir }, nicknameString) => {
    if(!nicknameString) throw new Error("Nickname wasnt set")
    Settings.settings.user.nickname = nicknameString;
}
