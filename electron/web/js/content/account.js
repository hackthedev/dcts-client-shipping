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
    let memberIcon = "https://i.pinimg.com/736x/a6/72/05/a67205f60f44c386f4bdfb8fab4d8bed.jpg" ?? getFixedUrl(getHomeSocket().host, await Client().GetUserIcon()) ?? null;
    let memberBanner = "https://assets.ppy.sh/topic-covers/6320/c7490f9d8cba26dcd7fb34f08a211156e311d57ffd470edff68a92832d3a1fd8.gif" ?? getFixedUrl(getHomeSocket().host, await Client().GetUserIcon()) ?? null;
    let homeServer = await getHomeSocket().host;

    let gidAddressShortened = `${ChatTools.Sanitize.truncateText(await getGid(), 6)}@${homeServer}`;
    let gidAddressFull = `${await getGid()}@${homeServer}`;
    let aliasAddress = `${await Client().GetAlias()}@${homeServer}`;

    let memberSignature =
        `
        <center>
            <b>Spread the word of DCTS!</b><br>
            <a target="_blank" href="http://desktop.dcts.community">Desktop Client</a>
            |
            <a target="_blank" href="http://android.dcts.community">Android App</a>
            |
            <a target="_blank" href="http://donate.dcts.community/">Donate</a>
            
            <br><br>
            <i>Lets build the <u>next-gen web</u> of independence!</i>
        </center>
        `

    let memberAlias = await Client().GetAlias() ?
        `<a onclick="navigator.clipboard.writeText('${aliasAddress}')">${aliasAddress}</a>`
        :
        `<a onclick="navigator.clipboard.writeText('${gidAddressFull}')">${gidAddressShortened}</a>`;


    getContentElement().innerHTML =
    `    
        <div class="account-container">            
            <div class="banner" style="--member-banner: url('${memberBanner}')"></div>
            
            <div class="profile-info">
                <div class="icon" style="--member-icon: url('${memberIcon}')"></div>
                
                <div class="details">
                    <h1 class="name">${memberName ?? ""}</h1>
                    <h1 class="alias">${memberAlias ?? ""}</h1>    
                
                    <div class="signature">
                        ${memberSignature ? `${memberSignature}` : ""}
                    </div>
                </div>
            </div>
            
            
            <div class="tab_settings">
                <div class="tabs">
                    <a href="#" id="about" class="selected" onclick="loadAccountTabPageContent('about')">${Icon.display("info")} About</a>
                    <a href="#" id="profile" onclick="loadAccountTabPageContent('profile')">${Icon.display("account")} Profile</a>
                </div>
            </div>
            
            
            <div class="tab_content"></div>
        </div>
    `

    await loadAccountProfileSettings();
}

function clearProfileTabContentHTML(){
    if(getTabContentPage()) getTabContentPage().innerHTML = "";
}

async function loadAccountTabPageContent(page){
    if(!page) return selectPage(loadAccountProfileSettings)
    if(page === "about") return selectPage(loadAccountProfileSettings);
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

