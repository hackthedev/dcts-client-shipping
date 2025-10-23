function Client() {
    return window.chrome.webview.hostObjects.dcts;
}

function isLauncher() {
    return !!window.chrome?.webview?.hostObjects?.dcts;
}

async function connectToServer(address){
    if(!isLauncher()) return;
    await Client().NavigateToUrl(address);
}

async function getSavedServers(container){
    if(!isLauncher()) return;
    if(!container) return;

    let serverData = await Client().GetServers();
    let servers = JSON.parse(serverData)

    renderServersList(servers)
}

async function renderServersList(servers) {

    const list = document.querySelector(".serverlistingContainer");
    if (!list) return;
    list.innerHTML = "";

    for(let server in servers){
        let serverObj = servers[server];
        let address = serverObj.Address;
        let serverData = JSON.parse(serverObj.JsonData);

        if (!serverData || serverData.length <= 0) {
            list.innerHTML = "<p>No servers found :(</p>"
            continue;
        }

        const idx = list.children.length;
        if(serverData?.serverinfo?.error && !showOwnerActions) continue;

        const versionText = String(String(serverData.serverinfo?.version).split("")).replaceAll(",", ".");
        const card = document.createElement("div");

        card.className = "server-card";
        card.style.setProperty("--reveal-delay", `${idx * 200}ms`);
        card.innerHTML = `
     <div class="banner" style="background-image:url('${serverData.serverinfo.banner.includes("://") ? serverData.serverinfo.banner : `http://${address}${serverData.serverinfo.banner}`}')">
        <p class="name">${truncateString(serverData.serverinfo.name, 25)}</p>
      </div>


      <div class="about">${sanitizeHtmlForRender(serverData.serverinfo.about)}</div>

      <div class="features">
        <label>Features</label>
        ${serverData.serverinfo.ssl ? `<div id="ssl" class="feature">TLS Encryption</div>` : ""}
        ${serverData.serverinfo.tenor ? `<div id="tenor" class="feature">Tenor GIFs</div>` : ""}
        ${serverData.serverinfo.turn ? `<div id="turn-vc" class="feature">VC</div>` : ""}
        ${serverData.serverinfo.turn ? `<div id="turn-ss" class="feature">Screensharing</div>` : ""}
        <div class="feature">Version ${versionText}</div>
      </div>

      <div class="footer">
        ${serverData.serverinfo.slots.online} / ${serverData.serverinfo.slots.limit} Online • ${serverData.serverinfo.slots.reserved} reserved
        <a class="joinButton" href="http://${address}">Join</a>
      </div>
    `;
        list.appendChild(card);
        const aboutEl = card.querySelector(".about");
        setTimeout(() => card.classList.add("reveal"), idx * 200);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    getSavedServers(document.querySelector('.serverlistingContainer'));
});

function truncateString(value, length) {
    // should update it at some point to use .substring instead lol was easier when i think about it
    if (typeof value === "string" && value.length > 0 && length > 0) {
        let splitted = value.split("")
        let newText = "";

        let difference = value.length - length;
        let iterateLength = 0;

        if (difference <= 0) iterateLength = value.length;
        if (difference > 0) iterateLength = value.length - difference;

        for (let i = 0; i < iterateLength; i++) {
            newText += `${splitted[i]}`
        }

        if (iterateLength !== value.length) {
            newText += "..";
        }

        return newText;
    }

    return value;
}