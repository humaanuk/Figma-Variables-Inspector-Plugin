# Figma Variables Inspector Plugin

A simple Figma plugin that demonstrates basic plugin functionality.

## Development

1. Clone this repository
2. Open Figma desktop app
3. Go to Plugins > Development > Import plugin from manifest...
4. Select the `manifest.json` file from this repository

## Features

- Creates a set of rectangles in your Figma document
- Demonstrates basic plugin UI and communication

## Building

This plugin is ready to run in development mode. To build for production:

1. Make sure you have Node.js installed
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin

## License

MIT 

## Change log - MF 25 Apr 2025

1. Created with assistance of Cursor.ai
2. Works with Collections, Modes and Variables
3. Issue with renaming Mode 1 (default mode) meant that we now create additional modes and then remove the original mode. Not sure if this will affect our limit on 4 Modes per collection. i.e. If it only gets deleted after creating the other modes then will 4 supplied modes fail as the last one will be out of range?
4. Currently limited to actual values instead of working with aliased values. i.e. I can't reference a value other than Number, Boolean, Text etc.