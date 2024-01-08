#!/bin/bash
curl -X GET       http://localhost:8080/matchmaking/getAll \
&& curl -X DELETE http://localhost:8080/matchmaking/deleteAll \
&& curl -X GET    http://localhost:8080/game/allgames \
&& curl -X DELETE http://localhost:8080/game/deleteallgames
echo 