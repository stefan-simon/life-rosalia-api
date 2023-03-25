# specify the node base image with your desired version node:<version>
FROM node:14

# create app directory
WORKDIR /app

# copy package.json and package-lock.json to work directory
COPY package*.json ./

# install app dependencies
RUN npm install

# copy app source code to work directory
COPY . .

# map the users_pictures folder
VOLUME /app/users_pictures

# expose port 3000
EXPOSE 3000

# start the app
CMD [ "npm", "start" ]
