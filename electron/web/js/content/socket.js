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

let socket = null;
let preferedSocketHost = `localhost:2052`;
connectToSocketHost(preferedSocketHost);


async function connectToSocketHost(address) {
    let socketUrl = `${getProtocol(preferedSocketHost)}://${preferedSocketHost}`;
    if (socket && socket?.connected === true) socket.disconnect()

    socket = io.connect(socketUrl)

    socket.on("connect", async () => {
        if(!window?.didRegisterSocketListeners) registerSocketListeners();
        await socketHello(address)
        window.didRegisterSocketListeners = true;
    });

    return socket
}

async function socketHello(address){
    return new Promise(async (resolve, reject) => {
        socket.emit("/messenger/hello",
            {
                publicKey: await Client().GetPublicKey(),
                sessionId: await getSessionIdFromHost(address)
            },
            async function (response){
                resolve(true)
            })
    })
}

function registerSocketListeners(){
    socket.on("/messenger/receive", async (message) => {

        let myMessage = message[await Client().GenerateGid(await Client().GetPublicKey())]
        let decryptedMessageText = await Client().DecryptData(
            myMessage.method,
            myMessage.encKey,
            myMessage.iv,
            myMessage.tag,
            myMessage.ciphertext
        );

        console.log(decryptedMessageText, myMessage);

    })
}

async function sendMessage(text, targetPublicKey, host){
    if(text?.trim()?.length === 0) throw new Error("no text found to send");
    if(!targetPublicKey) throw new Error("target gid not found");
    if(!host) throw new Error("host not found to send");

    // prepair some shit
    let ownGid = await Client().GenerateGid(await Client().GetPublicKey())
    let targetGid = await Client().GenerateGid(targetPublicKey) + "1";
    let sessionId = await getSessionIdFromHost(host);

    // this creates the message object. payload itself is just temporary
    let payload = {
        message: {
            publicKey: await Client().GetPublicKey(),
            targetPublicKey: await Client().GetPublicKey(),
            timestamp: new Date().getTime(),
            type: "user_message"
        }
    }

    // E2EE !! Could be later updated to do something like participants
    payload.message[ownGid] = await Client().EncryptData(text, await Client().GetPublicKey());
    payload.message[targetGid] = await Client().EncryptData(text, targetPublicKey);

    // super fucking important!!!
    payload.message = await Client().SignJson(payload.message)

    console.log(payload)

    return new Promise((resolve, reject) => {
        socket.emit("/messenger/send", {message: payload.message, sessionId}, async function (response){
            console.log(response)
        })
    })
}