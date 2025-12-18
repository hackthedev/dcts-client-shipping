
export const GenerateGid = async ({ signer, applicationDataDir }, publicKeyString) => {
    return signer.generateGid(publicKeyString)
}
