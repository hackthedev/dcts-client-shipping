
export const EncryptData = async ({ signer, applicationDataDir }, data, keyOrPass) => {
    try{
        if(!data) throw new Error("No data provided")
        if(!keyOrPass) throw new Error("No keyOrPass provided")
        return await signer.encrypt(data, keyOrPass)
    }
    catch(encryptionError){
        console.error(encryptionError)
        throw encryptionError
    }
}
