const {
    app,
    BrowserWindow,
    ipcMain,
    screen,
    nativeImage,
    session,
    desktopCapturer,
    Notification,
    net
} = require("electron");
const path = require("path");
const fs = require("node:fs");
const Settings = require("./modules/settings");


let win = null;
const applicationDataDir = path.join(app.getPath("documents"), "dcts");
const profilePath = path.join(applicationDataDir, "profiles");

if (!fs.existsSync(applicationDataDir)) fs.mkdirSync(applicationDataDir);
if (!fs.existsSync(profilePath)) fs.mkdirSync(profilePath);

const windowKey = "window.bounds";

async function restoreWindowBounds(win, fallbackWidth, fallbackHeight) {
    const bounds = await Settings.getSetting(windowKey, null);
    if (!bounds) return;

    win.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width ?? fallbackWidth,
        height: bounds.height ?? fallbackHeight,
    });
}

function registerWindowBoundsPersistence(win) {
    const save = async () => {
        await Settings.saveSetting(windowKey, win.getBounds());
    };

    win.on("close", save);
}

async function createWindow(width, height) {
    win = new BrowserWindow({
        width,
        height,
        icon: path.join(__dirname, "logo.ico"),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            nodeIntegrationInSubFrames: true,
            sandbox: false,
            devTools: true,
            additionalArguments: ["--appdata=" + applicationDataDir],
        },
    });

    win.setIcon(nativeImage.createFromPath(path.join(__dirname, "logo.ico")));

    await restoreWindowBounds(win, width, height);
    registerWindowBoundsPersistence(win);

    win.loadFile(path.join(__dirname, "web/index.html"));
}

ipcMain.on("navigate", (e, url) => {
    if (!/^https?:\/\//.test(url)) url = "https://" + url;
    win.loadURL(url);
});

const isLinux = process.platform === "linux";

app.setName("DCTS Chat");
app.setAppUserModelId("DCTS");
app.commandLine.appendSwitch("ozone-platform-hint", "auto");
app.commandLine.appendSwitch(
    "enable-features",
    [
        "WebRTCPipeWireCapturer",
        "AcceleratedVideoEncoder",
        "AcceleratedVideoDecoder",
        ...(isLinux
            ? [
                "AcceleratedVideoDecodeLinuxGL",
                "AcceleratedVideoDecodeLinuxZeroCopyGL",
            ]
            : []),
    ].join(","),
);

app.whenReady().then(async () => {
    Settings.initSettings(applicationDataDir);

    const primaryDisplay = screen.getPrimaryDisplay();
    const {width, height} = primaryDisplay.workAreaSize;

    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        desktopCapturer
            .getSources({types: ["window", "screen"]})
            .then((sources) => {
                callback({video: sources[0]});
            });
    })

    await createWindow(
        1080,
        720
    );
});


ipcMain.handle("show-notification", async (event, json) => {
    const options = {
        title: json.title,
        body: json.text,
    };

    if (json.icon) {
        try {
            const resp = await net.fetch(json.icon);
            const buffer = Buffer.from(await resp.arrayBuffer());
            options.icon = nativeImage.createFromBuffer(buffer);
        } catch (e) {
            // no pic so we ignore that shit
        }
    }

    const notif = new Notification(options);
    notif.show();
});

module.exports = {
    applicationDataDir,
    profilePath
}