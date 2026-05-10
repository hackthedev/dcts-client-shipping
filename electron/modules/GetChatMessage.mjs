import Settings from "./settings.js";

export const GetChatMessage = async ({ signer, applicationDataDir }, chatId, messageId) => {
    if(!chatId) throw new Error("No chatId for getting the chat message");
    if(!messageId) throw new Error("No chatId for getting the chat message");
    return await Settings.Message.getMessage(chatId, messageId);
}
