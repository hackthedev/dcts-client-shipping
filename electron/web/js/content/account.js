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
                        Client().SetNickname(value);
                        saveAccountChanges();
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
                        Client().SetUserIcon(value);
                        saveAccountChanges();
                    });
                } else {
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
                        Client().SetAlias(value);
                        saveAccountChanges();
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
            JsonEditor.getSettingElement(consistent, "Consistent?", "Automatically update server profiles on connect with these settings.", async (value) => {
                if(originalUserData.consistent !== value){
                    JsonEditor.showSaveButton("consistent", () => {
                        originalUserData.consistent = value
                        Client().SetUserConsistentSettings(!!value);
                        saveAccountChanges();
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

async function saveAccountChanges(){
    await socketHello(getHomeSocket(), getHomeSocket().host, {
        name: await Client().GetNickname(),
        icon: await Client().GetUserIcon(),
        alias: await Client().GetAlias(),
    })
}

function getAccountSettingsElement(){
    return getContentElement()?.querySelector(".account-container .settings");
}

