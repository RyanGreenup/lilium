# FROM node:lts
FROM oven/bun:alpine

WORKDIR /app

############################################################
# Install the dependencies #################################
############################################################
# Alpine needs these for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++ sqlite-dev pandoc nodejs npm

############################################################
# Install the Node Modules #################################
############################################################
COPY package.json package.json
COPY bun.lock bun.lock
RUN bun install --frozen-lockfile

############################################################
# Copy in the Application ##################################
############################################################
# Copy in the application
COPY . .

############################################################
# Build the Application ####################################
############################################################
# Build
RUN npm run build


############################################################
# Run the Application ######################################
############################################################
CMD [ "npm", "run", "start" ]
