import Settings from "./settings.js";

export const GetNickname = async ({ signer, applicationDataDir }) => {
    return await Settings.settings?.user?.nickname ?? null;
}
