
export const VerifyJson = async ({ signer, applicationDataDir }, json, key) => {
    return await signer.verifyJson(json, key);
}
