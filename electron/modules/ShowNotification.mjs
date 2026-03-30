import { ipcRenderer } from "electron";

export const ShowNotification = async ({ signer, applicationDataDir }, json) => {
    return ipcRenderer.invoke("show-notification", {
        title: json.title || "dcts",
        text: json.text || "",
        icon: json.icon || null,
    });
};