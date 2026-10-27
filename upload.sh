#!/bin/bash


# Load environment variables from .env
if [ ! -f .env ]; then
  echo ".env file not found! Please create it with the following content (below is just example stuff, you will need the reall stuff):"
  echo "--------------------------------------------"
  echo "USERNAME=longegg"
  echo "SERVER=123.4.876.123"
  echo "SITE_DIRECTORY=/var/www/trashbaby.cool/"
  echo "--------------------------------------------"
  exit 1
fi

# Source the .env file
source .env

# Verify variables are set
if [ -z "$USERNAME" ] || [ -z "$SERVER" ] || [ -z "$SITE_DIRECTORY" ]; then
  echo "Missing required variables in .env! Ensure it contains:"
  echo "USERNAME, SERVER, and SITE_DIRECTORY"
  exit 1
fi

# Perform the upload using rsync
echo "Uploading serve/ to $USERNAME@$SERVER:$SITE_DIRECTORY ..."

if rsync -avz --prune-empty-dirs \
  --include '*/' \
  --include '*.html' \
  --exclude '*' \
  serve/ "$USERNAME@$SERVER:$SITE_DIRECTORY"; then
  echo "Pages uploaded first (.html files)."
else
  echo "Page upload failed. Check your connection and try again."
  exit 1
fi

if rsync -avz --delete --exclude 'img/***' serve/ "$USERNAME@$SERVER:$SITE_DIRECTORY"; then
  echo "Non-image assets uploaded second."
else
  echo "Non-image upload failed. Check your connection and try again."
  exit 1
fi

if rsync -avz --delete serve/img/ "$USERNAME@$SERVER:$SITE_DIRECTORY/img/"; then
  echo "Images uploaded last."

  echo "Applying web-safe permissions (dirs 755, files 644) ..."

  if ssh "$USERNAME@$SERVER" "find '$SITE_DIRECTORY' -type d -exec chmod 755 {} + && find '$SITE_DIRECTORY' -type f -exec chmod 644 {} +"; then
    echo "Upload + permission fix complete!"
  else
    echo "Upload succeeded, but permission fix failed."
    exit 1
  fi
else
  echo "Image upload failed. Check your connection and try again."
  exit 1
fi
