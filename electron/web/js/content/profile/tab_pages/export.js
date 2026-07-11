async function loadExportOptions(){
    // sadly some manual handling again
    getTabContentPage().insertAdjacentHTML("beforeend",
        `
        <div class="signature-setting json-editor-setting">
            <p class="json-editor-setting-headline">Transfer Key</p>
            <div class="json-editor-setting-description" style="margin-bottom: 10px; font-style: italic">
                Tranfer your key that handles login, encryption and more!
            </div>
            
            <button onclick="handleKeyExport()">Export!</button>
            <button onclick="handleKeyImport()">Import!</button>
            
            <div class="key-export-container">
                <div class="qr-code"></div>
                <span class="code"></span>
            </div>
        </div>
    `
    );
}

function getKeyExportContainerElement(){
    return getTabContentPage()?.querySelector('.key-export-container') ?? null;
}

function getQRCodeElement(){
    return getTabContentPage()?.querySelector('.key-export-container .qr-code') ?? null;
}

function getExportCodeElement(){
    return getTabContentPage()?.querySelector('.key-export-container .code') ?? null;
}

async function handleKeyExport(){
    customPrompts.showConfirm({
        title: "Export keys?",
        text: `
            <p>You are about to export your key!</p>
            <p>Your key is used for logins, messaging and more! Never share it with anyone else!</p>
        `
    },
        [
            ["Continue export", "error"],
            ["Cancel", null],
        ],
        async (value) => {
            if(value === "continue export"){
                getEncryptedKey();
            }
        }
    )

    async function getEncryptedKey(){
        let secureCode = crypto.randomUUID()
        let key = await Client().ExportKey(secureCode);

        if(key && getQRCodeElement()){
            new QRCode(getQRCodeElement(), {
                text: JSON.stringify(key),
                correctLevel: QRCode.CorrectLevel.L,
                typeNumber: 40,
            })

            if(!getKeyExportContainerElement()) throw new Error("No key container element found!")

            getExportCodeElement().innerHTML = `
                <p>Your passcode:</p>
                <p>${secureCode}</p>
            `
            getKeyExportContainerElement().style.display = "flex";
        }
    }
}

async function handleKeyImport(){
    // scan qr code?
}