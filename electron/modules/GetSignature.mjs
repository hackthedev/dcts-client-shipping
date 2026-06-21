import Settings from "./settings.js";

export const GetSignature = async ({ signer, applicationDataDir }) => {
    return await Settings.settings?.user?.signature ?? null;
}
