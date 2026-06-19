async function waitForSocket(socket) {
    return new Promise((resolve, reject) => {
        if (socket.connected) {
            return resolve(socket);
        }

        const onConnect = () => {
            cleanup();
            resolve(socket);
        };

        const onError = (err) => {
            cleanup();
            reject(err);
        };

        function cleanup() {
            socket.off("connect", onConnect);
            socket.off("connect_error", onError);
        }

        socket.on("connect", onConnect);
        socket.on("connect_error", onError);
    });
}

const sockets = new Map();
let activeChatHost = null;

async function getSocket(host) {
    host = extractHost(host);
    if (!host) throw new Error("host is required");

    if (sockets.has(host)) return sockets.get(host);

    let socket = io.connect(`${getProtocol(host)}://${host}`, {
        reconnection: true
    });

    socket.host = host;
    socket.isHomeServer = extractHost(await Client().GetHomeServer()) === host;

    socket.on("connect", async () => {
        console.log(`connected to ${host}`);
        await socketHello(socket, host);

        if (!socket.didRegisterSocketListeners) {
            registerSocketListeners(socket);
            socket.didRegisterSocketListeners = true;
        }
    });

    socket.on("disconnect", () => {
        sockets.delete(host);
        if (activeChatHost === host) activeChatHost = null;
    });

    sockets.set(host, socket);
    return socket;
}

async function setChatSocket(host) {
    host = extractHost(host);
    let socket = await getSocket(host);
    await waitForSocket(socket);

    activeChatHost = host;
    return socket;
}

async function getChatSocket(host = null) {
    if (host) return await getSocket(extractHost(host));
    if (activeChatHost) return sockets.get(activeChatHost) ?? null;
    return null;
}

function getHomeSocket() {
    return [...sockets.values()].find(s => s?.isHomeServer === true) ?? null;
}

function terminateSocket(host) {
    host = extractHost(host);
    let socket = sockets.get(host);
    if (!socket) return false;

    socket.disconnect();
    sockets.delete(host);
    if (activeChatHost === host) activeChatHost = null;

    return true;
}

async function connectToSocketHost(address) {
    if (typeof Client().GetHomeServer !== "function") {
        throw new Error("Socket Connection canceled due to unsupported client");
    }

    let socket = await getSocket(address);

    socket.on("connect", async () => {
        if (!socket.didRegisterSocketListeners) {
            registerSocketListeners(socket);
            socket.didRegisterSocketListeners = true;
        }

        await socketHello(socket, address);
    });

    return socket;
}

async function socketHello(socket, address, {
                               name = null,
                               icon = null,
                               vanity = null,
                           } = {}
) {
    if (typeof Client().GetHomeServer !== "function") throw new Error("Socket Connection canceled due to unsupported client")
    if (typeof Client().GetPublicKey !== "function") throw new Error("Socket Connection canceled due to unsupported client")

    return new Promise(async (resolve, reject) => {
        socket.emit("/messenger/hello",
            {
                publicKey: await Client().GetPublicKey(),
                sessionId: await getSessionIdFromHost(address),
                home_server: await Client().GetHomeServer(),
                name,
                icon,
                vanity,
            },
            async function (response) {
                if (response?.error) {
                    console.error(response?.error);
                }

                resolve({
                    response,
                    error: response?.error,
                });
            })
    })
}

async function registerSocketListeners(socket) {
    socket.on("/messenger/receive", async (message) => {
        message.messageId = message.timestamp;

        let authorGid = message?.author?.gid;
        let authorPublicKey = message?.author?.publicKey;
        let authorHomeServer = message?.author?.home_server;

        let ownGid = await getGid();

        // if we are the author, save under the target — otherwise save under the author
        let targetGid = message?.targetIdentifier
            ? await Client().GenerateGid(message.targetIdentifier)
            : null;

        let chatGid = authorGid === ownGid ? targetGid : authorGid;
        if (!chatGid) return console.error("could not determine chat partner gid", message);

        // make sure the chat exists before saving any message
        let existingChat = await Client().GetChat(chatGid)
        if (!existingChat) {
            await Client().SaveChat(chatGid, {
                publicKey: authorGid === ownGid ? message.targetIdentifier : authorPublicKey,
                gid: chatGid,
                title: `@${chatGid}`,
                host: authorHomeServer,
                home_server: authorHomeServer,
                lastMessage: null,
                icon: null,
            });
        }

        // update the chat entry in the sidebar so the latest message and badge show up
        await Client().SaveChatMessage(chatGid, message)
        await refreshChatEntry(chatGid, message);

        if (message?.type === "user_message") await renderUserMessage({
            item: message,
            element: getInnerChatContentElement(chatGid),
            chatId: chatGid,
            notify: true,
        })
    })
}

async function decryptUserMessage(message) {
    if (!message) throw new Error("Message was not set");
    if(typeof message === "string" && message.startsWith("{")) message = JSON.parse(message);

    if (!message?.method) throw new Error("Message method not found");

    let decryptedMessageText = await Client().DecryptData(
        message.method,
        message.encKey,
        message.iv,
        message.tag,
        message.ciphertext
    );

    message.messageId = message.timestamp;

    return decryptedMessageText;
}

async function sendMessage(text, targetPublicKey, host, test = false) {
    if (text?.trim()?.length === 0) throw new Error("no text found to send");
    if (!targetPublicKey) throw new Error("target gid not found");
    if (!host) throw new Error("host not found to send");

    // prepair some shit
    let ownGid = await getGid();
    let targetGid = await Client().GenerateGid(targetPublicKey);
    let sessionId = await getSessionIdFromHost(host);

    // this creates the message object. payload itself is just temporary
    let timestamp = new Date().getTime();
    let payload = {
        message: {
            author: {
                gid: await Client().GenerateGid(await Client().GetPublicKey()),
                publicKey: await Client().GetPublicKey(),
                home_server: await Client().GetHomeServer(),
            },
            targetIdentifier: targetPublicKey,
            timestamp,
            messageId: timestamp,
            type: "user_message",
            test,
        }
    }

    // E2EE !! Could be later updated to do something like participants
    payload.message[ownGid] = await Client().EncryptData(text, await Client().GetPublicKey());
    payload.message[targetGid] = await Client().EncryptData(text, targetPublicKey);

    // super fucking important!!!
    payload.message = await Client().SignJson(payload.message)

    return await new Promise(async (resolve, reject) => {
        (await getChatSocket(host)).emit("/messenger/send", {
            message: payload.message,
            sessionId
        }, async function (response) {
            resolve(response)
        })
    })
}