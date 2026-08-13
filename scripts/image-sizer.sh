#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
  echo "ImageMagick is required but not installed. Please install it and try again."
  exit 1
fi

# Prompt user for the input image path
read -p "Enter the path to the image: " image_path

# Check if the file exists
if [ ! -f "$image_path" ]; then
  echo "File not found. Please enter a valid image path."
  exit 1
fi

# Extract directory, filename, and extension
directory=$(dirname "$image_path")
filename=$(basename -- "$image_path")
extension="${filename##*.}"
filename="${filename%.*}"

# Define target sizes
lg_width=2500
md_width=1000
sm_width=500

# Create resized images in the same directory as the source image
convert "$image_path" -resize "${lg_width}x" "$directory/${filename}-lg.${extension}"
echo "Created ${directory}/${filename}-lg.${extension} (2500px wide)"

convert "$image_path" -resize "${md_width}x" "$directory/${filename}-md.${extension}"
echo "Created ${directory}/${filename}-md.${extension} (1000px wide)"

convert "$image_path" -resize "${sm_width}x" "$directory/${filename}-sm.${extension}"
echo "Created ${directory}/${filename}-sm.${extension} (500px wide)"
