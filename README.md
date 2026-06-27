# Louisville Makes Games

New website for 2023!


This is a static site build with a simple generator.

## Prereqs

1. Install node
2. Navigate to the root of this project in your terminal
3. run `npm i` to install the node modules used by the project


### How this has been done on the DigitalOcean Droplet

1. Install the github deploy key and configure ssh to use it for github
1. `apt install unzip` - required for npm
1. Install fnm and use `fnm install 16` & `fnm use 16`  (TODO:  Upgrade the code to newer node version)
1. `git pull git@github.com:LouisvilleMakesGames/louisvillemakesgames.org.git`
1. `cd louisvillemakesgames.org` and `npm i` and `npm build`
1. `rsync -avz --delete ./serve/ /var/www/louisvillemakesgames.org/`

Note that there's a TODO to automate this with github actions or something.  An `upload.sh` script that can run via `npm run upload` (see below) exists to manually do a version of this.


## To build:

1. Navigate to the root of this project in your terminal
2. Run `npm start` from the terminal, then files will magically appear in the `dest` folder.


### To preview it

1. Run `npm run serve` and it will do a python thing and let you view the site at port 8000


### Now you need to get those files onto a server.

1. 'npm run upload'
