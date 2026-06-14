import Settings from "./settings.js";

export const GetAlias = async ({ signer, applicationDataDir }) => {
    return await Settings.settings?.user?.alias ?? null;
}
