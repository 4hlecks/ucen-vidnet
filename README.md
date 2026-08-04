# UCen VidNet Coordinator Validator

A desktop application for inspecting, validating, and converting digital advertisement submissions for UC San Diego University Centers display systems.

> This is a personal project and is not an official UC San Diego or University Centers application.

## About the Project

The **UCen VidNet Coordinator Validator** is a desktop application I created to streamline part of my workflow as a Video Network Coordinator for University Centers at UC San Diego.

One of my responsibilities in this role is reviewing digital advertisement submissions for Price Center television and marquee displays. This process normally involves downloading each submitted file, checking its format and dimensions, reviewing its metadata, and writing a response explaining whether it meets the required specifications.

I created this tool to make that process faster and more consistent. Users can upload images and videos, inspect their file information, validate them against the selected display requirements, generate a response message, and convert incorrectly sized files.

## Features

* Upload multiple image and video files
* Drag and drop file support
* Preview uploaded images and videos
* Display file format, dimensions, DPI, and video duration
* Validate media for Price Center VidNet televisions
* Validate media for Price Center marquee displays
* Generate acceptance or correction messages
* Copy generated messages to the clipboard
* Convert files to the selected display dimensions
* Preserve the original aspect ratio during conversion
* Save converted files through a native Save As dialog
* Remove uploaded files from the current session
* Process files locally without uploading them to a server

## Display Requirements

### Price Center VidNet Televisions

* Resolution: `1920 × 1080`
* Image resolution: `72 DPI`
* Supported formats:

  * PNG
  * JPEG
  * GIF
  * MP4

### Price Center Marquees

* Resolution: `840 × 144`
* Supported formats:

  * PNG
  * JPEG
  * GIF
  * MP4

## Built With

* Electron
* JavaScript
* HTML
* CSS
* Node.js
* Sharp
* FFmpeg

## Download

WIP

## Installation

WIP

## How to Use

1. Upload one or more image or video files.
2. Select a file from the uploaded media list.
3. Choose either **VidNet** or **Marquee**.
4. Review the detected file information.
5. Check whether the file meets the selected display requirements.
6. Copy the generated response message when needed.
7. Select **Convert File** to resize and save the media.

Converted files preserve their original aspect ratio. When the source aspect ratio does not match the selected display, the application stretches the content.

## Running the Project Locally

### Prerequisites

Install the following software:

* Node.js
* npm
* Git

### Clone the Repository

```bash
git clone https://github.com/4hlecks/ucen-vidnet.git
```

Move into the project folder:

```bash
cd ucen-vidnet
```

### Install Dependencies

```bash
npm install
```

### Start the Application

```bash
npm start
```

## Project Structure
WIP

Your exact folder structure may differ depending on where images, icons, and other assets are stored.

## Project Motivation

This project was inspired by a repetitive part of my student job at UC San Diego.

Rather than repeatedly opening different applications to inspect every submission, I wanted to build a focused desktop application around the actual review workflow.

The project also gave me practical experience with:

* Desktop application development using Electron
* File handling and local media processing
* Image metadata inspection
* Video metadata inspection
* Image conversion using Sharp
* Video conversion using FFmpeg
* Asynchronous JavaScript
* Application state management
* DOM rendering and event handling
* Native desktop dialogs
* Input validation
* Responsive interface design
* Packaging and distributing desktop software

## Privacy

All file inspection and conversion takes place locally on the user's computer.

Uploaded media is not sent to an external server.

## Current Limitations

* The current release is intended primarily for Windows.
* The application is not currently code signed.
* Conversion adds padding when a source file does not match the required aspect ratio.
* Some video codecs may not support an in-app preview even when FFmpeg can process the file.
* The application does not directly connect to Kuali or automatically submit approval decisions.

## Disclaimer

This application is a personal project created to support an individual workflow.

It is not an official product of UC San Diego, University Centers, or the University of California. Display requirements may change, so users should verify current specifications before relying on the application for production work.

## Author

**Alex Atienza**

GitHub: [@4hlecks](https://github.com/4hlecks)
