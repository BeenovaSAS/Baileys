#!/bin/bash

#give permission for everything in the express-app directory
sudo chmod -R 777 /home/ubuntu/Dogtorsoftware/Baileys

#navigate into our working directory where we have all our github files
cd /home/ubuntu/Dogtorsoftware/Baileys

#install node modules
npm install
npm start prepare

#start our node app in the backgroun
pm2 restart baileys
