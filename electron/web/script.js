async function getSavedServers(container) {
    if (!isLauncher()) return;
    if (!container) return console.warn("No container supplied!");

    container.innerHTML = `<div class="serverList"></div>`

    let servers = await Client().GetServers();
    renderServersList(container.querySelector(".serverList"), servers)
}

async function renderServersList(container, servers) {

    const list = container;
    if (!list) return;
    list.innerHTML = "";

    for (let server in servers) {
        let serverObj = servers[server];
        let address = server;
        let isFav = serverObj?.fav;

        let serverInfoRequest = null;
        let serverInfoJson = null;

        if (!serverObj || serverObj.length <= 0) {
            list.innerHTML = "<p>No servers found :(</p>"
            continue;
        }

        const idx = list.children.length;
        if (serverObj?.serverinfo?.error && !showOwnerActions) continue;

        const versionText = encodePlainText(String(String(serverObj?.serverinfo?.version || "?").split("")).replaceAll(",", "."));
        const card = document.createElement("div");

        card.className = "server-card";
        card.setAttribute("address", address)
        card.style.setProperty("--reveal-delay", `${idx * 200}ms`);

        card.innerHTML = `
             <div class="banner" style="background-image:url('${serverObj?.serverinfo?.banner?.includes("://") ? serverObj.serverinfo.banner : `https://${address}${serverObj?.serverinfo?.banner}`}')">
                <p class="name">${encodePlainText(truncateString(serverObj?.serverinfo?.name || address, 25))}</p>
              </div>        
        
              <div class="about">${sanitizeHtmlForRender(serverObj?.serverinfo?.about)}</div>
                           
              <div class="features">
                <label>Features</label>
                <div class="list">
                    ${serverObj?.serverinfo?.voip === true ? `<div id="turn-vc" class="feature">VC</div>` : ""}
                    ${serverObj?.serverinfo?.voip === true ? `<div id="turn-ss" class="feature">Screensharing</div>` : ""}
                    <div class="feature">Version ${versionText}</div>
                </div>
              </div>
        
              <div class="footer">
                ${serverObj?.serverinfo?.slots?.online ? encodePlainText(serverObj?.serverinfo?.slots?.online) : "0"} / ${encodePlainText(serverObj?.serverinfo?.slots?.limit)} Online • ${encodePlainText(serverObj?.serverinfo?.slots?.reserved)} reserved
                                
                <div class="buttons">
                    <a class="joinButton" href="http://${address}">Join</a>
                    <a class="joinButton delete" onclick="deleteServer('${extractHost(address)}')"">&#128465;</a>
                </div>
                
              </div>
            `;

        list.appendChild(card);

        // if no data found fetch it async but DONT wait for it
        if(Object.keys(serverObj?.serverinfo ?? {})?.length === 0){
            lazyFetchAndUpdateServerCard(address)
        }

        setTimeout(() => card.classList.add("reveal"), idx * 200);
    }
}

async function deleteServer(ip) {
    await Client().DeleteServer(ip)
    getSavedServers(document.querySelector('.serverlistingContainer'))
}

document.addEventListener('DOMContentLoaded', async () => {
    ensureDomPurify();
    buildNavHTML(true);
    getSavedServers(getContentElement())
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