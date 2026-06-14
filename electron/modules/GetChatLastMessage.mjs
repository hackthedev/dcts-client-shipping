import Settings from "./settings.js";

export const GetChatLastMessage = async ({ signer, applicationDataDir }, chatId) => {
    if(!chatId) throw new Error("No chatId for getting the chat message");
    return await Settings.Message.getChatLastMessage(chatId);
}
