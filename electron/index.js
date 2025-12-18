const { app, BrowserWindow, ipcMain, globalShortcut, screen, nativeImage } = require("electron")
const path = require("path")
const fs = require("node:fs");

let win = null
const applicationDataDir = path.join(app.getPath("documents"), "dcts")
const profilePath = path.join(applicationDataDir, "profiles");

// create appdata dir if it doesnt exist yet
if(!fs.existsSync(applicationDataDir)){
    fs.mkdirSync(applicationDataDir)
}

if(!fs.existsSync(profilePath)){
    fs.mkdirSync(profilePath)
}

function getScreenWidthPercent(percent, width){
    return Number(width / 100 * percent)
}

function getScreenHightPercent(percent, height){
    return Number(height / 100 * percent)
}

function createWindow(width, height) {
    win = new BrowserWindow({
        width,
        height,
        icon: path.join(__dirname, "icon.png"),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            devTools: true,
            additionalArguments: [
                "--appdata=" + applicationDataDir
            ]
        }
    })

    win.setIcon(nativeImage.createFromPath(
        path.join(__dirname, "icon.png")
    ));

    win.loadFile(path.join(__dirname, "web/index.html"))
}

ipcMain.on("navigate", (e, url) => {
    if (!/^https?:\/\//.test(url)) url = "https://" + url
    win.loadURL(url)
})

app.whenReady().then(() => {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    createWindow(getScreenWidthPercent(70, width), getScreenHightPercent(70, height))
})


