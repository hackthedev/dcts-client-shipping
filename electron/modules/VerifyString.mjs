
export const VerifyString = async ({ signer, applicationDataDir }, text, sig, key) => {
    return await signer.verifyString(text, sig, key);
}
