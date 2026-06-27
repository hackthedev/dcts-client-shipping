async function getUserProfileData(host, identifier){
    if(!host) throw new Error("Missing host");
    if(!identifier) throw new Error("Missing identifier");

    let userData = await fetch(`${getProtocol(host)}://${host}/messenger/profile/${identifier}`, {
        signal: AbortSignal.timeout(5000)
    });

    return userData?.json() ?? {};
}

async function loadAccountProfileSettings(identifier) {
    let nickname = await Client().GetNickname() ?? "";
    let alias = await Client().GetAlias() ?? "";
    let profileUrl = await Client().GetUserIcon() ?? "";
    let consistent = await Client().GetUserConsistentSettings() ?? true;
    let disableInputs = !!consistent === true;

    originalUserData.nickname = nickname;
    originalUserData.alias = alias;
    originalUserData.icon = profileUrl;
    originalUserData.consistent = consistent;

    if (typeof Client().SetNickname === "function") {
        getTabContentPage().insertAdjacentElement(
            "beforeend",
            JsonEditor.getSettingElement(nickname, "Display Name", "How others will see you", async (value) => {
                if (originalUserData.nickname !== value) {
                    JsonEditor.showSaveButton("nickname", () => {
                        originalUserData.nickname = value
                        saveAccountChanges({
                            name: value
                        });
                    });
                } else {
                    JsonEditor.hideSaveButton();
                }
            }, {
                regexMatcher: /^[a-zA-Z0-9_. -]{1,30}$/,
                canBeNull: true,
            })
        )
    } else {
        console.error("Setting 'Display Name' not shown because client doesnt support it")
    }

    if (typeof Client().SetAlias === "function") {
        getTabContentPage().insertAdjacentElement(
            "beforeend",
            JsonEditor.getSettingElement(alias, "Messenger Alias",
                `   
                    How people can reach you<br>
                    Current: ${originalUserData?.alias ? `${originalUserData?.alias}@${getHomeSocket().host}` : "none"}
                `
                , async (value) => {
                    if (originalUserData.alias !== value && value?.trim()?.length > 0) {
                        JsonEditor.showSaveButton("alias", () => {
                            originalUserData.alias = value
                            saveAccountChanges({
                                vanity: value
                            });
                        });
                    } else {
                        JsonEditor.hideSaveButton();
                    }
                }, {
                    regexMatcher: /^[a-zA-Z0-9_.-]{1,30}$/,
                })
        )
    } else {
        console.error("Setting 'Display Name' not shown because client doesnt support it")
    }

    // check if this feature is supported in whatever client
    if (typeof Client().SetUserConsistentSettings === "function") {
        getTabContentPage().insertAdjacentElement(
            "beforeend",
            JsonEditor.getSettingElement(consistent, "Sync with servers?", "Automatically update server profiles on connection.", async (value) => {
                if (originalUserData.consistent !== value) {
                    JsonEditor.showSaveButton("consistent", () => {
                        originalUserData.consistent = value
                        Client().SetUserConsistentSettings(!!value);
                    });
                } else {
                    JsonEditor.hideSaveButton();
                }
            })
        )
    } else {
        console.error("Setting 'Consistent?' not shown because client doesnt support it")
    }


    // sadly some manual handling again
    getTabContentPage().insertAdjacentHTML("beforeend",
        `
        <div class="signature-setting json-editor-setting">
            <p class="json-editor-setting-headline">Signature</p>
            <div class="json-editor-setting-description" style="margin-bottom: 10px; font-style: italic">
                The signature shown on your profile (supporting HTML tags)
            </div>
            
            <textarea rows="10" class="signature-editor">${ChatTools.Sanitize.encodePlainText(await Client().GetSignature() ?? "")}</textarea>
        </div>
    `
    );

    let sigEditor = getTabContentPage().querySelector(".signature-editor");
    let originalSignature = await Client().GetSignature() ?? "";

    sigEditor.addEventListener("input", () => {
        if (sigEditor.value !== originalSignature) {
            JsonEditor.showSaveButton("signature", () => {
                Client().SetSignature(sigEditor.value);
                originalSignature = sigEditor.value;
                saveAccountChanges({
                    signature: sigEditor.value
                });
            });
        } else {
            JsonEditor.hideSaveButton();
        }
    });
}