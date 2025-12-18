const { contextBridge } = require("electron")
const fs = require("fs/promises")
const path = require("path")
const { pathToFileURL } = require("url")
const { dSyncSign } = require("@hackthedev/dsync-sign")

const arg = process.argv.find(a => a.startsWith("--appdata="))
const applicationDataDir = arg.split("=")[1]
const bridgeDir = path.join(__dirname, "modules")

const exposed = {}
let signer = null

function getSigner() {
    if (!signer) {
        signer = new dSyncSign(path.join(applicationDataDir, "privatekey.json"))
    }
    return signer
}

async function loadModules() {
    const files = await fs.readdir(bridgeDir)
    const entries = files.filter(f => f.endsWith(".mjs") && !f.includes("template.mjs"))

    for (const file of entries) {
        const start = Date.now()
        const mod = await import(pathToFileURL(path.join(bridgeDir, file)).href)
        const duration = Date.now() - start

        console.log(`[preload] ${file} loaded in ${duration}ms`)

        for (const [name, fn] of Object.entries(mod)) {
            if (typeof fn !== "function") continue

            exposed[name] = async (...args) => {
                return await fn(
                    { signer: getSigner(), applicationDataDir },
                    ...args
                )
            }
        }
    }
}

loadModules().then(() => {
    contextBridge.exposeInMainWorld("dcts", exposed)
})
