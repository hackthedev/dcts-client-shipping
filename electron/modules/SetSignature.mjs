import Settings from "./settings.js";

export const SetSignature = async ({ signer, applicationDataDir }, signatureHTML) => {
    if(signatureHTML === undefined) throw new Error("signatureHTML wasnt set")
    Settings.settings.user.signature = signatureHTML;
    await Settings.saveSettings()
}
