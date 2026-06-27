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

async function loadAccount(host, identifier){
    if(!identifier && !host){
        identifier = await getGid();
        host = await getHomeSocket().host;
    }

    let isServer = false
    if(host === identifier) isServer = true

    if(!identifier) throw new Error("Couldnt load profile cauz no identifier was set")
    if(!host) throw new Error("Couldnt load profile cauz no host was set")

    let userDataObj = isServer ?
        await Client().GetServer(host)?.serverinfo ?? await fetchServerInfo(host)
    :
        (await getUserProfileData(host, identifier))?.target;

    // some heavy fuckery.
    let homeServer = isServer ? host : userDataObj?.home_server;
    let gid = isServer ? host : await getGid(userDataObj?.publicKey);
    let gidAddressShortened = isServer ? host : `${ChatTools.Sanitize.truncateText(gid, 6)}@${homeServer}`;
    let gidAddressFull = isServer ? host : `${gid}@${homeServer}`;
    let aliasAddress = isServer ? host : `${userDataObj?.vanity}@${homeServer}`;
    let memberSignature = isServer ? userDataObj?.about : userDataObj?.profile?.signature ?? null;

    let memberIcon = getFixedUrl(homeServer, isServer ? userDataObj?.icon : userDataObj?.profile?.icon) ?? null;
    let memberBanner = getFixedUrl(homeServer, isServer ? userDataObj?.banner : userDataObj?.profile?.banner) ?? null;
    let memberName = isServer ? userDataObj?.name : userDataObj?.profile?.name ?? `${ChatTools.Sanitize.truncateText(gid, 6)}`  ?? null;

    let memberAlias = userDataObj?.vanity ?
        `<a onclick="navigator.clipboard.writeText('${aliasAddress}')">${aliasAddress}</a>`
        :
        `<a onclick="navigator.clipboard.writeText('${gidAddressFull}')">${gidAddressShortened}</a>`;

    let isMyAccount = await getGid() === await getGid(userDataObj?.publicKey) && userDataObj?.publicKey && !isServer;

    // allow some highly specific styling
    ChatTools.Sanitize.SANITIZE_OPTIONS.ALLOWED_TAGS.push("center")

    getContentElement().innerHTML =
    `    
        <div class="account-container" data-gid="${ChatTools.Sanitize.stripHTML(gid)}">            
            <div class="banner" id="banner" onclick="uploadAccountImage(this)" style="--member-image: url('${ChatTools.Sanitize.stripHTML(memberBanner)}')">
                <span class="back" onclick="renderMessages()">${Icon.display("back")}</span>
            </div>
            
            <div class="profile-info">
                <div class="icon" id="icon" onclick="uploadAccountImage(this)" style="--member-image: url('${ChatTools.Sanitize.stripHTML(memberIcon)}')"></div>
                
                <div class="details">
                    <h1 class="name">
                        ${ChatTools.Sanitize.stripHTML(memberName) ?? ""}
                    
                        <div class="actions">
                            ${ !isServer ? `
                            <span class="message" onclick="startNewChatFromProfile('${ChatTools.Sanitize.stripHTML(gidAddressFull)}')">${Icon.display("message")}</span>
                            ` : ""}
                            
                            ${ isServer ? `
                            <span class="message" title="This is a server, not a user.">${Icon.display("server")}</span>
                            ` : ""}
                            
                        </div>
                    </h1>
                    
                    <h1 class="alias">${ChatTools.Sanitize.forRender(memberAlias) ?? ""}</h1>    
                
                    ${memberSignature ? 
                        `
                        <div class="signature">
                            ${ChatTools.Sanitize.forRender(memberSignature, false)}
                        </div>
                        
                        ` : ""}                    
                </div>
            </div>
            
            
            ${ isMyAccount ? `
            <div class="tab_settings">
                <div class="tabs">
                    <a href="#" id="general" class="selected" onclick="loadAccountTabPageContent('general')">${Icon.display("info")} General</a>
                    
                </div>
            </div>
            ` : ""}
            
            
            <div class="tab_content"></div>
        </div>
    `

    if(isMyAccount){
        await loadAccountProfileSettings();
    }

    showNavigation();
}

function startNewChatFromProfile(gid){
    if(!gid) throw new Error("Couldnt start chat from profile cauz gid was missing")
    startNewChat({
        identifier: gid,
        automate: true
    })
}

async function uploadAccountImage(element){
    if(!element) throw new Error("No element found")
    if(!element?.id) throw new Error("No element id found")

    // only allow uploads when actually viewing own profile
    let parent = element.closest(".account-container");
    if(!parent || parent?.getAttribute("data-gid") !== await getGid()) return;

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

        if(element.id === "icon") {
            await Client().SetUserIcon(uploadedUrl)
            await saveAccountChanges({
                icon: uploadedUrl,
            })
        }
        if(element.id === "banner") {
            await Client().SetUserBanner(uploadedUrl)
            await saveAccountChanges({
                banner: uploadedUrl,
            })
        }

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
    banner = undefined,
    signature = undefined,
    icon = undefined,
    name = undefined,
    vanity = undefined,
                                  }){

    let payload = {
        profile: {}
    }
    if(name !== undefined) payload.profile.name = name;
    if(icon !== undefined) payload.profile.icon = icon;
    if(vanity !== undefined) payload.vanity = vanity;
    if(banner !== undefined) payload.profile.banner = banner;
    if(signature !== undefined) payload.profile.signature = signature;

    let result = await socketHello(getHomeSocket(), getHomeSocket().host, {...payload})
    if(result?.error){
        alert(result?.error);
    }
    else{
        if(payload?.vanity) Client().SetAlias(vanity);
        if(payload?.profile?.name) Client().SetNickname(name);
        if(payload?.profile?.icon) Client().SetUserIcon(icon);
        if(payload?.profile?.banner) Client().SetUserBanner(banner);
        if(payload?.profile?.signature) Client().SetSignature(signature);
    }
}

function getAccountSettingsElement(){
    return getContentElement()?.querySelector(".account-container .settings");
}

