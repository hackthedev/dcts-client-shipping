import Settings from "./settings.js";

export const GetUserBanner = async ({ signer, applicationDataDir }) => {
    return await Settings.settings.user.banner ?? null;
}
