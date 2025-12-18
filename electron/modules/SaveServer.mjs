import * as path from "node:path";
import * as fs from "node:fs";

export const SaveServer = async ({ signer, applicationDataDir }, jsonObject) => {
    let serversFilePath = path.join(applicationDataDir, "servers.json");
    if(!fs.existsSync(serversFilePath)){
        fs.writeFileSync(serversFilePath, "{}");
    }

    // server address not set so we dont save it
    if(!jsonObject.address) return;

    // continue saving shit
    let servers = JSON.parse(fs.readFileSync(serversFilePath) || "{}");
    if(!servers[jsonObject.address]) servers[jsonObject.address] = {};
    servers[jsonObject.address].address = jsonObject.address;
    servers[jsonObject.address].isFav = jsonObject.isFav;

    // update file too best case (mind blowing)
    fs.writeFileSync(serversFilePath, JSON.stringify(servers));
}
