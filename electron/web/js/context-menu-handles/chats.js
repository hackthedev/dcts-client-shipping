document.addEventListener("DOMContentLoaded", async () => {

    ContextMenu.registerContextMenu(
        "chat-entries",
        [
            ".chats .chat"
        ],
        [
            {
                icon: "&#10022;",
                text: "Delete",
                callback: async (data) => {
                    let clickedElement = data?.element;
                    let chatEntryElement = clickedElement?.closest(".chat")
                    if(!chatEntryElement) return console.warn("No chat entry element found?")

                    let chatId = chatEntryElement.getAttribute("data-gid")
                    if(!chatId) return console.warn("no chat entry gid found")

                    // show confirm and delete chat

                    customPrompts.showConfirm(
                        "Are you sure you want to delete this chat?",
                        [
                            ["Yes", "error"],
                            ["Abort", null],
                        ],
                        async (value) => {
                            if(value === "yes"){
                                await Client().DeleteChat(chatId);
                                loadMessages();
                            }
                        }
                    )
                },
                type: "error"
            }
        ]
    )
})