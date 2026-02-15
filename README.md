# DCTS Desktop Client

The desktop client was created to offer advanced features and security for users. Its fundamentally impossible to implement these features into the web client and still be able to guarantee integrity. Because of that i recommend using the desktop client to anyone wanting to use DCTS for more than just trying it out.

![Bild](https://media.discordapp.net/attachments/496366566741508107/1451345308775878759/image.png?ex=6945d626&is=694484a6&hm=37c07e5b435b9ac63c49e08be25a53e025a4633c9f574e318601661e6d45edda&=&format=webp&quality=lossless&width=2589&height=1259)

> [!IMPORTANT]
>
> The **native** windows client has been discontinued! It has been replaced with a new client!
> While it may still work, its not being updated anymore.

------

## Key Features

As mentioned above the desktop client offers some additional features in terms of functionality and security. 

- End-2-End encrypted DMs[^^1]
- Signing and verification of messages sent in a server channel
- User Badge System
- Unique global ID system

It is planned to add more features to the client, like potential warning popups of malicious servers, server badges and more!

------

## Why it matters

The DCTS server consists of two parts: the server and the web client. Since DCTS is open source and anyone running a server has access to the code, a bad actor could modify their server and or web client code to catch keys, modify messages and more. Thats why encryption can only be fully trusted and be done by the desktop client as its fully isolated from the server and web client. This way its impossible for the server and or client to catch private keys. 

Thanks to the signing features and verification its also impossible to edit messages that have been signed.

------

## Potential issues

You may get a few warning messages when trying to launch the client because from your computers point of view, the client is unknown and untrusted. You may see an option like `Show More` and a button will appear with `Run anyway` or similar.

Depending on your system your anti virus may flag the client for the same reason: Its unknown to your system and therefore potentially dangerous. You can ignore these messages or allow them. Otherwise you'll need to stick to the web client.

[^^1]: Only works if the public key of you and the receiver is known to the server. If both you and the receiver connected to a server with the client at least once, you can send encrypted messages anyway. Messages sent with the web client wont be encrypted. Past messages sent that have been encrypted will be visible and marked as encrypted, but the content itself isnt visible.
