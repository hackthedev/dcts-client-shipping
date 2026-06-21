let originalUserData = {

}

function getAccountContainerElement(){
    return getContentElement().querySelector('.account-container') ?? null;
}

function getTabContentPage(){
    return getAccountContainerElement().querySelector('.tab_content') ?? null;
}

function getTabNavTabs(){
    return getAccountContainerElement().querySelectorAll('.tab_settings .tabs a') ?? null;
}

async function loadAccount(identifier){
    //if(!identifier) throw new Error("Couldnt load profile cauz no identifier was set")


    // let account = request to server to lookup profile table....
    // then .... fill info below. for now hardcoded to local acc

    let memberName = await Client().GetNickname() ?? null;

    // temporary hardcoded
    let memberIcon = getFixedUrl(getHomeSocket().host, await Client().GetUserIcon()) ?? null;
    let memberBanner = getFixedUrl(getHomeSocket().host, await Client().GetUserBanner()) ?? null;
    let homeServer = await getHomeSocket().host;

    let gidAddressShortened = `${ChatTools.Sanitize.truncateText(await getGid(), 6)}@${homeServer}`;
    let gidAddressFull = `${await getGid()}@${homeServer}`;
    let aliasAddress = `${await Client().GetAlias()}@${homeServer}`;
    let memberSignature = await Client().GetSignature();

    let memberAlias = await Client().GetAlias() ?
        `<a onclick="navigator.clipboard.writeText('${aliasAddress}')">${aliasAddress}</a>`
        :
        `<a onclick="navigator.clipboard.writeText('${gidAddressFull}')">${gidAddressShortened}</a>`;


    getContentElement().innerHTML =
    `    
        <div class="account-container">            
            <div class="banner" id="banner" onclick="uploadAccountImage(this)" style="--member-image: url('${memberBanner}')"></div>
            
            <div class="profile-info">
                <div class="icon" id="icon" onclick="uploadAccountImage(this)" style="--member-image: url('${memberIcon}')"></div>
                
                <div class="details">
                    <h1 class="name">${memberName ?? ""}</h1>
                    <h1 class="alias">${memberAlias ?? ""}</h1>    
                
                
                
                    ${memberSignature ? 
                        `
                        <div class="signature">
                            ${memberSignature}
                        </div>
                        
                        ` : ""}                    
                </div>
            </div>
            
            
            <div class="tab_settings">
                <div class="tabs">
                    <a href="#" id="general" class="selected" onclick="loadAccountTabPageContent('general')">${Icon.display("info")} General</a>
                    
                </div>
            </div>
            
            
            <div class="tab_content"></div>
        </div>
    `

    await loadAccountProfileSettings();
}

async function uploadAccountImage(element){
    if(!element) throw new Error("No element found")
    if(!element?.id) throw new Error("No element id found")

    let file = await FileManager.pickFile(".png,.jpg,.gif,.webm,.jpeg");
    if(!file) return;

    let homeServerAddress = await getHomeSocket().host;
    let homeServerProtocol = getProtocol(homeServerAddress);
    let addressFinished = `${homeServerProtocol}://${homeServerAddress}`;

    let uploaded = await FileManager.uploadFile(file, {
        authObj: {
            "x-session-id": encodeURIComponent(await getSessionIdFromHost(await getHomeSocket().host)),
            "x-public-key": encodeURIComponent(await Client().GetPublicKey()),
        },
        host: addressFinished
    })

    let uploadedUrl = null;
    if(uploaded?.ok === true){
        uploadedUrl = getFixedUrl(homeServerAddress, uploaded.path);

        if(element.id === "icon") await Client().SetUserIcon(uploadedUrl)
        if(element.id === "banner") await Client().SetUserBanner(uploadedUrl)

        element.style.setProperty("--member-image", `url("${uploadedUrl}")`);
    }
}

function clearProfileTabContentHTML(){
    if(getTabContentPage()) getTabContentPage().innerHTML = "";
}

async function loadAccountTabPageContent(page){
    if(!page) return selectPage(loadAccountProfileSettings)
    if(page === "general") return selectPage(loadAccountProfileSettings);
    selectPage(clearProfileTabContentHTML)

    async function selectPage(callback){

        let tabs = getTabNavTabs();
        tabs.forEach(tab => {
            if(tab?.id === page) if(!tab.classList.contains("selected")) tab.classList.add("selected");
            if(tab?.id !== page) if(tab.classList.contains("selected")) tab.classList.remove("selected");
        })
        if(callback) await callback();
    }
}

async function saveAccountChanges({
    icon = undefined,
    name = undefined,
    vanity = undefined,
                                  }){

    let payload = {}
    if(name !== undefined) payload.name = name;
    if(icon !== undefined) payload.icon = icon;
    if(vanity !== undefined) payload.vanity = vanity;
    if(icon !== undefined) payload.icon = icon;

    let result = await socketHello(getHomeSocket(), getHomeSocket().host, {...payload})
    if(result?.error){
        alert(result?.error);
    }
    else{
        if(payload?.vanity) Client().SetAlias(vanity);
        if(payload?.name) Client().SetNickname(name);
        if(payload?.icon) Client().SetUserIcon(icon);
    }
}

function getAccountSettingsElement(){
    return getContentElement()?.querySelector(".account-container .settings");
}

