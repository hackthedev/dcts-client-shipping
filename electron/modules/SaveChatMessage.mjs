import Settings from "./settings.js";

export const SaveChatMessage = async ({ signer, applicationDataDir }, chatId, data) => {
    if(Object.keys(data ?? {})?.length === 0) throw new Error("No data provided for saving the chat message");
    if(!chatId) throw new Error("No chat id for saving the chat message");
    if(!data?.messageId) throw new Error("No message id provided for saving the chat message");

    return await Settings.Message.saveMessage(chatId, data?.messageId, data);
}
