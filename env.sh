#!/bin/bash

function echo_color()  { printf "$1"; echo "${@:2}"; printf '\033[0m'; }
function echo_red()    { echo_color '\033[31m' $@; }
function echo_green()  { echo_color '\033[32m' $@; }
function echo_yellow() { echo_color '\033[33m' $@; }
function echo_blue()   { echo_color '\033[34m' $@; }


SCRIPT_PATH="$(dirname "$(realpath "$0")")"

# ENV_FILE
echo_green 'Please set the name of the environment file:'
echo_blue 'ENV_FILE [.env]'
read ENV_FILE; ENV_FILE=${ENV_FILE:-.env}
[ -f "$SCRIPT_PATH/$ENV_FILE" ] && echo_red "Warning: $ENV_FILE already exists and will be overwritten!"

# VOLUMES
echo_green 'Please set the path for each volume directory:'
echo_blue 'BACKEND_VOLUME [./backend]'
read BACKEND_VOLUME; BACKEND_VOLUME=${BACKEND_VOLUME:-./backend}
echo_blue 'FRONTEND_VOLUME [./frontend]'
read FRONTEND_VOLUME; FRONTEND_VOLUME=${FRONTEND_VOLUME:-./frontend}

# NODE
echo_green 'Please set the following Node.js variables:'
echo_blue 'NODE_ENV [development]' # development|production
read NODE_ENV; NODE_ENV=${NODE_ENV:-development}
echo_blue 'NODE_VERSION [lts]'
read NODE_VERSION; NODE_VERSION=${NODE_VERSION:-lts}

# POSTGRES
echo_green 'Please set the following PostgreSQL variables:'
echo_blue 'POSTGRES_DB [database]'
read POSTGRES_DB; POSTGRES_DB=${POSTGRES_DB:-database}
echo_blue 'POSTGRES_PASSWORD [-]'
read POSTGRES_PASSWORD;
echo_blue 'POSTGRES_USER [postgres]'
read POSTGRES_USER; POSTGRES_USER=${POSTGRES_USER:-postgres}


<<EOF cat > "$SCRIPT_PATH/$ENV_FILE"
# ENVIRONMENT VARIABLES

# VOLUMES
BACKEND_VOLUME=$BACKEND_VOLUME
FRONTEND_VOLUME=$FRONTEND_VOLUME

# NODE
NODE_ENV=$NODE_ENV
NODE_VERSION=$NODE_VERSION

# POSTGRES
POSTGRES_DB=$POSTGRES_DB
POSTGRES_HOST=\${POSTGRES_DB}
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_USER=$POSTGRES_USER
POSTGRES_URL=postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@\${POSTGRES_HOST}:5432
EOF
