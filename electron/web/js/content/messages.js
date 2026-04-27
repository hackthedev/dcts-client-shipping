async function getMessagesFromServers(){
    let servers = await Client().GetServers()
    console.log(servers)
}

async function fetchServerInbox(host) {
    let sessionId = await getSessionIdFromHost("localhost:2052");
    if(!sessionId) return console.warn("Session id not found for host ", host)

    let hostInbox = await Client().FetchInbox(host)
    if(!hostInbox?.inbox) return console.warn("Host inbox not found for host ", host)

    for(let item of hostInbox.inbox){
        item.isServer = true;
        item.host = host;
        item.title = host;

        // add it to item obj
        let serverInfo = await fetchServerInfo(host);
        if(serverInfo) item.serverinfo = serverInfo?.serverinfo ?? {};

        // if its there lets set some values
        if(item?.serverinfo?.icon) item.icon = getFixedUrl(host, item.serverinfo.icon);
        if(item?.serverinfo?.name) item.title = item.serverinfo.name;

        await addInboxEntry(item);
    }

    async function addInboxEntry(item){
        if(!item) throw new Error("item not found for adding inbox element");

        let chatId = item.host;
        let chatName = item?.title ?? item?.host
        let latestMessage = `@${chatId}`

        let rawIconUrl = item?.serverinfo?.icon;
        let iconUrl = getFixedUrl(chatId, rawIconUrl) ?? "";

        // check if chat already exists
        let serverChatSelector = getContentElement().querySelector(`.chats .chat[data-gid="${chatId}"]`);
        if(serverChatSelector) serverChatSelector.remove();

        // we need to actually create the fucking html too lol
        getContentElement().querySelector(`.chats`).insertAdjacentHTML("beforeend", `
                <div class="chat" data-gid="${chatId}" data-host="${chatId}" data-server="true">
                    <div class="icon" style="background-image: url('${iconUrl}')"></div>
                    <div class="middle-section">
                        <div class="name">${chatName}</div>
                        ${latestMessage ? `<div class="latestMessage">${latestMessage}</div>` : ""}
                    </div>
                    <div class="badge">5</div>                
                <div>
            `)

        // update variable again then set click handler
        serverChatSelector = getContentElement().querySelector(`.chats .chat[data-gid="${chatId}"]`);
        serverChatSelector?.addEventListener("click", async (e) => {
            renderChat(null, item)
        })
    }
}

function getFixedUrl(host, url){
    if(!host || !url) return;

    return url.startsWith("/uploads") ?
        `${getProtocol(host)}}://${host}${url}` :
        url.startsWith("/") ?
            `${getProtocol(host)}://${host}${url}` : `${getProtocol(host)}://${host}/${url}`
}

function getChats(){
    return {
        "123456789013": {
            protected: {
                timestamp_sent: 1776573992346,
                message: {
                    client_id: "test",
                },
                icon: null,
                name: "someone cool",
                sig: "23urshfdjkshbfsdkf",
                memberGid: "nsdhfioshd7fz==",
                targetGid: "dfjhsiuhfisuzhv=="
            },
            isServer: false,
        }
    };
}

async function loadMessages(){
    renderMessages();

    let clientServers = await Client().GetServers();
    if(clientServers){
        for(let server in clientServers){
            try{
                await fetchServerInbox(server)
            }
            catch{}
        }
    }
}

async function renderMessages(){
    getContentElement().innerHTML =
        `
            <div class="message-container">
                <div class="chats"></div>
                <div class="chat-content">
                </div>
            </div>
        `;

    let chats = await getChats();

    const uniqueChats = Object.values(chats).reduce((acc, chat) => {
        const gid = chat.protected.memberGid;
        if (!acc[gid]) acc[gid] = chat;
        return acc;
    }, {});

    addChatEntries(getContentElement().querySelector(`.chats`))

    async function addChatEntries(element){
        if(!element) throw new Error("Element not found for adding chat element");

        for(let chat of Object.values(uniqueChats)){
            let chatId = chat.protected.memberGid;
            let chatName = chat?.protected?.name ?? "Unkown"
            let latestMessage = chat?.protected.message.client_id // will need to actually decrypt this

            element.insertAdjacentHTML("beforeend", `
                <div class="chat" data-gid="${chatId}" onclick="renderChat('${chatId}')">
                    <div class="icon"></div>
                    <div class="middle-section">
                        <div class="name">${chatName}</div>
                        ${latestMessage ? `<div class="latestMessage">${latestMessage}</div>` : ""}
                    </div>
                    <div class="badge">5</div>                
                <div>
            `)
        }
    }
}

function getChatContentElement(){
    return document.querySelector(`.message-container .chat-content`);
}

async function renderChat(chatId, customChatObject = null){
    let chats = customChatObject ?? await getChats();
    let chat = customChatObject ? null : Object.values(chats).filter(chat => chat.protected.memberGid === chatId);

    if(chat && !chat[0] && !customChatObject) throw new Error("Chat not found");


    await setChatHeader(customChatObject ?? chat[0]);

    getChatContentElement().innerHTML +=
        `
        <div class="content"></div>
        <div class="editor-container"></div>
        `

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


    // display actual messages
    console.log(chat ?? customChatObject)
}

async function setChatHeader(chat){
    let chatTitle = chat?.title ?? chat?.protected?.name ?? "Unkown";
    let chatIcon = chat?.icon ?? chat?.protected?.icon ?? "";

    getChatContentElement().innerHTML =
        `
        <div class="header">
            <div class="icon" style="background-image: url('${chatIcon}')"></div>
            <h1>${chatTitle}</h1>
        </div>`;
}