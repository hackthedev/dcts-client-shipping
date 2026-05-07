import Settings from "./settings.js";

export const GetChats = async ({ signer, applicationDataDir }) => {
    return await Settings.Message.getChats()
}
