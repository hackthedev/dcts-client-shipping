
export const SignJson = async ({ signer, applicationDataDir }, json) => {
    await signer.signJson(json);
    return json;
}
