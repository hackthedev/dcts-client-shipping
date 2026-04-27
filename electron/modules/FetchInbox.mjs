import Settings from "./settings.js";

function getProtocol(host) {
    if (!host) return "https";

    const h = host.toLowerCase();

    if (
        h.includes("localhost") ||
        h.startsWith("127.")
    ) {
        return "http";
    }

    return "https";
}


export const FetchInbox = async ({ signer, applicationDataDir }, host) => {
    let fetched = await fetch(`${getProtocol(host)}://${host}/inbox/fetch`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            publicKey: await signer.getPublicKey(),
            sessionId:  await Settings.Session.getSession(host)
        })
    });
    if(fetched.status === 200) return await fetched.json();
    else console.error(await fetched.json());

    return null;
}
