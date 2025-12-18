
export const GetPublicKey = async ({ signer, applicationDataDir }, json) => {
    return signer.getPublicKey();
}
