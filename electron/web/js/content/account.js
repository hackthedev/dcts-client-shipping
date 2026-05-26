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
    let profileUrl = await Client().GetUserIcon() ?? "";
    let consistent = false;
    originalUserData.nickname = nickname;
    originalUserData.icon = profileUrl;
    originalUserData.consitent = consistent;

    getAccountSettingsElement().insertAdjacentElement(
        "beforeend",
        JsonEditor.getSettingElement(nickname, "Display Name", "How others will see you", async (value) => {
            if(originalUserData.nickname !== value){
                JsonEditor.showSaveButton(() => {
                    console.log("hi " , value)
                    originalUserData.nickname = value
                });
            }
            else{
                JsonEditor.hideSaveButton();
            }
        }, /^[a-zA-Z0-9_.-]{1,30}$/)
    )

    getAccountSettingsElement().insertAdjacentElement(
        "beforeend",
        JsonEditor.getSettingElement(nickname, "Display Name", "How others will see you", async (value) => {
            if(originalUserData.nickname !== value){
                JsonEditor.showSaveButton(() => {
                    console.log("hi " , value)
                    originalUserData.nickname = value
                });
            }
            else{
                JsonEditor.hideSaveButton();
            }
        }, /^[a-zA-Z0-9_.-]{1,30}$/)
    )

    getAccountSettingsElement().insertAdjacentElement(
        "beforeend",
        JsonEditor.getSettingElement(consistent, "Consistent?", "Automatically update server profiles on connect with these settings.", async (value) => {
            if(originalUserData.consistent !== value){
                JsonEditor.showSaveButton(() => {
                    console.log("hi " , value)
                    originalUserData.consistent = value
                });
            }
            else{
                JsonEditor.hideSaveButton();
            }
        }, /^[a-zA-Z0-9_.-]{1,30}$/)
    )
}

function getAccountSettingsElement(){
    return getContentElement()?.querySelector(".account-container .settings");
}

