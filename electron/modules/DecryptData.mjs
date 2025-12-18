
export const DecryptData = async ({ signer, applicationDataDir }, method,  encKey, iv,  tag, ciphertext) => {
    try{
        console.log("PRELOAD: DecryptData aufgerufen:", { method, encKey, iv, tag, ciphertext })
        if(!method) throw new Error("DecryptData: No method specified")
        if(!encKey) throw new Error("DecryptData: No encKey specified")
        if(!iv) throw new Error("DecryptData: No iv specified")
        if(!tag) throw new Error("DecryptData: No tag specified")
        if(!ciphertext) throw new Error("DecryptData: No ciphertext specified")

        let envelope = {
            method,
            encKey,
            iv,
            tag,
            ciphertext
        }

        return await signer.decrypt(envelope)
    }
    catch(decryptionError){
        console.error(decryptionError)
        throw decryptionError
    }
}
