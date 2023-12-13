# ft_transcendence

Please keep this file up-to-date with your respective current task(s) sorted by priority.

# Unassigned:

```
- Every User Input should use dto!! Form Validation.

- implement Button in Dashboard to navigation to user/friendlist

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
[1. Error]: (solutions could be: all controller functions which use UserService.findProfileById should check before or UserService.findProfileById should check that) Or just Try{} catch (error)
backend   | [Nest] 101  - 12/11/2023, 5:24:46 PM   ERROR [ExceptionsHandler] User not found
backend   | Error: User not found
backend   |     at UserService.findProfileById (/usr/src/app/src/user/user.service.ts:47:10)
backend   |     at processTicksAndRejections (node:internal/process/task_queues:95:5)
backend   |     at AuthController.login (/usr/src/app/src/auth/auth.controller.ts:59:16)
backend   |     at /usr/src/app/node_modules/@nestjs/core/router/router-execution-context.js:46:28
backend   |     at /usr/src/app/node_modules/@nestjs/core/router/router-proxy.js:9:17
---------------------------------------------------------------------------------------------------------
[2. Error]:
Insert error logs here
---------------------------------------------------------------------------------------------------------

```

## jjesberg

```
start chat
show stats on publicprofile
button + route to remove a friend
backend: NestJS
try fix error when get authtoken from 42api
match history
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
    x    =    login using OAuth system of 42 intranet
    x    =    two-factor authentication
```

## rmeuth

```
frontend: create basic webpage layout
frontend: create game (pong)
customization options
```

## vmiseiki

```
channels, public or private, optional password
direct messages
block other users
creator of new channel is channel owner (admin)
channel owner: set password, set administrators
admin: kick, ban, mute (limited time), but not owner
invite others to play a game via chat interface
access profiles via chat interface
```

# Completed:

#### 1. Overview

- single-page application
- multi browser support

#### 2. Security concerns

#### 3. User Account

- upload avatar else default one must be set (intra pic)
- stats have to be displayed on the user profile

#### 4. Chat

#### 5. Game
