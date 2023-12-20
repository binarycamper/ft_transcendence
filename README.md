# ft_transcendence

Please keep this file up-to-date with your respective current task(s) sorted by priority.

# Unassigned:

```
- Every User Input should use dto!! Form Validation.

(frontend)
-handle errors correctly when receiving response..., backend response error gets sended but frontend dont care, see inspect network

(frontend 'upload Image' button)
- optinal: image-upload extension check, only images allowed and Mb size limit and format. provides immediate feedback to the user and reduced Server Load
- optinal: Use CAPTCHA, will prevent DoS attacks. But is also limited already in backend

- matchmaking system
```

```
ERROR Notes, need to be debuged:

---------------------------------------------------------------------------------------------------------
[1. Error]: (? Pls fix me ?) <---------------------------------------------------------------------------
Einige Cookies verwenden das empfohlene "SameSite"-Attribut inkorrekt. 2
Das Cookie "token" verfügt über keinen gültigen Wert für das "SameSite"-Attribut. Bald werden Cookies ohne das "SameSite"-Attribut oder mit einem ungültigen Wert dafür als "Lax" behandelt. Dadurch wird das Cookie nicht länger an Kontexte gesendet, die zu einem Drittanbieter gehören. Falls Ihre Anwendung das Cookie in diesen Kontexten benötigt, fügen Sie bitte das Attribut "SameSite=None" zu ihm hinzu. Weitere Informationen zum "SameSite"-Attribut finden Sie unter https://developer.mozilla.org/docs/Web/HTTP/Headers/Set-Cookie/SameSite. login
Das Cookie "token" verfügt über keinen gültigen Wert für das "SameSite"-Attribut. Bald werden Cookies ohne das "SameSite"-Attribut oder mit einem ungültigen Wert dafür als "Lax" behandelt. Dadurch wird das Cookie nicht länger an Kontexte gesendet, die zu einem Drittanbieter gehören. Falls Ihre Anwendung das Cookie in diesen Kontexten benötigt, fügen Sie bitte das Attribut "SameSite=None" zu ihm hinzu. Weitere Informationen zum "SameSite"-Attribut finden Sie unter https://developer.mozilla.org/docs/Web/HTTP/Headers/Set-Cookie/SameSite.
---------------------------------------------------------------------------------------------------------
[2. Error]:
Insert error logs here
---------------------------------------------------------------------------------------------------------

```

## jjesberg

```
- The user should be able to block other users. This way, they will see no more messages from the account they blocked.

- The user should be able to create channels (chat rooms) that can be either public, or private, or protected by a password.

- The user who has created a new channel is automatically set as the channel owner until they leave it.

◦ The channel owner can set a password required to access the channel, change it, and also remove it.

◦ The channel owner is a channel administrator. They can set other users as administrators.

◦ A user who is an administrator of a channel can kick, ban or mute (for a limited time) other users, but not the channel owners.

• The user should be able to invite other users to play a Pong game through the chat interface.

• The user should be able to access other players profiles through the chat interface.

- Each user should have a Match History including 1v1 games, ladder, and anything else useful. Anyone who is logged in should be able to consult it.
```

## kfergani

```
database: PostgreSQL
```

## rkedida

```
        =    database: PostgreSQL
    x    =    passwords in database must be hashed
        =    protect against SQL injections
        =    server-side validation for forms and any user input
    x    =    login using OAuth system of 42 intranet <-------------- !!!Einige Cookies verwenden das empfohlene "SameSite"-Attribut inkorrekt. 2!!! try fix error when get authtoken from 42api
    x    =    two-factor authentication
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

#### 3. User Account

- The user should be able to choose a unique name that will be displayed on the website.
- The user should be able to add other users as friends and see their current status (online, offline, in a game, and so forth).
- upload avatar else default one must be set (intra pic)
- Stats (such as: wins and losses, ladder level, achievements, and so forth) have to be displayed on the user profile.

#### 4. Chat

- Chat between friends (The user should be able to send direct messages to other users.)
-

#### 5. Game
