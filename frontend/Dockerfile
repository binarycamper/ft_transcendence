# syntax=docker/dockerfile:1

ARG NODE_VERSION=lts

FROM node:${NODE_VERSION}-alpine
RUN npm update -g npm


ENV NODE_ENV production

USER node
WORKDIR /usr/src/app
#ENTRYPOINT ["./docker-entrypoint.sh"]

# for debugging only:
CMD ["tail", "-f", "/dev/null"]
