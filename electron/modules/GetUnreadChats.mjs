import Settings from "./settings.js";

export const GetUnreadChats = async ({ signer, applicationDataDir }) => {
    return await Settings.Message.getChatsUnread();
}
