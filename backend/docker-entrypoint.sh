#!/bin/sh

if [ "$NODE_ENV" = 'development' ]; then
	echo development
	npm install
# development
	if [ -n "$DEBUG_MODE" ]; then
		npm run start:debug -- --debug '0.0.0.0:9229' --watch
	elif [ -n "$WATCH_MODE_DISABLED" ]; then
		npm run start
	else
		# watch mode
		npm run start:dev
	fi
elif [ "$NODE_ENV" = 'production' ]; then
	echo production
	npm install
# production mode
	npm run start:prod
fi


exec "$@"
