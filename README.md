# ft_transcendence

Please keep this file up-to-date with your respective current task(s) sorted by priority.

# Unassigned:

• Implement 'Settings' feature for chat rooms (http://localhost:5173/chatroom):

- Allow all users to leave the ChatRoom, if the ChatRoom owner decides to leave his CHatroom the Room gets deleted and all references (messages[] && users[]).
- Allow room owners to assign admin roles.
- Enable admins to manage room membership and settings.
- Ensure intuitive UI for inviting, kicking, and assigning admins within chatrooms.
- Better create a new site for that because ChatroomPage is so fat

---

• The user should be able to invite other users to play a Pong game through the chat interface. (ChatRoom.page /chat/invite Backend Response)

```

(frontend)
-handle errors correctly when receiving response..., backend response error gets sended but frontend dont care, see inspect network

(frontend 'upload Image' button)
- optinal: image-upload extension check, only images allowed and Mb size limit and format. provides immediate feedback to the user and reduced Server Load
- optinal: Use CAPTCHA, will prevent DoS attacks. But is also limited already in backend

```

- Every User Input should use dto!! Form Validation.

```
ERROR Notes, need to be debuged:

---------------------------------------------------------------------------------------------------------
[1. Error]:
Insert error logs here
---------------------------------------------------------------------------------------------------------
[2. Error]:
Insert error logs here
---------------------------------------------------------------------------------------------------------

```

## jjesberg

```

- The user should be able to create channels (chat rooms) that can be either public, or private, or protected by a password.

- The user who has created a new channel is automatically set as the channel owner until they leave it.

◦ The channel owner can set a password required to access the channel, change it, and also remove it.

◦ The channel owner is a channel administrator. They can set other users as administrators.

◦ A user who is an administrator of a channel can kick, ban or mute (for a limited time) other users, but not the channel owners.

- Each user should have a Match History including 1v1 games, ladder, and anything else useful. Anyone who is logged in should be able to consult it.
```

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
-

#### 5. Game
