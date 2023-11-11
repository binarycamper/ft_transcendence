#!/bin/sh

if   [ "$NODE_ENV" = 'development' ]; then
	echo development
	npm install
	# development
	npm run-script start
	# watch mode
	#npm run-script start:dev
elif [ "$NODE_ENV" = 'production' ]; then
	echo production
	npm install
	# production mode
	npm run-script start:prod
fi


exec "$@"
