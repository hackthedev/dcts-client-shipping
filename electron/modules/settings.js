const fs = require("fs/promises")
const fsNormal = require("fs")
const path = require("path")

class Settings {
    static settingsPath = null
    static appDataDir = null;
    static settings = {}
    static _loaded = false
    static _writeQueue = Promise.resolve()
    static runtimeData = {}

    static Client = class {
        static async getLastOnline() {
            await Settings._ensureLoaded()

            Settings.settings.client ??= {}
            return Settings.settings?.client?.lastOnline ?? 0
        }
    }

    static Session = class {
        static async saveSession(id, session) {
            if (!id) throw new Error("id is required")
            await Settings._ensureLoaded()

            Settings.settings.sessions ??= {}
            Settings.settings.sessions[id] = session

            await Settings.saveSettings()
        }

        static async getSession(id) {
            if (!id) return null
            await Settings._ensureLoaded()
            return Settings.settings.sessions?.[id] ?? null
        }

        static async getSessions() {
            await Settings._ensureLoaded()
            return Settings.settings.sessions ?? {}
        }

        static async deleteSession(id) {
            await Settings._ensureLoaded()
            if (!Settings.settings.sessions) return
            delete Settings.settings.sessions[id]
            await Settings.saveSettings()
        }
    }

    static Message = class {
        static async saveChat(chatId, data = {}) {
            if (!chatId) throw new Error("chatId is required")
            if (Object.keys(data || {}).length === 0) throw new Error("data was empty")

            let chatMessagesPath = path.join(Settings.appDataDir, "chats", chatId, "messages")
            let chatConfigPath = path.join(Settings.appDataDir, "chats", chatId, "config.json")

            // if the directory doesnt exist create it.
            // we use the chatMessagePath here because that will also create the chatPath path
            // as we use "recursive: true"
            if (!fsNormal.existsSync(chatMessagesPath)) {
                fsNormal.mkdirSync(chatMessagesPath, { recursive: true });
            }

            // always overwrite the config so it stays up to date
            Settings.runtimeData.chats ??= {};
            Settings.runtimeData.chats[chatId] = data;
            await fs.writeFile(chatConfigPath, JSON.stringify(data, null, 4));

            Settings.settings.client ??= {}
            Settings.settings.client.lastOnline = new Date().getTime();
            await Settings.saveSettings()
        }

        static async getChat(chatId) {
            if (!chatId) return null
            let chatConfigPath = path.join(Settings.appDataDir, "chats", chatId, "config.json")

            Settings.runtimeData.chats ??= {};
            if(fsNormal.existsSync(chatConfigPath)) {
                if(Settings.runtimeData.chats[chatId]) return Settings.runtimeData.chats[chatId];
                return JSON.parse(await fs.readFile(chatConfigPath, "utf8") ?? {})
            }
            else{
                return null
            }
        }

        static async getChats() {
            let chatsPath = path.join(Settings.appDataDir, "chats")

            // create it if it doesnt exist
            if(!fsNormal.existsSync(chatsPath)) fsNormal.mkdirSync(chatsPath, { recursive: true })
            let chatIds = await fs.readdir(chatsPath);

            let chats = {}
            Settings.runtimeData.chats ??= {};

            if(chatIds?.length > 0){
                for(let chatId of chatIds){

                    // if already in ram use that instead
                    if(Settings.runtimeData.chats[chatId]){
                        chats[chatId] = Settings.runtimeData.chats[chatId];
                        continue;
                    }

                    let chatConfigPath = path.join(Settings.appDataDir, "chats", chatId, "config.json")
                    let chatConfig = JSON.parse(await fs.readFile(chatConfigPath, "utf8") ?? {})

                    chats[chatId] = chatConfig;
                }

                return chats;
            }
            else{
                return {}
            }
        }

        static async saveMessage(chatId, messageId, data = {}) {
            if (!chatId) throw new Error("chatId is required")
            if (!messageId) throw new Error("messageId is required")
            if(!data) throw new Error("data is required")

            let messagesPath = path.join(Settings.appDataDir, "chats", chatId, "messages");
            if(!fsNormal.existsSync(messagesPath)) fsNormal.mkdirSync(messagesPath, { recursive: true });

            await fs.writeFile(path.join(messagesPath, `${messageId}.json`), JSON.stringify(data, null, 4));

            Settings.settings.client ??= {}
            Settings.settings.client.lastOnline = new Date().getTime();
            await Settings.saveSettings()
        }

        static async getMessage(chatId, messageId) {
            if (!chatId || !messageId) return null
        }

        static async getChatLastMessage(chatId) {
            if (!chatId) return null;

            let messages = await this.getMessages(chatId, new Date().getTime(), true);
            messages = Object.values(messages);

            if(messages.length === 0) return null;

            messages.sort((a, b) => {
                return (b?.timestamp ?? 0) - (a?.timestamp ?? 0);
            });

            return messages[0] ?? null;
        }

        static async getMessages(chatId, timestamp = new Date().getTime(), desc = true) {
            if (!chatId) return {}
            let limit = 50;

            let messagesPath = path.join(Settings.appDataDir, "chats", chatId, "messages")

            if(!fsNormal.existsSync(messagesPath)) fsNormal.mkdirSync(messagesPath, { recursive: true })

            let messageIds = await fs.readdir(messagesPath);
            let messages = []

            for(let messageId of messageIds){
                let messageFile = path.join(messagesPath, messageId)
                let messageConfig = JSON.parse(await fs.readFile(messageFile, "utf8") ?? "{}")

                let createdAt = messageConfig?.timestamp ?? 0

                if(desc && createdAt >= timestamp) continue
                if(!desc && createdAt <= timestamp) continue

                messages.push({
                    id: messageId,
                    timestamp: createdAt,
                    data: messageConfig
                })
            }

            messages.sort((a, b) => {
                if(desc) return b.timestamp - a.timestamp
                return a.timestamp - b.timestamp
            })

            messages = messages.slice(0, limit)

            let result = {}

            for(let message of messages){
                result[message.id] = message.data
            }

            return result
        }

        static async deleteMessage(chatId, messageId) {
            // this _may_ needs to be implemented.
            // it doesnt really make sense per se-
            // at least in terms of "clients can modify the client to never delete"
            if (!chatId || !messageId) return
        }

        static async deleteChat(chatId) {
            // 100% needs to be implemented and should be added to the server too
            if (!chatId) return
        }

        static async getChatsUnread() {
            let chats = await this.getChats();
            let unreadChats = {};

            for (let chatId of Object.keys(chats)) {
                let chat = chats[chatId];
                let lastMessage = await this.getChatLastMessage(chatId);

                if (!lastMessage) continue;

                let lastRead = chat?.lastRead ?? 0;
                let lastMessageTimestamp = lastMessage?.timestamp ?? lastMessage?.createdAt ?? 0;

                if (lastMessageTimestamp > lastRead) {
                    unreadChats[chatId] = {
                        ...chat,
                        lastMessage
                    };
                }
            }

            return unreadChats;
        }
    }

    static Server = class {
        static async save(id, data = {}, isFav = null) {
            if (!id) throw new Error("id is required")
            await Settings._ensureLoaded()

            Settings.settings.servers ??= {}
            Settings.settings.servers[id] ??= {}

            if(typeof data === "object"){
                Object.assign(Settings.settings.servers[id], data)
            }
            else{
                Object.assign(Settings.settings.servers[id], {})
            }

            if (isFav !== null) Settings.settings.servers[id].fav = isFav

            await Settings.saveSettings()
        }

        static async setHomeServer(address) {
            if (!address) throw new Error("address is required")

            await Settings._ensureLoaded()

            Settings.settings.homeServer = address

            await Settings.saveSettings()
        }

        static async getHomeServer() {
            await Settings._ensureLoaded()

            const id = Settings.settings.homeServer
            if (!id) return null

            return id ?? null
        }

        static async getHomeServerId() {
            await Settings._ensureLoaded()

            return Settings.settings.homeServer ?? null
        }

        static async clearHomeServer() {
            await Settings._ensureLoaded()

            delete Settings.settings.homeServer

            await Settings.saveSettings()
        }

        static async getServer(id) {
            await Settings._ensureLoaded()
            return Settings.settings.servers?.[id] ?? null
        }

        static async getServers() {
            await Settings._ensureLoaded()

            // if no server was found return the official one so that there is a default server.
            // the client will automatically fetch the latest info since its not provided in the
            // object below
            return Settings.settings.servers ?? {
                "chat.network-z.com": { }
            }
        }

        static async deleteServer(id) {
            await Settings._ensureLoaded()
            if (!Settings.settings.servers) return

            delete Settings.settings.servers[id]

            if (Settings.settings.homeServer === id) {
                delete Settings.settings.homeServer
            }

            await Settings.saveSettings()
        }
    }

    static async initSettings(appDataDir) {
        this.settingsPath = path.join(appDataDir, "settings.json")
        this.appDataDir = appDataDir
        await this._ensureLoaded();
    }

    static async _ensureLoaded() {
        if (this._loaded) return
        try {
            const data = await fs.readFile(this.settingsPath, "utf8")
            this.settings = JSON.parse(data)
            this.settings.user ??= {}
        } catch {
            this.settings = {}
        }
        this._loaded = true
    }

    static async saveSettings() {
        const snapshot = structuredClone(this.settings)

        this._writeQueue = this._writeQueue
            .catch(() => {})
            .then(async () => {
                const disk = JSON.parse(
                    await fs.readFile(this.settingsPath, "utf8").catch(() => "{}")
                )

                const settings = { ...disk, ...snapshot }
                const tmp = `${this.settingsPath}.${process.pid}.tmp`

                await fs.mkdir(path.dirname(this.settingsPath), { recursive: true })
                await fs.writeFile(tmp, JSON.stringify(settings, null, 2), "utf8")
                await fs.rename(tmp, this.settingsPath)

                this.settings = { ...settings, ...this.settings }
            })

        return this._writeQueue
    }


    static async saveSetting(key, value) {
        await this._ensureLoaded()
        this.settings[key] = value
        await this.saveSettings()
    }

    static async getSetting(key, defaultValue = null) {
        await this._ensureLoaded()
        return this.settings[key] ?? defaultValue
    }
}

module.exports = Settings
