class JsonEditor {
    static showSaveButton(key, callback) {
        let existing = document.querySelector(".json-editor-save-bar");

        if (existing) {
            existing._saveCallbacks ??= new Map();
            existing._saveCallbacks.set(key, callback);
            return;
        }

        const bar = document.createElement("div");
        bar.classList.add("json-editor-save-bar");
        bar._saveCallbacks = new Map();
        bar._saveCallbacks.set(key, callback);

        bar.innerHTML = `
            <span>Unsaved changes</span>
            <button class="btn-save">Save Changes</button>
        `;

        bar.querySelector(".btn-save").addEventListener("click", async () => {
            for (const cb of bar._saveCallbacks.values()) {
                await cb?.();
            }

            JsonEditor.hideSaveButton();
        });

        document.body.appendChild(bar);
    }

    static hideSaveButton() {
        document.querySelector(".json-editor-save-bar")?.remove();
    }

    static getSettingElement(jsonKey, displayName, description, onChange = null,
                             {
                                 regexMatcher = null,
                                 canBeNull = false,
                                 disabled = false,
                             } = {}
    ) {
        if (jsonKey === undefined) throw new Error("No json key provided!");

        let element = document.createElement("div")
        element.style.display = "flex";
        element.style.flexDirection = "column";
        element.style.width = "100%";
        element.style.margin = "10px 0";
        element.style.flexShrink = "1";
        element.style.flexWrap = "wrap";
        element.style.userSelect = "none";
        element.classList.add("json-editor-setting");

        element.innerHTML = `
            <hr style="width: 100%; ">
            <div style="display: flex; color: white;flex-wrap: wrap;max-width: 100%;">
                <div style="max-width: 300px;">
                    <p class="json-editor-setting-headline" style="font-weight: bold">${displayName ? displayName : jsonKey}</p>
                    ${description ? `<div class="json-editor-setting-description" style="margin-bottom: 10px; font-style: italic">${description}</div>` : ""}
                </div>
                
                <div class="json-editor-inputs" style="margin-left: auto;">
                    ${this.getInputHTMLBasedOnType(jsonKey, disabled)}
                    <div class="json-editor-error" style="display:none;color:#ff5555;font-size:12px;margin-top:4px;"></div>
                </div>
            </div>            
        `

        element.onclick = (e) => {
            let tagName = e.target.tagName.toLowerCase();
            if (tagName === "button") return;
            if (tagName === "input") return;

            let inputs = element.querySelectorAll("input");
            if (inputs?.length === 1) {
                if (inputs[0].type === "checkbox") {
                    inputs[0].checked = !inputs[0].checked;
                    inputs[0].dispatchEvent(new Event("input", {bubbles: true}));
                    return;
                }

                inputs[0].focus()
            }
        }

        element.addEventListener("input", e => {
            if (Array.isArray(jsonKey)) {
                const inputs = element.querySelectorAll(".json-editor-array-item input");
                const values = [];

                inputs.forEach(i => {
                    if (i.type === "number") {
                        if (i.value === "") return;
                        values.push(Number(i.value));
                        return;
                    }

                    if (i.type === "checkbox") {
                        values.push(i.checked);
                        return;
                    }

                    if (i.value === "" || i.value === null) return;
                    values.push(i.value);
                });

                onChange?.(values);
                return;
            }


            // so this is cool because we can "auto validate" shit and show an error.
            let value =
                e.target.type === "number" ? Number(e.target.value) :
                    e.target.type === "checkbox" ? e.target.checked :
                        e.target.value;

            if (canBeNull && e.target.type === "text" && value.trim() === "") {
                const errorElement = element.querySelector(".json-editor-error");

                e.target.classList.remove("json-editor-input-error");

                if (errorElement) {
                    errorElement.textContent = "";
                    errorElement.style.display = "none";
                }

                onChange?.(null);
                return;
            }

            if (regexMatcher && (e.target.type === "text" || e.target.type === "number")) {
                const regex = regexMatcher instanceof RegExp ? regexMatcher : new RegExp(regexMatcher);
                const errorElement = element.querySelector(".json-editor-error");

                if (!regex.test(String(value))) {
                    e.target.classList.add("json-editor-input-error");

                    if (errorElement) {
                        errorElement.textContent = "Invalid value";
                        errorElement.style.display = "block";
                    }

                    return;
                }

                e.target.classList.remove("json-editor-input-error");

                if (errorElement) {
                    errorElement.textContent = "";
                    errorElement.style.display = "none";
                }
            }

            onChange?.(value);
        });

        return element
    }

    static encodePlainText(s) {
        return String(s || '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    static createInputElement(value, disabled = false) {
        let type = typeof value;
        if (type === "string" || value === null) type = "text";
        if (type === "number") type = "number";
        if (type === "boolean") type = "checkbox";

        if (value === null) value = ""

        if (type === "checkbox") {
            return `<input ${disabled ? "disabled" : ""} type="checkbox"${value ? " checked" : ""}>`;
        }

        return `<input type="${type}" ${disabled ? "disabled" : ""} value="${this.encodePlainText(String(value))}">`;
    }


    static getInputHTMLBasedOnType(jsonKey, disabled = false) {
        if (typeof (jsonKey) === "string") return this.createInputElement(jsonKey, disabled);
        if (typeof (jsonKey) === "number") return this.createInputElement(jsonKey, disabled);
        if (typeof (jsonKey) === "boolean") return this.createInputElement(jsonKey, disabled);
        if (jsonKey === null) return this.createInputElement(jsonKey);

        if (Array.isArray(jsonKey)) {
            let html = `<div style='display: flex; flex-wrap: wrap;flex-direction: column;gap: 4px;'>
                                <button ${disabled ? "disabled" : `onclick="JsonEditor.addArrayElement(this)"`}>Add &#128935;</button>`;

            for (let i = 0; i < jsonKey.length; i++) {
                html += this.getArrayItemHTML(jsonKey[i], disabled);
            }
            return `${html}</div>`;
        }
    }

    static getArrayItemHTML(jsonKey, disabled = false) {
        return `<div class="json-editor-array-item" >
                        ${this.getInputHTMLBasedOnType(jsonKey)}
                        <button ${disabled ? "disabled" : `onclick="JsonEditor.removeArrayItem(this)"`}>&#128942;</button>
                    </div>`;
    }

    static removeArrayItem(itemElement) {
        let parent = itemElement.parentElement;
        let input = parent.querySelector("input");
        if (input) input.value = "";
        parent.closest(".json-editor-setting").dispatchEvent(new Event("input", {bubbles: true}))
        parent.remove();
    }

    static addArrayElement(itemElement) {
        let parent = itemElement.parentElement;
        parent.insertAdjacentHTML("beforeend",
            `${this.getArrayItemHTML("")}
        `);
    }
}
