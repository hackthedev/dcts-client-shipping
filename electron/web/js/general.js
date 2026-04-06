function Client() {
    return window?.dcts;
}

function isLauncher() {
    return !!Client();
}

function extractHost(url) {
    if (!url) return null;
    const s = String(url).trim();

    const looksLikeBareIPv6 = !s.includes('://') && !s.includes('/') && s.includes(':') && /^[0-9A-Fa-f:.]+$/.test(s);
    const withProto = looksLikeBareIPv6 ? `https://[${s}]` : (s.includes('://') ? s : `https://${s}`);

    try {
        const u = new URL(withProto);
        const host = u.hostname; // IPv6 returned without brackets
        const port = u.port;
        if (host.includes(':')) {
            return port ? `[${host}]:${port}` : host;
        }
        return port ? `${host}:${port}` : host;
    } catch (e) {
        const re = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?([^:\/?#]+)(?::(\d+))?(?:[\/?#]|$)/i;
        const m = s.match(re);
        if (!m) return null;
        const hostname = m[1].replace(/^\[(.*)\]$/, '$1');
        const port = m[2];
        if (hostname.includes(':')) return port ? `[${hostname}]:${port}` : hostname;
        return port ? `${hostname}:${port}` : hostname;
    }
}

async function connectToServer(address) {
    if (!isLauncher()) return;

    let host = extractHost(address);
    let urlInput = document.getElementById('connectUrl');
    let status = document.getElementById('connectionStatus');

    if (!urlInput) {
        console.warn("Couldnt find connect url field")
        return;
    }

    if (!status) {
        console.warn("Couldnt find status element")
        return;
    }

    // apply status etc
    status.style.marginTop = "20px";
    status.innerText = "connecting...";

    let data = null;
    try {
        // test host
        let testHost = await fetch(`https://${host}/discover`);
        if (testHost.status === 200) {
            data = await testHost.json();
        } else {
            status.innerText = "Host doesnt seem to be a DCTS server";
        }
    } catch (e) {
        console.warn(e)
        status.innerText = "Cant connect to host...";
    }

    await Client().SaveServer(host, data || {})
    window.location.href = `http://${extractHost(address)}/`;
    urlInput.value = "";
}