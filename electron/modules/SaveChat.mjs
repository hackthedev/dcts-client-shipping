import Settings from "./settings.js";

export const SaveChat = async ({ signer, applicationDataDir }, chatId, data) => {
    if(!chatId) throw new Error("chatId is required")
    if(!data) throw new Error("data is required");

    await Settings.Message.saveChat(chatId, data)
}
