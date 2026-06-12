function Client() {
    const client = window?.dcts;
    if (!client) return null;

    if (typeof client.getPlatform === "function" && client.getPlatform() === "android") {
        const wrapper = {};


        for (const key in client) {
            const value = client[key];

            if (typeof value === "function") {
                wrapper[key] = (...args) => {
                    try {
                        return client[key](...args);
                    } catch (e) {
                        console.error("ANDROID METHOD FAILED:", key);
                        console.error("ARGS:", args);
                        console.error("ERROR:", e);
                        throw e;
                    }
                };
            } else {
                wrapper[key] = value;
            }
        }

        wrapper.SignJson = async obj => {
            const res = client.SignJson(JSON.stringify(obj));
            return res ? JSON.parse(res) : null;
        };

        wrapper.VerifyJson = async (obj, publicKey) => {
            const res = client.VerifyJson(JSON.stringify(obj), publicKey);
            return res === "true" || res === true;
        };

        wrapper.SaveServer = async (address, isFav) => {
            return client.SaveServer(String(address), Boolean(isFav));
        };

        wrapper.GetServer = async address => {
            const res = client.GetServer(String(address));
            return res ? JSON.parse(res) : null;
        };

        // Messenger functions
        wrapper.GetChatMessages = async (chatId, timestamp, desc) => {
            const res = client.GetChatMessages(
                String(chatId),
                timestamp == null ? "null" : String(timestamp),
                desc == null ? "true" : String(desc)
            );

            return res ? JSON.parse(res) : null;
        };

        wrapper.GetChats = async () => {
            const res = client.GetChats();
            return res ? JSON.parse(res) : null;
        };

        wrapper.GetChat = async (chatId) => {
            const res = client.GetChat(String(chatId));
            return res ? JSON.parse(res) : null;
        };

        wrapper.GetChatLastMessage = async (chatId) => {
            const res = client.GetChatLastMessage(String(chatId));
            return res ? JSON.parse(res) : null;
        };

        wrapper.SaveChatMessage = async (chatId, messageObj) => {
            return client.SaveChatMessage(String(chatId), JSON.stringify(messageObj));
        };

        return wrapper;
    }

    return client;
}

function isLauncher() {
    return !!Client();
}

function getProtocol(host) {
    if (!host) return "https";
    const h = host.toLowerCase();

    if (
        h.includes("localhost") ||
        h.startsWith("127.")
    ) {
        return "http";
    }

    return "https";
}

function extractHost(url) {
    if (!url) return null;
    const s = String(url).trim();

    const looksLikeBareIPv6 = !s.includes('://') && !s.includes('/') && s.includes(':') && /^[0-9A-Fa-f:.]+$/.test(s);
    const withProto = looksLikeBareIPv6 ? `https://[${s}]` : (s.includes('://') ? s : `https://${s}`);

    try {
        const u = new URL(withProto);
        const host = u.hostname; // IPv6 returned without brackets
        const port = u.port;
        if (host.includes(':')) {
            return port ? `[${host}]:${port}` : host;
        }
        return port ? `${host}:${port}` : host;
    } catch (e) {
        const re = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?([^:\/?#]+)(?::(\d+))?(?:[\/?#]|$)/i;
        const m = s.match(re);
        if (!m) return null;
        const hostname = m[1].replace(/^\[(.*)\]$/, '$1');
        const port = m[2];
        if (hostname.includes(':')) return port ? `[${hostname}]:${port}` : hostname;
        return port ? `${hostname}:${port}` : hostname;
    }
}

async function connectToServer(address) {
    if(!address) throw new Error('Missing address');
    if (!isLauncher()) return;

    let host = extractHost(address);

    let data = null;
    try {
        // test host
        let testHost = await fetch(`${getProtocol(host)}://${host}/discover`);
        if (testHost.status === 200) {
            data = await testHost.json();
        } else {
            status.innerText = "Host doesnt seem to be a DCTS server";
        }
    } catch (e) {
        console.warn(e)
        status.innerText = "Cant connect to host...";
    }

    await Client().SaveServer(host, data || {})
    window.location.href = `https://${host}/`;
}