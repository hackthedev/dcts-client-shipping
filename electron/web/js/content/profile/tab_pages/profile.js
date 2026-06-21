async function loadAccountProfileSettings(){
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
        getTabContentPage().insertAdjacentElement(
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
                canBeNull: true,
            })
        )
    }
    else{
        console.error("Setting 'Display Name' not shown because client doesnt support it")
    }

    if(typeof Client().SetUserIcon === "function" ) {
        getTabContentPage().insertAdjacentElement(
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
                canBeNull: true,
            })
        )
    }
    else{
        console.error("Setting 'Profile Picture' not shown because client doesnt support it")
    }

    if(typeof Client().SetAlias === "function" ) {
        getTabContentPage().insertAdjacentElement(
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
        getTabContentPage().insertAdjacentElement(
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