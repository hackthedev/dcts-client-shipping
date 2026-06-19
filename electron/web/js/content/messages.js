function sortMessagesByTimestamp(messages){
    return Object.values(messages)
        .map(item => item.data ?? item)
        .sort((a, b) => {
            const aTimestamp = a?.timestamp ?? 0;
            const bTimestamp = b?.timestamp ?? 0;

            return aTimestamp - bTimestamp;
        });
}
async function fetchServerInbox(host) {
    host = extractHost(host);

    if (typeof Client().SaveChat !== "function") throw new Error("Unsupported Client!")
    if (typeof Client().SaveChatMessage !== "function") throw new Error("Unsupported Client!")
    if (typeof Client().GetChat !== "function") throw new Error("Unsupported Client!")
    if (typeof Client().GetChatMessages !== "function") throw new Error("Unsupported Client!")
    if (typeof Client().GetChatLastMessage !== "function") throw new Error("Unsupported Client!")


    let sessionId = await getSessionIdFromHost(host);
    if (!sessionId) return console.warn("Session id not found for host ", host)

    let hostInbox = await Client().FetchInbox(host)
    if (!hostInbox?.inbox) return console.warn("Host inbox not found for host ", host)

    // get stored shit
    let storedChat = await Client().GetChat(host) ?? {};
    let localMessages = await Client().GetChatMessages(host, new Date().getTime(), true) ?? {};

    let serverInfo = Object.keys(storedChat?.data?.serverinfo ?? {}).length > 0
        ? storedChat.data.serverinfo
        : await fetchServerInfo(host) ?? null;

    let chatData = {
        ...storedChat,
        ...(storedChat?.data ?? {}),
        isServer: true,
        host,
        title: serverInfo?.name ?? storedChat?.title ?? host,
        serverinfo: serverInfo ?? storedChat?.serverinfo ?? {},
        icon: serverInfo?.icon ? getFixedUrl(host, serverInfo.icon) : storedChat?.icon ?? null,
        lastRead: storedChat?.lastRead ?? storedChat?.data?.lastRead ?? 0
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
            ...message,
            updatedAt: Date.now()
        };

        await Client().SaveChatMessage(host, message);
    }

    // sorting
    let messages = sortMessagesByTimestamp(mergedMessages)

    chatData.messages = messages;
    chatData.lastMessage = messages.at(-1) ?? null;

    await Client().SaveChat(host, chatData);
    return chatData;
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

async function loadMessages(force = false) {
    try{
        await fetchMessengerChats(force ? 0 : await Client().GetLastOnline())
    }
    catch(messengerChatsError){
        console.error("Unable to get messenger chats")
        console.error(messengerChatsError);
    }

    await renderMessages();

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

function getChatNavBadgeCount(){
    let badgeElement = getNavEntryElement(1)?.querySelector("span.badge");
    if(!badgeElement) throw new Error("No badge element found?");

    return Number(badgeElement?.textContent ?? 0);
}

function setChatNavBadgeCount(count = 0){
    let badgeElement = getNavEntryElement(1)?.querySelector("span.badge");
    if(!badgeElement) throw new Error("No badge element found?");

    if(count === 0) return badgeElement.style.display = "none";
    if(count > 99) count = "99+"

    badgeElement.textContent = ChatTools.Sanitize.stripHTML(count);
    badgeElement.style.display = "flex";
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
                let inboxType = item?.type ?? null;

                if(inboxType === "messenger_user-message"){
                    let message = item.data;
                    let messageType = message?.type;

                    if(messageType === "user_message"){
                        let authorPublicKey = message?.author?.publicKey;
                        let authorGid = message?.author?.gid;
                        let authorHomeServer = message?.author?.home_server;
                        let calcAuthorGid = await Client().GenerateGid(authorPublicKey);

                        if(authorGid !== calcAuthorGid){
                            return alert(`Author IDs do not match! Possibly Network Attack!\n\n
                            
                            Server: ${homeSocket.host}\n
                            Author: ${authorGid} (${calcAuthorGid})\n
                            `)
                        }

                        // make sure the chat exists before saving any message
                        let existingChat = await Client().GetChat(authorGid)
                        if (!existingChat) {
                            await Client().SaveChat(authorGid, {
                                publicKey: authorPublicKey,
                                gid: authorGid,
                                title: `@${authorGid}`,
                                host: authorHomeServer,
                                home_server: authorHomeServer,
                                lastMessage: null,
                                icon: null,
                            });
                        }

                        await Client().SaveChatMessage(authorGid, message);
                    }
                    else{
                        console.error("Unsupported message type!", messageType)
                    }
                }
                else{
                    console.error("unsupported inbox type!", inboxType)
                }
            }

            resolve({
                ...response,
                latestTimestamp
            });
        })
    })
}

async function refreshChatEntry(chatGid, latestMessageObj = null) {
    let chatsElement = getContentElement().querySelector(`.chats .list`);
    if (!chatsElement) return;

    let chat = await Client().GetChat(chatGid);
    if (!chat) return;

    // sort messages by timestamp
    let messages = Object.values(await Client().GetChatMessages(chatGid, new Date().getTime(), true) ?? {})
        .map(item => item.data ?? item)
        .sort((a, b) => (a?.timestamp ?? 0) - (b?.timestamp ?? 0));

    let gid = await getGid();
    let lastMessage = latestMessageObj ?? messages.at(-1) ?? null;

    // decrypt this shit
    let decryptedLastMessage = null;
    if (lastMessage) {
        try {
            decryptedLastMessage = await decryptUserMessage(lastMessage[gid]);
        } catch {
            decryptedLastMessage = null;
        }
    }

    let chatName = chat?.title ?? "Unknown";
    let latestMessage = decryptedLastMessage ?? `@${chat?.host ?? chat?.home_server}`;

    // remove old entry and re-insert at top so newest chat bubbles up
    let existing = chatsElement.querySelector(`.chat[data-gid="${chatGid}"]`);
    if (existing) existing.remove();

    chatsElement.insertAdjacentHTML("afterbegin", `
        <div class="chat" data-gid="${chatGid}" onclick="renderChat('${chatGid}')">
            <div class="icon" style="background-image: url('${getFixedUrl(chat?.data?.host ?? chat?.host, chat?.data?.icon ?? chat?.icon)}')"></div>
            <div class="middle-section">
                <div class="name">${ChatTools.Sanitize.forRender(chatName)}</div>
                ${latestMessage ? `<div class="latestMessage">${ChatTools.Sanitize.forRender(latestMessage)}</div>` : ""}
            </div>
            <div class="badge ${messages.length > 0 ? "visible" : ""}">${messages.length}</div>
        </div>
    `);
}

async function renderMessages(customElement = undefined) {
    let renderElement = customElement !== undefined ? customElement : getContentElement();
    if(customElement === null) throw new Error("Custom Element was null!");

    renderElement.innerHTML =
        `
            <div class="message-page-container">
            
                <div class="chats">
                    <div class="header">
                        <h1>Chats</h1>
                        <span class="new-chat" onclick="startNewChat()">
                            ${Icon.display("message_add")}
                        </span>
                    </div>
                    <div class="list"></div>
                </div>
                <div class="chat-content ${MobilePanel.isMobile() ? "mobile" : ""}">
                </div>
            </div>
        `;

    let uniqueChats = await Client().GetChats();
    uniqueChats = Object.values(uniqueChats).sort(
        (a, b) => (b?.lastMessage?.timestamp ?? 0) - (a?.lastMessage?.timestamp ?? 0)
    );

    addChatEntries(renderElement.querySelector(`.chats .list`))

    async function addChatEntries(element) {
        if (!element) throw new Error("Element not found for adding chat element");
        if(typeof Client().GetChatLastMessage !== "function") throw new Error("Unsupported Client: GetChatLastMessage")
        if(typeof Client().GetChatMessages !== "function") throw new Error("Unsupported Client: GetChatMessages")

        for (let chat of Object.values(uniqueChats)) {
            let chatId = chat?.gid ?? chat?.host
            if (!chatId) {
                console.warn("No chat id found for chat ", chat)
                continue;
            }

            chatId = ChatTools.Sanitize.stripHTML(chatId);

            chat.messages = await Client().GetChatMessages(chatId, new Date().getTime(), true) ?? {};
            chat.messages = sortMessagesByTimestamp(chat.messages);
            chat.lastMessage = await getLastChatMessage(chatId);


            let unreadMessages = chat.messages.filter(message => {
                return (message?.timestamp ?? 0) > (chat?.lastRead ?? 0);
            });

            let chatName = chat?.title ?? "Unkown"
            let displayDate = new Date(chat?.lastMessage?.timestamp).toLocaleDateString(undefined, {
                //year: "numeric",
                month: "numeric",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
            });

            let iconUrl = getFixedUrl(chat?.host, chat?.icon);
            element.insertAdjacentHTML("beforeend", `
                <div class="chat" data-gid="${chatId}" onclick="renderChat('${chatId}')">
                    <div class="icon" style="background-image: url('${iconUrl}')"></div>
                    <div class="middle-section">
                        <div class="meta">
                            <div class="name">${ChatTools.Sanitize.forRender(chatName)}</div>
                            <span class="date">${chat?.lastMessage?.timestamp ? displayDate : ""}</span>
                        </div>
                        
                        ${chat.lastMessage?.message ? `<div class="latestMessage">${ChatTools.Sanitize.forRender(chat.lastMessage?.message)}</div>` : ""}
                    </div>
                    <div class="badge ${unreadMessages?.length > 0 ? "visible" : ""}">${unreadMessages?.length ?? ""}</div>                
                </div>
            `)
        }
    }
}

async function getGid(){
    return await Client().GenerateGid(await Client().GetPublicKey());
}

async function getLastChatMessage(chatId){
    let message = await Client().GetChatLastMessage(chatId);
    console.log(message);
    console.log(message[await getGid()]);

    let text = null;
    if(message?.isServer){
        text = message.message;
    }
    else{
        try{
            text = await decryptUserMessage(message[await getGid()])
        }
        catch(lastChatMessageError){
            console.error(lastChatMessageError);
            text = null;
        }
    }

    return {
        timestamp: message?.timestamp,
        message: text
    }
}

function getChatContentElement() {
    return document.querySelector(`.message-page-container .chat-content`);
}

function getInnerChatContentElement(chatId) {
    return getChatContentElement()?.querySelector(`.content[data-chatId="${chatId}"]`);
}

function getChatListElement() {
    return getContentElement().querySelector(`.chats`);
}



async function renderChat(chatId, customChatObject = null) {
    let activeChat = customChatObject ?? await Client().GetChat(chatId);
    if (!activeChat) throw new Error("Chat not found");

    await setChatHeader(activeChat);

    getChatContentElement().innerHTML += `
        <div class="content" data-chatId="${chatId}"></div>
        <div class="editor-container"></div>
    `;

    // infinite scroll shit
    // lets see how much pain this will be
    await ChatTools.Scroll.registerMessageInfiniteLoad(getInnerChatContentElement(chatId), async () => {
        let messages = getInnerChatContentElement(chatId)?.querySelectorAll(`.message-container`);
        let topMessage = messages[0];
        let timestamp = topMessage?.getAttribute("data-timestamp") ?? null;

        if(!timestamp) throw new Error("Invalid timestamp or not found");

        // get older messages and display them
        let messageBatch = await Client().GetChatMessages(chatId, timestamp, true);
        let sortedMessages = sortMessagesByTimestamp(messageBatch);

        // dedup
        sortedMessages = sortedMessages.filter(message => {
            return !getInnerChatContentElement(chatId).querySelector(`.message-container[data-timestamp="${message?.timestamp}"]`);
        });

        if(sortedMessages.length > 0) {
            ChatTools.Scroll.toggleSmoothScroll(getInnerChatContentElement(chatId), false)

            let template = document.createElement("div");

            let lastDate = null
            for(let message of sortedMessages) {

                let timestamp = message?.timestamp;
                let currentDate = new Date(timestamp).toDateString();

                if (currentDate !== lastDate) {
                    lastDate = currentDate;
                    renderSystemDateInChat(chatId, timestamp, template, true)
                }

                await renderUserMessage({
                    chatId,
                    item: message,
                    renderTop: false,
                    element: template
                })
            }

            getInnerChatContentElement(chatId).prepend(...template.childNodes);
            ChatTools.Scroll.toggleSmoothScroll(getInnerChatContentElement(chatId), true)
        }
    })

    ChatTools.Scroll.observeContainer(getInnerChatContentElement(chatId));


    let chatHost = activeChat?.home_server ?? activeChat?.host ?? null;
    if (!chatHost) throw new Error("No chat host found!");

    await setChatSocket(chatHost);
    await connectToSocketHost(chatHost);

    if (!activeChat?.isServer) {
        const editor = new RichEditor({
            selector: ".message-page-container .chat-content .editor-container",
            toolbar: [
                ["bold", "italic", "underline", "strike"],
                ["clean", "link", "image", "video"],
                ["code", "code-block", "blockquote"]
            ],
            onImg: (src, { insert }) => {

                if(src?.constructor?.name === "File"){
                    return console.log("Detected file")
                }
                else if(src?.constructor?.name === "String"){
                    if(src.startsWith("data:image")){
                        insert("");
                    }

                    return
                }

                // remove base64 image
                if(src.startsWith("data:image/")){
                    insert("");
                }
            },
            onSend: async (html) => {
                let messageResult = await sendMessage(html, activeChat.publicKey, chatHost);
                if (messageResult?.error) {
                    return alert(`Error while sending message!\n\n${messageResult.error}`)
                }
                else{
                    let targetData = messageResult?.target;
                    let existingChat = await Client().GetChat(targetData.gid)

                    if(targetData && existingChat){
                        let icon = targetData?.icon;
                        let name = targetData?.name;

                        if(icon) existingChat.icon = icon;
                        if(name) existingChat.title = name;
                        await Client().SaveChat(targetData.gid, existingChat);
                    }
                }

                editor.quill.setContents([{insert: "\n"}]);
            }
        });
    }

    await renderInboxElementsInChat(activeChat, true);

    // some ui tricks for mobile
    if(getChatContentElement()?.classList?.contains("mobile") && MobilePanel.isMobile()){
        getChatContentElement().classList.remove("mobile");
        getChatListElement().classList.add("hide");
        getNavElement().classList.add("hide");
    }
}

function renderSystemDateInChat(chatId, timestamp, element = null, renderTop = false){
    if(!chatId) throw new Error("Cant show system date as chatid is missing!")
    if(!timestamp) throw new Error("Cant show system date as timestamp is missing!")

    let render = element ? element : getInnerChatContentElement(chatId);
    let displayDate = new Date(timestamp).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    // this is mostly for checking on the system dates.
    // IF we append, lets check the main container too so we can remove it if present.
    // then we always check the render element too for the sake of it not being possibly
    // doubled within the appending stuff
    let existingDateMessage = null;
    if(renderTop){
        existingDateMessage = getInnerChatContentElement(chatId).querySelector(`.system-message.date[data-display-date="${displayDate}"]`);
        if(existingDateMessage) existingDateMessage.remove();
    }
    existingDateMessage = render?.querySelector(`.system-message.date[data-display-date="${displayDate}"]`);
    if(existingDateMessage) return;

    // then we obviously just render it. maybe its too much, idk, its 3am at the time of writing, gg.
    render.insertAdjacentHTML("beforeend", `
        <div class="system-message date" data-timestamp="${timestamp}" data-display-date="${displayDate}">
            <span>
                ${displayDate}
            </span>
            <hr>
        </div>
    `);
}

async function renderInboxElementsInChat(chat, initial = false) {
    if (!chat) throw new Error("No chat for rendering inbox messages");

    let gid = chat?.isServer ? chat.host : chat?.gid;
    let messages = await Client().GetChatMessages(gid, new Date().getTime(), true);

    if (!Array.isArray(messages)) {
        messages = Object.values(messages).map(item => item.data ?? item);
    }

    let lastDate = null;

    messages = sortMessagesByTimestamp(messages);

    // update some stuff
    chat.lastRead = new Date().getTime();
    chat.lastMessage = await getLastChatMessage(gid)

    for (let item of messages) {
        if (!item?.type) continue;

        let timestamp = item?.timestamp;
        let currentDate = new Date(timestamp).toDateString();

        if (currentDate !== lastDate) {
            lastDate = currentDate;
            renderSystemDateInChat(gid, lastDate)
        }

        if (item.type === "mention") {
            await renderMention(gid, item);
        } else if (item.type === "user_message") {
            await renderUserMessage({
                chatId: gid,
                item
            });
        } else {
            console.warn("Didnt render chat because of unsupported type: ", item.type)
        }
    }

    // if we actually open a chat we will just scroll down
    if (initial && getInnerChatContentElement(gid)) {
        ChatTools.Scroll.scrollDown(getInnerChatContentElement(gid))
    }

    await Client().SaveChat(gid, chat);
}

async function gidToAuthor(gid){
    let chat = await Client().GetChat(gid);
    if(!chat) return null;

    return {
        name: chat?.title ?? null,
        icon: chat?.icon ?? null,
        publicKey: chat?.publicKey ?? null,
        home_server: chat?.home_server ?? null,
    }
}

async function renderUserMessage({
                                     item,
                                     chatId = null,
                                     element = null,
                                     renderTop = false,
                                     notify = false,
                                 } = {}) {
    if(!chatId) throw new Error("Missing chatid!");

    let message = item?.data?.message ?? item;
    let authorGid = message?.author?.gid;

    // OUR gid comrade.
    let gid = await getGid();
    let encryptedMessage = message[gid];

    // idk why this happens, lazy.
    // seems to only happen on android
    if(typeof encryptedMessage === "string" && encryptedMessage.startsWith("{")) encryptedMessage = JSON.parse(encryptedMessage ?? "{}");

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

    // notification handling etc
    // if not active, show notification,
    // if active but not focused in the chat section, show badge
    // if we didnt send the message ourselves
    let isInactive = !isActive();
    let isActiveButIsntChatting = isActive() && getSelectedNavEntry() !== getNavEntryElement(1);
    let isAuthor = authorGid === await getGid();

    if((isInactive || isActiveButIsntChatting) && notify === true && !isAuthor){
        let authorInfo = await gidToAuthor(chatId)
        let title = authorInfo?.name ? ChatTools.Sanitize.truncateText(authorInfo.name, 25) : "New Message!";

        await Client().ShowNotification({
            title,
            text: ChatTools.Sanitize.stripHTML(decryptedMessageText ?? ""),
            icon: ChatTools.Sanitize.stripHTML(authorInfo?.icon ?? null),
        })

        setChatNavBadgeCount(getChatNavBadgeCount() + 1)
    }

    // dedup
    if(getInnerChatContentElement(chatId)?.querySelector(`.message-container[data-timestamp="${message?.timestamp}"]`)){
        return;
    }

    let renderElement = element ? element : getInnerChatContentElement(chatId);
    if(!renderElement) return console.warn("Skipped rendering as element wasnt found")

    // handle markdown
    let markdownResult = await ChatTools.Media.markdown({
        htmlInput: decryptedMessageText,
        identifier: item?.timestamp,
        containerElement: element ? element : getInnerChatContentElement(chatId),
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

    let isScrolledDown = ChatTools.Scroll.isScrolledToBottom(getInnerChatContentElement(chatId), 50);

    renderElement.insertAdjacentHTML(renderTop ? "afterbegin" : "beforeend", await getMessageHTML({
        text,
        timestamp: message?.timestamp,
        isMine: authorGid === gid,
    }))

    if (isScrolledDown && !renderTop) ChatTools.Scroll.scrollDown(getInnerChatContentElement(chatId))
}

async function renderMention(gid, item, element = null) {
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

    let renderElement = element ? element : getInnerChatContentElement(gid);
    renderElement.insertAdjacentHTML("beforeend", await getMessageHTML({
        text,
        timestamp: message?.timestamp,
    }))
}

async function getMessageHTML({
                                  text,
                                  timestamp,
                                  isMine = false,
                              } = {}) {
    if (!text) throw new Error("No text for messages");

    return `
            <div class="message-container ${isMine ? "mine" : ""}" data-timestamp="${timestamp}">
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
    let chatTitle = chat?.title ?? chat?.name ?? "Unkown";
    let chatIcon = chat?.icon ?? "";

    getChatContentElement().innerHTML =
        `
        <div class="header">
            <span class="back" onclick="loadMessages()">${Icon.display("back")}</span>
            <div class="icon" style="background-image: url('${ChatTools.Sanitize.stripHTML(chatIcon)}')"></div>
            <h1>${ChatTools.Sanitize.forRender(chatTitle)}</h1>
        </div>`;
}

async function startNewChat({
                                identifier = null,
                                error = null,
                                automate = false,
                            } = {}) {

    if(automate){
        return await startChat(identifier)
    }

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
            await startChat(address)
        },
        ["Check", "success"],
        false,
        350
    );

    async function startChat(address){
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
            console.error(sendingError, address)
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
                    title: testMessage?.name ?? `New Chat`,
                    host: homeServer,
                    home_server: homeServer,
                    lastMessage: null,
                    lastRead: new Date().getTime(),
                    icon: testMessage?.icon ?? null,
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
    }
}