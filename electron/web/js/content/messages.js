async function getMessagesFromServers() {
    let servers = await Client().GetServers()
    console.log(servers)
}

async function fetchServerInbox(host) {
    host = extractHost(host);

    if(typeof Client().SaveChat !== "function") throw new Error("Unsupported Client!")
    if(typeof Client().SaveChatMessage !== "function") throw new Error("Unsupported Client!")
    if(typeof Client().GetChat !== "function") throw new Error("Unsupported Client!")
    if(typeof Client().GetChatMessages !== "function") throw new Error("Unsupported Client!")

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

    let mergedMessages = { ...localMessages };

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
                <div class="badge">${messages.length}</div>
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

async function renderMessages() {
    getContentElement().innerHTML =
        `
            <div class="message-container">
                <div class="chats"></div>
                <div class="chat-content">
                </div>
            </div>
        `;

    let uniqueChats = await Client().GetChats();
    addChatEntries(getContentElement().querySelector(`.chats`))

    async function addChatEntries(element) {
        if (!element) throw new Error("Element not found for adding chat element");

        for (let chat of Object.values(uniqueChats)) {
            let chatId = chat?.host ?? chat?.data?.host;
            if(!chatId) {
                console.warn("No chat id found for chat ", chat)
                continue;
            }

            let chatName = chat?.title ?? chat?.data?.title ?? "Unkown"
            let latestMessage = `@${chat?.host ?? chat?.data?.host}`// will need to actually decrypt this

            element.insertAdjacentHTML("beforeend", `
                <div class="chat" data-gid="${chatId}" onclick="renderChat('${chatId}')">
                    <div class="icon" style="background-image: url('${getFixedUrl(chat?.data?.host, chat?.data?.icon)}')"></div>
                    <div class="middle-section">
                        <div class="name">${chatName}</div>
                        ${latestMessage ? `<div class="latestMessage">${latestMessage}</div>` : ""}
                    </div>
                    <div class="badge"></div>                
                <div>
            `)
        }
    }
}

function getChatContentElement() {
    return document.querySelector(`.message-container .chat-content`);
}

function getInnerChatContentElement() {
    return getChatContentElement().querySelector(`.content`);
}

async function renderChat(chatId, customChatObject = null) {
    let activeChat = customChatObject ?? await Client().GetChat(chatId);

    if (activeChat?.data && !activeChat?.host) {
        activeChat = {
            ...activeChat.data,
            messages: activeChat.messages ?? activeChat.data.messages ?? []
        };
    }

    if (!activeChat) throw new Error("Chat not found");

    await setChatHeader(activeChat);

    getChatContentElement().innerHTML += `
        <div class="content"></div>
        <div class="editor-container"></div>
    `;

    const editor = new RichEditor({
        selector: ".message-container .chat-content .editor-container",
        toolbar: [
            ["bold", "italic", "underline", "strike"],
            ["clean", "link", "image", "video"],
            ["code", "code-block", "blockquote"]
        ],
        onImg: async (src) => {

        },
        onSend: async (html) => {
            console.log("sending ", html)
        }
    });

    await renderInboxElementsInChat(activeChat);
}

async function renderInboxElementsInChat(chat) {
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
        }
        else{
            console.warn("Didnt render chat because of unsupported type: ", item.type)
        }
    }

    async function renderMention(item) {
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

        console.log(message.timestamp)
        getInnerChatContentElement().insertAdjacentHTML("beforeend", await getMessageHTML({
            text,
            timestamp: message?.timestamp
        }))
    }
}

async function getMessageHTML({
                                  text,
                                  timestamp,
                              } = {}) {
    if (!text) throw new Error("No text for messages");


    return `
            <div class="message-container">
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
    let chatTitle = chat?.title ?? chat?.protected?.name ?? "Unkown";
    let chatIcon = chat?.icon ?? chat?.protected?.icon ?? "";

    getChatContentElement().innerHTML =
        `
        <div class="header">
            <div class="icon" style="background-image: url('${chatIcon}')"></div>
            <h1>${chatTitle}</h1>
        </div>`;
}