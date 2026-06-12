let originalUserData = {

}

async function loadAccount(){
    getContentElement().innerHTML =
    `    
        <div class="account-container">
            <h1>${Icon.display("account")}Account Settings</h1>
            <p class="hint">
                If you leave these settings empty they will be automatically set by the server.
            </p>
           
            <div class="settings">
            
            </div>
        </div>
    `

    let nickname = await Client().GetNickname() ?? "";
    let alias = await Client().GetAlias() ?? "";
    let profileUrl = await Client().GetUserIcon() ?? "";
    let consistent = await Client().GetUserConsistentSettings() ?? true;
    let disableInputs = !!consistent === true;

    originalUserData.nickname = nickname;
    originalUserData.alias = alias;
    originalUserData.icon = profileUrl;
    originalUserData.consistent = consistent;

    if(typeof Client().SetNickname === "function" ) {
        getAccountSettingsElement().insertAdjacentElement(
            "beforeend",
            JsonEditor.getSettingElement(nickname, "Display Name", "How others will see you", async (value) => {
                if(originalUserData.nickname !== value){
                    JsonEditor.showSaveButton("nickname", () => {
                        originalUserData.nickname = value
                        saveAccountChanges({
                            name: value
                        });
                    });
                }
                else{
                    JsonEditor.hideSaveButton();
                }
            }, {
                regexMatcher: /^[a-zA-Z0-9_.-]{1,30}$/,
                disabled: disableInputs,
                canBeNull: true,
            })
        )
    }
    else{
        console.error("Setting 'Display Name' not shown because client doesnt support it")
    }

    if(typeof Client().SetUserIcon === "function" ) {
        getAccountSettingsElement().insertAdjacentElement(
            "beforeend",
            JsonEditor.getSettingElement(profileUrl, "Profile Picture", "Enter an URL starting with https://", async (value) => {
                if (originalUserData.icon !== value) {
                    JsonEditor.showSaveButton("profile_url", () => {
                        originalUserData.icon = value
                        saveAccountChanges({
                            icon: value
                        });
                    });
                } else {
                    JsonEditor.hideSaveButton();
                }
            }, {
                regexMatcher: /^https?:\/\/[a-zA-Z0-9.-]+(?:\/[^\s]*)?$/,
                disabled: disableInputs,
                canBeNull: true,
            })
        )
    }
    else{
        console.error("Setting 'Profile Picture' not shown because client doesnt support it")
    }

    if(typeof Client().SetAlias === "function" ) {
        getAccountSettingsElement().insertAdjacentElement(
            "beforeend",
            JsonEditor.getSettingElement(alias, "Messenger Alias",
                `   
                    How people can reach you<br>
                    Current: ${originalUserData?.alias ? `${originalUserData?.alias}@${getHomeSocket().host}` : "none"}
                `
                , async (value) => {
                if(originalUserData.alias !== value && value?.trim()?.length > 0){
                    JsonEditor.showSaveButton("alias", () => {
                        originalUserData.alias = value
                        saveAccountChanges({
                            vanity: value
                        });
                    });
                }
                else{
                    JsonEditor.hideSaveButton();
                }
            }, {
                regexMatcher: /^[a-zA-Z0-9_.-]{1,30}$/,
            })
        )
    }
    else{
        console.error("Setting 'Display Name' not shown because client doesnt support it")
    }

    // check if this feature is supported in whatever client
    if(typeof Client().SetUserConsistentSettings === "function" ){
        getAccountSettingsElement().insertAdjacentElement(
            "beforeend",
            JsonEditor.getSettingElement(consistent, "Sync with servers?", "Automatically update server profiles on connection.", async (value) => {
                if(originalUserData.consistent !== value){
                    JsonEditor.showSaveButton("consistent", () => {
                        originalUserData.consistent = value
                        Client().SetUserConsistentSettings(!!value);
                    });
                }
                else{
                    JsonEditor.hideSaveButton();
                }
            })
        )
    }
    else{
        console.error("Setting 'Consistent?' not shown because client doesnt support it")
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

