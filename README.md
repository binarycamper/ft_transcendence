# ft_transcendence

Please keep this file up-to-date with your respective current task(s) sorted by priority.

# Unassigned:

• The user should be able to invite other users to play a Pong game through the chat interface. (ChatRoom.page /chat/invite Backend Response)

- Invite players in chatinterface to a game

- https protocol

```
ERROR Notes, need to be debuged:
---------------------------------------------------------------------------------------------------------
[1. Error]: direkt nachdem login mit intrauser!
Einige Cookies verwenden das empfohlene "SameSite"-Attribut inkorrekt. 2
Das Cookie "token" verfügt über keinen gültigen Wert für das "SameSite"-Attribut. Bald werden Cookies ohne das "SameSite"-Attribut oder mit einem ungültigen Wert dafür als "Lax" behandelt. Dadurch wird das Cookie nicht länger an Kontexte gesendet, die zu einem Drittanbieter gehören. Falls Ihre Anwendung das Cookie in diesen Kontexten benötigt, fügen Sie bitte das Attribut "SameSite=None" zu ihm hinzu. Weitere Informationen zum "SameSite"-Attribut finden Sie unter https://developer.mozilla.org/docs/Web/HTTP/Headers/Set-Cookie/SameSite.
---------------------------------------------------------------------------------------------------------

```

## jjesberg

## kfergani

```
database: PostgreSQL
```

## rkedida

```
- matchmaking system
        =    database: PostgreSQL
        =    protect against SQL injections
        =    server-side validation for forms and any user input
```

## rmeuth

```
frontend: create basic webpage layout
frontend: create game (pong)
customization options
```

# Completed:

#### 1. Overview

- single-page application
- multi browser support

#### 2. Security concerns

- 2FA

#### 3. User Account

• The user should be able to access other players profiles through the chat interface.

- The user should be able to choose a unique name that will be displayed on the website.
- The user should be able to add other users as friends and see their current status (online, offline, in a game, and so forth).
- upload avatar else default one must be set (intra pic)
- Stats (such as: wins and losses, ladder level, achievements, and so forth) have to be displayed on the user profile.

#### 4. Chat

- The user should be able to block other users. This way, they will see no more messages from the account they blocked.
- Chat between friends (The user should be able to send direct messages to other users.)
- Allow all users to leave the ChatRoom, if the ChatRoom owner decides to leave his CHatroom the Room gets deleted and all references (messages[] && users[]).
- The user should be able to create channels (chat rooms) that can be either public, or private, or protected by a password.
  ◦ The channel owner is a channel administrator. They can set other users as administrators.
- The user who has created a new channel is automatically set as the channel owner until they leave it.
  ◦ The channel owner can set a password required to access the channel, change it, and also remove it.
  ◦ A user who is an administrator of a channel can kick, ban or mute (for a limited time) other users, but not the channel owners.

#### 5. Game

- Spectatormode: add active game links to a activeGames page, with user references. that anyone can spectate that

##### issues:

- Friend online status broken. (should work with intra users) will tested when game is rdy...

##### Fixed

- User can still send messages after getting kicked (page not refreshed)
- Deleting the room without permissions results in deleting the last msg of the chat for everyone! Lol kk its fixed :D
