const fs = require("fs/promises")
const path = require("path")

class Settings {
    static settingsPath = null
    static settings = {}
    static _loaded = false
    static _writeQueue = Promise.resolve()

    static Server = class {
        static async save(id, data, isFav = null) {
            if (!id) throw new Error("id is required")
            await Settings._ensureLoaded()

            Settings.settings.servers ??= {}
            Settings.settings.servers[id] ??= {}

            Object.assign(Settings.settings.servers[id], data)
            if (isFav !== null) Settings.settings.servers[id].fav = isFav

            await Settings.saveSettings()
        }

        static async getServer(id) {
            await Settings._ensureLoaded()
            return Settings.settings.servers?.[id] ?? null
        }

        static async getServers() {
            await Settings._ensureLoaded()
            return Settings.settings.servers ?? {}
        }

        static async deleteServer(id) {
            await Settings._ensureLoaded()
            if (!Settings.settings.servers) return
            delete Settings.settings.servers[id]
            await Settings.saveSettings()
        }
    }

    static initSettings(appDataDir) {
        this.settingsPath = path.join(appDataDir, "settings.json")
    }

    static async _ensureLoaded() {
        if (this._loaded) return
        try {
            const data = await fs.readFile(this.settingsPath, "utf8")
            this.settings = JSON.parse(data)
        } catch {
            this.settings = {}
        }
        this._loaded = true
    }

    static async saveSettings() {
        this._writeQueue = this._writeQueue.then(async () => {
            const tmp = this.settingsPath + ".tmp"
            await fs.writeFile(tmp, JSON.stringify(this.settings, null, 2))
            await fs.rename(tmp, this.settingsPath)
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
