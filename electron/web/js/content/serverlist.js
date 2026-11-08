async function lazyFetchAndUpdateServerCard(address) {
    let serverCard = getServerCardElementFromAddress(address)

    let serverObj = await fetchServerInfo(address);
    if(!serverObj) return;

    let rawBannerUrl = serverObj?.banner ?? serverObj?.home?.banner_url;
    let bannerUrl = null;

    if (rawBannerUrl?.startsWith("/upload"))  bannerUrl = `https://${extractHost(address)}${rawBannerUrl}`;
    if(rawBannerUrl?.startsWith("https://")) bannerUrl = rawBannerUrl;

    setServerCardName(serverCard, serverObj?.name ?? address)
    setServerCardAbout(serverCard, serverObj?.home?.about ?? "")
    setServerCardBanner(serverCard, bannerUrl)
    setServerOnline(serverCard, serverObj)
    setServerCardFeatures(serverCard, getServerCardFeaturesHTML(serverObj))
}

function getServerCardElementFromAddress(address) {
    if (!address) throw new Error("No address provided");
    return document.querySelector(`.layout > .content-container > .content > .serverList .server-card[address="${address}"]`)
}

function setServerCardAbout(serverCardElement, about) {
    serverCardElement.querySelector(".about").innerHTML = about
}

function setServerCardBanner(serverCardElement, url) {
    serverCardElement.querySelector(".banner").style.backgroundImage = `url('${url}')`;
}

function setServerOnline(serverCardElement, serverObj) {
    serverCardElement.querySelector(".footer .online").textContent =
        `${serverObj?.slots?.online ? 
            encodePlainText(serverObj?.slots?.online) : "0"} / ${encodePlainText(serverObj?.slots?.limit)} Online • 
            ${encodePlainText(serverObj?.slots?.reserved)} reserved`;
}

function setServerCardName(serverCardElement, name) {
    serverCardElement.querySelector(".banner .name").textContent = name;
}

function setServerCardFeatures(serverCardElement, html){
    serverCardElement.querySelector(".features").innerHTML = html
}

async function fetchServerInfo(address){
    try{
        let res = await fetch(`${getProtocol(address)}://${extractHost(address)}/discover`, {
            signal: AbortSignal.timeout(2000) // hehe
        })

        if(res.status !== 200) return console.warn("Discovery check failed for host ", address);

        let jsonData = await res.json();
        localStorage.setItem(`serverinfo_cache_${address}`, JSON.stringify(jsonData))

        return jsonData?.serverinfo ?? jsonData?.error
    }
    catch(err){
        console.warn(err)
        return await (await Client().GetChat(address))?.data ?? JSON.parse(localStorage.getItem(`serverinfo_cache_${address}`)) ?? null;
    }
}

async function getServerCardFeaturesHTML(serverObj) {
    const versionText = encodePlainText(String(serverObj?.version || "?"));
    let isHomeServer = await isLauncher() ? await Client().GetHomeServer() === address : false

    return `
            ${serverObj?.voip === true ? `<div id="turn-vc" class="feature" title="Voice chat suported">${Icon.display("mic")}</div>` : ""}
            ${serverObj?.voip === true ? `<div id="turn-ss" class="feature" title="Screensharing supported">${Icon.display("screenshare")}</div>` : ""}
            <div class="feature" title="Version ${versionText}">${Icon.display("tag")}</div>
            <div onclick="setHomeServer('${safeAddress}')" id="turn-ss" class="feature ${isHomeServer ? `home-server`: ""}" title="${isHomeServer ? "Your home server" : "Set as home server" }">${Icon.display("star")}</div>
    `
}