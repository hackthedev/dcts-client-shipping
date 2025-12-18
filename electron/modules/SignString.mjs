
export const SignString = async ({ signer, applicationDataDir }, text) => {
    return await signer.signString(text);
}
