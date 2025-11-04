FROM node:lts


WORKDIR /app

############################################################
# Install the dependencies #################################
############################################################
RUN apt update
RUN apt install  -y python3 make g++ libsqlite3-dev pandoc
# RUN wget 'https://github.com/jgm/pandoc/releases/download/3.8.2.1/pandoc-3.8.2.1-1-amd64.deb' > /tmp/ && dpkg -i pandoc-3.8.2.1-1-amd64.deb
RUN npm install -g rust-just
# NOTE could also use snap
# snap install --edge --classic just
############################################################
# Install the Node Modules #################################
############################################################
# Install the dependencies first
# RUN npm install -g bun
COPY package.json package.json
COPY package-lock.json package-lock.json
# RUN bun install
RUN npm install

############################################################
# Copy in the Application ##################################
############################################################
# Copy in the application
COPY . .

############################################################
# Build the Application ####################################
############################################################
# Update the Data (NOTE, this slows it down, obviously)
# RUN just data-pull

# Build
RUN mkdir -p .data && \
    npm run build


############################################################
# Run the Application ######################################
############################################################
CMD [ "npm", "run", "start" ]
