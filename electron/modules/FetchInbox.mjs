import Settings from "./settings.js";

export const FetchInbox = async ({ signer, applicationDataDir }, host) => {
    let fetched = await fetch(`http://${host}/inbox/fetch`, {
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
