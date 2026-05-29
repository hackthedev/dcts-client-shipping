import Settings from "./settings.js";

export const GetUserConsistentSettings = async ({ signer, applicationDataDir }) => {
    return Settings?.settings?.user?.consistent ?? true;
}
