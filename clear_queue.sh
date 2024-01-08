#!/bin/sh

# clear matchmaking queue
curl -X GET    http://localhost:8080/matchmaking/all-queues
curl -X DELETE http://localhost:8080/matchmaking/all-queues
curl -X GET    http://localhost:8080/game/all-games
curl -X DELETE http://localhost:8080/game/all-games

echo
