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
create GrpChats with Admins pw etc.
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
    x    =    login using OAuth system of 42 intranet <------------------------------------------------ !!!Einige Cookies verwenden das empfohlene "SameSite"-Attribut inkorrekt. 2!!!
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

- upload avatar else default one must be set (intra pic)
- stats have to be displayed on the user profile
- Chat between friends

#### 4. Chat

#### 5. Game
