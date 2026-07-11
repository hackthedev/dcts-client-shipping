
export const ExportKey = async ({ signer, applicationDataDir }, code) => {
    if(!code || code?.length < 24) throw new Error("Export code is not secure enough!");

    let privateKey = await signer.getPrivateKey();
    let encrypted = await signer.encrypt(privateKey, code);
    privateKey = null;

    return encrypted
}
