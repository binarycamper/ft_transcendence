#!/bin/sh

if   [ "$NODE_ENV" = 'development' ]; then
	echo development
	npm install
# development
	if [ -n "$WATCH" ]; then
		# watch mode
		npm run-script start:dev
	else
		npm run-script start
	fi
elif [ "$NODE_ENV" = 'production' ]; then
	echo production
	npm install
# production mode
	npm run-script start:prod
fi


exec "$@"
