function getNavElement(){
    return document.querySelector(`.layout > .content-container .navigation`)
}

async function buildNavHTML(initial = false){
    getNavElement().innerHTML =
        `
        <div class="entry ${initial === true ? "selected" : ""}" onclick="selectNavEntry(this);getSavedServers(getContentElement())">
            ${Icon.display("server")}
            <span>Servers</span>
        </div>
        
        ${isLocal() ? `
            <div class="entry chats" onclick="selectNavEntry(this);loadMessages()">
                ${Icon.display("message")}
                <span>Chats</span>
                <span class="badge">0</span>
            </div>
            
            <div class="entry" onclick="selectNavEntry(this);loadAccount()">
                ${Icon.display("account")}
                <span>Settings</span>
            </div>
        ` : ""}
        
        `;
}

function getNavEntryElement(index = 0){
    if(index == null) throw new Error("index was not set");
    if(isNaN(index)) throw new Error("index was not a number");

    let entries = document.querySelectorAll(`.layout > .content-container .navigation > .entry`);
    if(!entries) throw new Error("no navigation entry elements found");

    if(index > entries?.length) throw new Error("index was bigger than entries");

    return entries[index];
}

function selectNavEntry(targetEntry){
    if(!targetEntry) throw new Error("No element passed");

    let entries = getNavElement().querySelectorAll(`.entry`)

    entries.forEach(entry => {
        if(entry.classList.contains("entry")) entry.classList.remove("selected");
    })

    targetEntry.classList.add("selected");
}

function getSelectedNavEntry(){
    return getNavElement().querySelector(`.entry.selected`) ?? null;
}