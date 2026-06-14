import Settings from "./settings.js";

export const GetUserIcon = async ({ signer, applicationDataDir }) => {
    return await Settings.settings.user.icon ?? null;
}
