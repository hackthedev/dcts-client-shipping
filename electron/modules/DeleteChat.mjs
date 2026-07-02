import Settings from "./settings.js";

export const DeleteChat = async ({ signer, applicationDataDir }, chatId) => {
    if(!chatId) throw new Error("chatId must be provided");
    return await Settings.Message.deleteChat(chatId)
}
