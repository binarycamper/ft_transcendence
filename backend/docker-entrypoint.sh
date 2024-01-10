#!/bin/sh

if   [ "$NODE_ENV" = 'development' ]; then
	echo development
	npm install
# development
	if [ -n "$WATCH_MODE_DISABLED" ]; then
		npm run-script start
	else
		# watch mode
		npm run-script start:dev
	fi
elif [ "$NODE_ENV" = 'production' ]; then
	echo production
	npm install
# production mode
	npm run-script start:prod
fi


exec "$@"
