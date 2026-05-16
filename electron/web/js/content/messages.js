async function fetchServerInbox(host) {
    host = extractHost(host);

    if (typeof Client().SaveChat !== "function") throw new Error("Unsupported Client!")
    if (typeof Client().SaveChatMessage !== "function") throw new Error("Unsupported Client!")
    if (typeof Client().GetChat !== "function") throw new Error("Unsupported Client!")
    if (typeof Client().GetChatMessages !== "function") throw new Error("Unsupported Client!")

    let sessionId = await getSessionIdFromHost(host);
    if (!sessionId) return console.warn("Session id not found for host ", host)

    let hostInbox = await Client().FetchInbox(host)
    if (!hostInbox?.inbox) return console.warn("Host inbox not found for host ", host)

    // get stored shit
    let storedChat = await Client().GetChat(host) ?? {};
    let localMessages = await Client().GetChatMessages(host) ?? {};

    let serverInfo = Object.keys(storedChat?.data?.serverinfo ?? {}).length > 0
        ? storedChat.data.serverinfo
        : await fetchServerInfo(host) ?? null;

    let chatData = {
        isServer: true,
        host,
        title: serverInfo?.name ?? host,
        serverinfo: serverInfo ?? {},
        icon: serverInfo?.icon ? getFixedUrl(host, serverInfo.icon) : null
    };

    let mergedMessages = {...localMessages};

    // some processing
    for (let item of hostInbox.inbox) {
        let message = item.data?.message ?? item;
        if (!message?.messageId) continue;

        message.type = item.type;
        message.inboxId = item.id;
        message.isRead = item.isRead;
        message.isServer = true;
        message.host = host;
        message.title = chatData.title;
        message.serverinfo = chatData.serverinfo;
        message.icon = chatData.icon;

        mergedMessages[message.messageId] = {
            data: message,
            updatedAt: Date.now()
        };

        await Client().SaveChatMessage(host, message);
    }

    // sorting
    let messages = Object.values(mergedMessages)
        .map(item => item.data ?? item)
        .sort((a, b) => {
            const aTimestamp = a?.timestamp ?? 0;
            const bTimestamp = b?.timestamp ?? 0;

            return aTimestamp - bTimestamp;
        });

    chatData.messages = messages;
    chatData.lastMessage = messages.at(-1) ?? null;

    await Client().SaveChat(host, chatData);
    await addInboxEntry(chatData);

    return chatData;

    async function addInboxEntry(item) {
        if (!item) throw new Error("item not found for adding inbox element");

        let chatId = item.host;
        let chatName = item?.title ?? item?.host;
        let latestMessage = item?.lastMessage?.message ?? item?.lastMessage?.text ?? `@${chatId}`;
        let iconUrl = item?.icon ?? "";

        let serverChatSelector = getContentElement().querySelector(`.chats .chat[data-gid="${chatId}"]`);
        if (serverChatSelector) serverChatSelector.remove();

        getContentElement().querySelector(`.chats`).insertAdjacentHTML("beforeend", `
            <div class="chat" data-gid="${chatId}" data-host="${chatId}" data-server="true">
                <div class="icon" style="background-image: url('${iconUrl}')"></div>
                <div class="middle-section">
                    <div class="name">${chatName}</div>
                    ${latestMessage ? `<div class="latestMessage">${latestMessage}</div>` : ""}
                </div>
                <div class="badge ${messages?.length > 0 ? "visible" : ""}">${messages.length}</div>
            </div>
        `)

        serverChatSelector = getContentElement().querySelector(`.chats .chat[data-gid="${chatId}"]`);
        serverChatSelector?.addEventListener("click", async () => {
            renderChat(null, item)
        })
    }
}

function getFixedUrl(host, url) {
    if (!host || !url) return null;

    const base = `${getProtocol(host)}://${host}`;
    const cleanUrl = String(url).trim();

    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
        return cleanUrl;
    }

    return cleanUrl.startsWith("/")
        ? `${base}${cleanUrl}`
        : `${base}/${cleanUrl}`;
}

async function loadMessages() {
    renderMessages();

    let clientServers = await Client().GetServers();
    if (clientServers) {
        for (let server in clientServers) {
            try {
                await fetchServerInbox(server)
            } catch {
            }
        }
    }
}

async function fetchMessengerChats(timestamp = 0) {
    return new Promise(async (resolve, reject) => {
        let publicKey = await Client().GetPublicKey();
        let homeSocket = getHomeSocket();

        if (!homeSocket) return reject("Home socket not found");

        homeSocket.emit("/messenger/fetch", {
            sessionId: await getSessionIdFromHost(homeSocket.host),
            publicKey,
            timestamp
        }, async (response) => {
            if (response?.error) return reject(response.error);

            let latestTimestamp = Number(timestamp ?? 0);

            for (let item of response?.inbox ?? []) {
                let message = item?.data?.message ?? item?.data ?? item;
                if (!message?.publicKey) continue;

                let senderGid = await Client().GenerateGid(message.publicKey);
                if (!senderGid) continue;

                message.gid = senderGid;
                message.type = "user_message";
                message.inboxId = item.id;
                message.isRead = item.isRead;

                await Client().SaveChatMessage(senderGid, message);

                latestTimestamp = Math.max(
                    latestTimestamp,
                    Number(item?.createdAt ?? 0),
                    Number(message?.timestamp ?? 0)
                );
            }

            resolve({
                ...response,
                latestTimestamp
            });
        })
    })
}

async function renderMessages() {
    getContentElement().innerHTML =
        `
            <div class="message-page-container">
            
                <div class="chats">
                    <div class="header">
                        <h1>Chats</h1>
                        <span class="new-chat" onclick="startNewChat()">
                            ${Icon.display("message_add")}
                        </span>
                    </div>
                </div>
                <div class="chat-content">
                </div>
            </div>
        `;

    let uniqueChats = await Client().GetChats();
    uniqueChats = Object.values(uniqueChats).sort(
        (a, b) => (b?.lastMessage?.timestamp ?? 0) - (a?.lastMessage?.timestamp ?? 0)
    );

    let gid = await Client().GenerateGid(await Client().GetPublicKey());

    addChatEntries(getContentElement().querySelector(`.chats`))

    async function addChatEntries(element) {
        if (!element) throw new Error("Element not found for adding chat element");

        for (let chat of Object.values(uniqueChats.reverse())) {
            let chatId = chat?.data?.gid ?? chat?.host ?? chat?.data?.host;
            if (!chatId) {
                console.warn("No chat id found for chat ", chat)
                continue;
            }

            let messages = Object.values(chat.messages)
                .map(item => item.data ?? item)
                .sort((a, b) => {
                    const aTimestamp = a?.timestamp ?? 0;
                    const bTimestamp = b?.timestamp ?? 0;

                    return aTimestamp - bTimestamp;
                });

            chat.messages = messages;
            chat.lastMessage = messages.at(-1) ?? null;

            if (chat.lastMessage) {
                chat.lastMessage = chat.lastMessage[gid];
                chat.lastMessage = await decryptUserMessage(chat.lastMessage)
            }


            let chatName = chat?.title ?? chat?.data?.title ?? "Unkown"
            let latestMessage = chat.lastMessage ?? `@${chat?.host ?? chat?.data?.host ?? chat?.data?.home_server}`// will need to actually decrypt this

            element.insertAdjacentHTML("beforeend", `
                <div class="chat" data-gid="${chatId}" onclick="renderChat('${chatId}')">
                    <div class="icon" style="background-image: url('${getFixedUrl(chat?.data?.host, chat?.data?.icon)}')"></div>
                    <div class="middle-section">
                        <div class="name">${chatName}</div>
                        ${latestMessage ? `<div class="latestMessage">${latestMessage}</div>` : ""}
                    </div>
                    <div class="badge ${messages?.length > 0 ? "visible" : ""}">${messages?.length ?? ""}</div>                
                </div>
            `)
        }
    }
}

function getChatContentElement() {
    return document.querySelector(`.message-page-container .chat-content`);
}

function getInnerChatContentElement() {
    return getChatContentElement().querySelector(`.content`);
}

async function renderChat(chatId, customChatObject = null) {
    let activeChat = customChatObject ?? await Client().GetChat(chatId);
    console.log(chatId, customChatObject, activeChat)

    if (!activeChat) throw new Error("Chat not found");

    await setChatHeader(activeChat);

    getChatContentElement().innerHTML += `
        <div class="content"></div>
        <div class="editor-container"></div>
    `;

    let chatHost = activeChat?.data?.host ?? activeChat?.host ?? activeChat?.data?.home_server ?? null;
    if (!chatHost) throw new Error("No chat host found!");
    await connectToSocketHost(chatHost);

    if (!activeChat?.isServer) {
        const editor = new RichEditor({
            selector: ".message-page-container .chat-content .editor-container",
            toolbar: [
                ["bold", "italic", "underline", "strike"],
                ["clean", "link", "image", "video"],
                ["code", "code-block", "blockquote"]
            ],
            onImg: async (src) => {

            },
            onSend: async (html) => {
                console.log(activeChat)
                console.log(activeChat.data)

                let messageResult = await sendMessage(html, activeChat.data.publicKey, chatHost);
                if (messageResult?.error) {
                    return alert(`Error while sending message!\n\n${messageResult.error}`)
                }

                editor.quill.setContents([{insert: "\n"}]);
            }
        });
    }

    await renderInboxElementsInChat(activeChat, true);
}

async function renderInboxElementsInChat(chat, initial = false) {
    if (!chat) throw new Error("No chat for rendering inbox messages");

    let messages = chat?.messages ?? chat?.data?.messages ?? [];

    if (!Array.isArray(messages)) {
        messages = Object.values(messages).map(item => item.data ?? item);
    }

    let lastDate = null;

    for (let item of messages) {
        if (!item?.type) continue;

        let timestamp = item?.timestamp;
        let currentDate = new Date(timestamp).toDateString();

        if (currentDate !== lastDate) {
            lastDate = currentDate;

            getInnerChatContentElement().insertAdjacentHTML("beforeend", `
            <div class="system-message">
                <span>
                    ${new Date(timestamp).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            })}
                </span>
                <hr>
            </div>
        `);
        }

        if (item.type === "mention") {
            await renderMention(item);
        } else if (item.type === "user_message") {
            await renderUserMessage(item);
        } else {
            console.warn("Didnt render chat because of unsupported type: ", item.type)
        }
    }

    // if we actually open a chat we will just scroll down
    if (initial) {
        ChatTools.Scroll.scrollDown(getInnerChatContentElement())
    }
}

async function renderUserMessage(item, element = null) {
    let message = item?.data?.message ?? item;
    let authorGid = message?.gid;

    // OUR gid comrade.
    let gid = await Client().GenerateGid(await Client().GetPublicKey());
    let encryptedMessage = message[gid];

    // skill issue
    if (!encryptedMessage?.method) throw new Error("Invalid message data", message);

    // okayyyy lets go. decrypt message lol
    let decryptedMessageText;
    try {
        decryptedMessageText = await decryptUserMessage(encryptedMessage)
    } catch (blyat) {
        console.error(blyat);
        return;
    }

    // handle markdown
    let markdownResult = await ChatTools.Media.markdown({
        htmlInput: decryptedMessageText,
        identifier: item?.timestamp,
        containerElement: getInnerChatContentElement(),
    })

    // if it was changed update the text
    if (markdownResult?.isMarkdown === true) {
        decryptedMessageText = markdownResult.html;
    }

    let text = `
            <div class="user_message-container">
                ${decryptedMessageText ?? ""}
            </div>            
        `;


    let isScrolledDown = ChatTools.Scroll.isScrolledToBottom(getInnerChatContentElement(), 50);

    let renderElement = element ? element : getInnerChatContentElement();
    renderElement.insertAdjacentHTML("beforeend", await getMessageHTML({
        text,
        timestamp: message?.timestamp,
        isMine: authorGid === gid,
    }))

    if (isScrolledDown) ChatTools.Scroll.scrollDown(getInnerChatContentElement())
}

async function renderMention(item, element = null) {
    let message = item?.data?.message ?? item;
    let author = message?.author;

    let text = `
            <div class="mention-embed">
                <div class="icon" style="background-image: url('${getFixedUrl(item?.host, author?.icon)}')"></div>
                
                <div class="content">
                    <p><span class="mention">@${author?.name ?? "Unkown"}</span> mentioned you in <span class="mention">#${message.channelName ?? "Unkown"}</span>:</p>
                    <blockquote>
                        ${message?.message ?? ""}
                    </blockquote>
                </div>
            </div>            
        `;

    let renderElement = element ? element : getInnerChatContentElement();
    renderElement.insertAdjacentHTML("beforeend", await getMessageHTML({
        text,
        timestamp: message?.timestamp
    }))
}

async function getMessageHTML({
                                  text,
                                  timestamp,
                                  isMine = false,
                              } = {}) {
    if (!text) throw new Error("No text for messages");

    return `
            <div class="message-container ${isMine ? "mine" : ""}">
                <div class="content">
                    ${text}
                </div>
                <div class="meta">
                    <p class="timestamp">
                        ${new Date(timestamp).toLocaleTimeString("en-US", {
                            hour: '2-digit',
                            minute: '2-digit',
                        }) ?? ""}
                    </p>
                </div>
            </div>
            `
}


async function setChatHeader(chat) {
    let chatTitle = chat?.data?.title ?? chat?.data?.name ?? "Unkown";
    let chatIcon = chat?.data?.icon ?? "";

    getChatContentElement().innerHTML =
        `
        <div class="header">
            <div class="icon" style="background-image: url('${chatIcon}')"></div>
            <h1>${chatTitle}</h1>
        </div>`;
}

async function startNewChat({
                                identifier = null,
                                error = null,
                            } = {}) {
    prompts.showPrompt(
        "New Chat",
        `

        <style>
        #promptContainer p.chat-start-error{
            background-color: rgba(205,92,92,0.20);
            color: indianred;
            border-radius: 6px;
            border: 1.5px solid indianred;
            padding: 0.25rem;
            width: 100%;
            text-align: center;
        }
        </style>

        ${error ?
            `<p class="chat-start-error">
            ${error}
        </p>` : ""}

        <div class="prompt-form-group">
            <label class="prompt-label">User Address</label>
            <input class="prompt-input" ${identifier ? `value="${identifier}"` : ""} name="address" type="text" placeholder="123456789==@server.com, vanity@server.com, ...">
        </div>
    `,
        async ({address}) => {
            address = address?.trim();
            if (!address || !address?.includes("@")) {
                await prompts.closePrompt();
                return await startNewChat({error: "Invalid address!"});
            }

            let splitName = address.split("@");
            let identifierName = splitName[0] ?? null;
            let host = splitName[1] ?? null;

            if (!identifierName || !host) {
                return await reopenWithError("No identifier or host found")
            }

            // send a test message that wont store anything but still validate everything etc and reolve
            // the user if it exists
            let testMessage
            try {
                testMessage = await sendMessage("Test", identifierName, host, true);
            } catch (sendingError) {
                console.error(sendingError)
                return await reopenWithError("Unable to check on user");
            }

            let extractedHost = extractHost(testMessage?.target?.home_server);
            let fullIdentifier = `${identifierName}@${extractedHost}`;

            // CHECK FOR ERRORS N SHIT
            // if the host changed we will redirect it
            await checkForErrors();

            // ok lets assume there were no errors then
            if (testMessage?.target?.publicKey) {
                let targetGid = await Client().GenerateGid(testMessage.target.publicKey);

                // some more tests
                if (!targetGid) throw new Error("Couldnt generate target gid");
                if (targetGid !== testMessage.target?.gid) throw new Error("Calculated GID and given GID doesnt match");

                let existingChat = await Client().GetChat(targetGid);
                if (existingChat?.data?.gid || existingChat?.gid) {
                    await renderChat(targetGid);
                } else {
                    let homeServer = extractHost(testMessage.target?.home_server);

                    let newChat = {
                        publicKey: testMessage.target?.publicKey,
                        gid: targetGid,
                        title: `New Chat`,
                        host: homeServer,
                        home_server: homeServer,
                        lastMessage: null,
                        icon: null,
                        messages: {}
                    };

                    await Client().SaveChat(targetGid, newChat);
                    await renderChat(null, newChat);
                }
            }


            async function checkForErrors() {
                if (extractedHost !== extractHost(host) && extractedHost) {
                    return await reopenWithError("User moved to different home server", fullIdentifier)
                }

                if (!testMessage?.target?.gid) {
                    return await reopenWithError("No user found :/")
                }
            }

            async function reopenWithError(errorText, identifier) {
                prompts.closePrompt();
                return await startNewChat({
                    identifier,
                    error: errorText,
                });
            }
        },
        ["Check", "success"],
        false,
        350
    );
}