const {
    app,
    BrowserWindow,
    ipcMain,
    screen,
    nativeImage,
    session,
    desktopCapturer,
    Notification,
    net,
} = require("electron");


const express = require("express")
const cors = require("cors")

const path = require("path");
const fs = require("node:fs");
const Settings = require("./modules/settings");

const FrontendLibs = require("@hackthedev/frontend-libs").default;
let libDir = path.join(path.resolve(), "web", "js", "libs");


let win = null;
const applicationDataDir = path.join(app.getPath("documents"), "dcts");
const profilePath = path.join(applicationDataDir, "profiles");

if (!fs.existsSync(applicationDataDir)) fs.mkdirSync(applicationDataDir);
if (!fs.existsSync(profilePath)) fs.mkdirSync(profilePath);


let server = null

function startLocalServer() {
    return new Promise((resolve) => {
        const web = express()
        const publicDir = path.join(__dirname, "web")

        web.use(cors({
            origin: "*"
        }))
        web.use(express.static(publicDir))

        server = web.listen(0, "127.0.0.1", () => {
            const { port } = server.address()
            resolve(`http://127.0.0.1:${port}`)
        })
    })
}



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
    // installing multiple packages
    const results = await FrontendLibs.installMultiple([
        { package: '@hackthedev/icons@1.0.6', path: libDir },
        { package: '@hackthedev/mobile-ui@latest', path: libDir },
        { package: '@hackthedev/prompts@latest', path: libDir },
        { package: '@hackthedev/rich-editor', path: libDir },
        { package: '@hackthedev/chat-tools@1.0.0', path: libDir },
    ]);

    results.forEach((r) => {
        if(r?.success || r?.skipped){
            console.log(r?.message)
        }
        else{
            console.error(r?.message)
        }
    });


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
            webviewTag: true,
            additionalArguments: ["--appdata=" + applicationDataDir],
        },
    });

    win.webContents.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    win.setIcon(nativeImage.createFromPath(path.join(__dirname, "logo.ico")));

    await restoreWindowBounds(win, width, height);
    registerWindowBoundsPersistence(win);

    //remove X-Frame-Options headers on all incoming requests.
    win.webContents.session.webRequest.onHeadersReceived(
        { urls: ["*://*/*"] },
        (details, callback) => {
            if (details && details.responseHeaders) {
                if (details.responseHeaders["X-Frame-Options"]) {
                    delete details.responseHeaders["X-Frame-Options"]
                } else if (details.responseHeaders["x-frame-options"]) {
                    delete details.responseHeaders["x-frame-options"]
                }
            }
            callback({ cancel: false, responseHeaders: details.responseHeaders })
        }
    )

    let localUrl = await startLocalServer();
    await win.loadURL(localUrl)
    //win.loadFile(path.join(__dirname, "web/index.html"));
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
    await Settings.initSettings(applicationDataDir);

    // youtube embed fix — header spoofing
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ['*://*.youtube.com/*', '*://*.googlevideo.com/*', '*://*.ytimg.com/*'] },
        (details, callback) => {
            details.requestHeaders['Referer'] = 'https://www.youtube.com'
            details.requestHeaders['Origin'] = 'https://www.youtube.com'
            callback({ requestHeaders: details.requestHeaders })
        }
    )

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

    app.on("will-quit", async (e) => {
        e.preventDefault();

        await Settings.Client.setLastOnline();
        await Settings.saveSettings()

        app.exit();
    });
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