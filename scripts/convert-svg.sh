#!/bin/bash

# Prompt the user for the folder
read -p "Enter the folder path containing SVG and EPS files: " folder_path

# Check if the folder exists
if [ ! -d "$folder_path" ]; then
  echo "The folder does not exist. Please try again."
  exit 1
fi

# Define sizes
lg_width=2500
md_width=1000
sm_width=500

# Function to export files in different sizes
convert_file() {
  local file=$1
  local base_filename=$(basename "$file" .${file##*.})

  # Export large version (2500px wide)
  inkscape "$file" --export-width=$lg_width --export-filename="$folder_path/${base_filename}-lg.png"
  echo "Exported ${base_filename}-lg.png (Large: 2500px wide)"

  # Export medium version (1000px wide)
  inkscape "$file" --export-width=$md_width --export-filename="$folder_path/${base_filename}-md.png"
  echo "Exported ${base_filename}-md.png (Medium: 1000px wide)"

  # Export small version (500px wide)
  inkscape "$file" --export-width=$sm_width --export-filename="$folder_path/${base_filename}-sm.png"
  echo "Exported ${base_filename}-sm.png (Small: 500px wide)"
}

# Process each SVG and EPS file in the folder
for file in "$folder_path"/*.{svg,eps}; do
  # Check if the file exists
  if [ -e "$file" ]; then
    convert_file "$file"
  else
    echo "No SVG or EPS files found in the folder."
  fi
done
