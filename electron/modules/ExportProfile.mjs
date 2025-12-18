
export const ExportProfile = async ({ signer, applicationDataDir }, serverPublicKey, profileJson) => {
    if(!serverPublicKey) throw new Error('No server public key provided')
    if(!profileJson || profileJson?.trim() === "{}") throw new Error('No profile json provided')

    let serverGid = signer.generateGid(serverPublicKey)
    console.log(serverGid)
}
