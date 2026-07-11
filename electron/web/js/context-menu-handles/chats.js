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

                    let chatNameElement = chatEntryElement.querySelector(".meta .name")
                    let chatName = chatNameElement?.textContent ?? "";

                    // show confirm and delete chat
                    customPrompts.showConfirm(
                        {
                            title: `Delete Chat with '${chatName}'?`
                        },
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