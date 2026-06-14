import Settings from "./settings.js";

export const GetChatMessages = async ({ signer, applicationDataDir }, chatId, timestamp, desc) => {
    if(!chatId) throw new Error("No chatId for getting the chat messages");
    return await Settings.Message.getMessages(chatId, timestamp, desc);
}
