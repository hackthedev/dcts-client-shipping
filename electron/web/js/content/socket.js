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

function getChatSocket() {
    return sockets.get("remote")
        ?? [...sockets.values()][0]
        ?? null;
}

function getHomeSocket() {
    return [...sockets.values()].find(socket => socket?.isHomeServer === true)
        ?? null;
}

async function getSocket(host) {
    host = extractHost(host);

    let homeServer = extractHost(await Client().GetHomeServer());
    let socketKey = host === homeServer ? host : "remote";

    if (sockets.has(socketKey)) {
        let existingSocket = sockets.get(socketKey);

        if (socketKey === "remote" && existingSocket.host !== host) {
            existingSocket.disconnect();
            sockets.delete(socketKey);
        } else {
            return existingSocket;
        }
    }

    let socket = io.connect(`${getProtocol(host)}://${host}`, {
        reconnection: true
    });

    socket.host = host;
    socket.isHomeServer = host === homeServer;

    sockets.set(socketKey, socket);

    socket.on("connect", async () => {
        await socketHello(socket, host);
        console.log(`Connected to host ${host} via socket`);
    });

    return socket;
}

function terminateSocket(address) {
    address = extractHost(address);

    let socket = sockets.get(address);
    if (!socket) return false;

    socket.disconnect();
    sockets.delete(address);

    return true;
}

async function connectToSocketHost(address) {
    if(typeof Client().GetHomeServer !== "function") {
        throw new Error("Socket Connection canceled due to unsupported client");
    }

    let socket = await getSocket(address);

    socket.on("connect", async () => {
        if(!socket.didRegisterSocketListeners) {
            registerSocketListeners(socket);
            socket.didRegisterSocketListeners = true;
        }

        await socketHello(socket, address);
    });

    return socket;
}

async function socketHello(socket, address){
    if(typeof Client().GetHomeServer !== "function") throw new Error("Socket Connection canceled due to unsupported client")

    return new Promise(async (resolve, reject) => {
        socket.emit("/messenger/hello",
            {
                publicKey: await Client().GetPublicKey(),
                sessionId: await getSessionIdFromHost(address),
                home_server: await Client().GetHomeServer()
            },
            async function (response){
                if(response?.error) console.error(response?.error);
                resolve(true)
            })
    })
}

async function registerSocketListeners(socket){
    socket.on("/messenger/receive", async (message) => {
        let myMessage = message[await Client().GenerateGid(await Client().GetPublicKey())]
        message.messageId = message.timestamp;
        await Client().SaveChatMessage(message?.author?.gid, message)

        if(message?.type === "user_message") await renderUserMessage(message, getInnerChatContentElement())
    })
}

async function decryptUserMessage(message){
    if(!message) throw new Error("Message was not set");

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

async function sendMessage(text, targetPublicKey, host, test = false){
    if(text?.trim()?.length === 0) throw new Error("no text found to send");
    if(!targetPublicKey) throw new Error("target gid not found");
    if(!host) throw new Error("host not found to send");

    // prepair some shit
    let ownGid = await Client().GenerateGid(await Client().GetPublicKey())
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
        (await getChatSocket()).emit("/messenger/send", {message: payload.message, sessionId}, async function (response){
            resolve(response)
        })
    })
}