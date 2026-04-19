async function getMessagesFromServers(){
    let servers = await Client().GetServers()
    console.log(servers)
}

async function fetchServerInbox(host) {
    /*try {
        const creds = await getAccountCredentials(host);
        if (!creds) return null;

        const response = await fetch(`https://${host}/inbox/fetch`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id: creds?.id ?? null,
                token: creds?.token ?? null
            })
        });

        const jsonString = await response.text();
        console.log("response code:", response.status);
        console.log("response json:", jsonString);

        if (!response.ok) return null;

        const result = JSON.parse(jsonString);
        return result?.inbox || [];
    } catch (e) {
        console.error("fetchInbox error", e);
        return null;
    }

     */
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
        },
        "123456789033": {
            protected: {
                timestamp_sent: 1776573992346,
                message: {
                    client_id: null,
                },
                icon: null,
                name: "some cool shit",
                sig: "23urshfdjk1shbfsdkf",
                memberGid: "nsdfhfioshd7fz==",
                targetGid: "dfjhsiuhfisuzhv=="
            },
            isServer: false,
        }
    };
}

async function loadMessages(){
    renderMessages();
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

async function renderChat(chatId){
    let chats = await getChats();
    let chat = Object.values(chats).filter(chat => chat.protected.memberGid === chatId);

    if(chat[0]){
        await setChatHeader(chat[0]);
    }

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
}

async function setChatHeader(chat){
    let chatTitle = chat?.protected?.name ?? "Unkown";

    getChatContentElement().innerHTML =
        `
        <div class="header">
            <div class="icon" style="background-image: url('${chat.protected.icon}')"></div>
            <h1>${chatTitle}</h1>
        </div>`;
}