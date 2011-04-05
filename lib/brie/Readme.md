# System architecture

This system is primarily organized into applications, called apps, and services. Each app targets a specific kind of user experience, such as a desktop computer or a mobile phone. A service targets a specific kind of data representation and communication protocol, such as a web page or data API.

# URL routing

**Examples**

	example.com/:a:s/p => { app: 'a',  service: 's',  host: 'example.com', path: 'p' }
	example.com/:a/p   => { app: 'a',  service: null, host: 'example.com', path: 'p' }
	example.com/::s/p  => { app: null, service: 's',  host: 'example.com', path: 'p' }
	example.com/p      => { app: null, service: null, host: 'example.com', path: 'p' }

# Apps

## Console

Targets Opera on Nintendo Wii currently, but other game consoles could be supported in the future. Opera on the Wii offers events from up to four Wiimotes, allowing access to their position and orientation as well as most of their buttons. This provides the foundation for unique user interfaces conducive to kinesthetic learning. Wii is a device most commonly attached to a large
screen and viewed from a considerable distance, yet only is capable of outputting EDTV resolution. Because of this, user interfaces designed for the Wii feature simplified controls and use larger text and icons.

## Desktop

Targets the latest versions of Mozilla Firefox, Google Chrome, Safari, Opera and Microsoft Internet Explorer. Some previous versions of these browsers may also be supported, but at a lower priority. These browsers are used on desktop, laptop, and netbook computers. Most of these computers support screen sizes of 1024x768 pixels or larger, with a small portion of them supporting maximum screen sizes of 800x600. Most users interact primarily with a mouse or track-pad, and secondarily with a keyboard. In rare cases a stylus or touch-screen may supplement or replace the mouse or track-pad. User interfaces designed for these targets are the most complete and complex because users can more easily click and type accurately than on most other target devices. This is the default app, used when no app is explicitly specified.

## Mobile

Targets the native web browsers for Android and iOS devices such as the Apple iPhone and iPod Touch which all run browsers based on webkit. The touch-screen interfaces and screen sizes of most devices running these operating systems are very similar. User interfaces designed for this app take advantage of the unique touch and drag style of navigation. They also take into account limited screen sizes by using simplified controls, modal input interfaces and liberal use of content paging navigated by swiping. Detailed location information is usually available on these devices, which can greatly improve the accuracy of location services of geo-ip. Other inputs, such as positional information may also be available, allowing content to be more physically interactive.

## Tablet

Targets the same browsers as mobile, but takes into account larger screen sizes common with touch-screen tablets such as the Apple iPad and Motorola Xoom which run iOS or Android respectively. While user interfaces designed for this app can be more complex than those designed for mobile devices, controls and information should still be greatly simplified in comparison to how they may be presented on a desktop computer.

# Services

## Data

Provides access to functionality of the system through a series of discreet HTTP requests. The bodies of requests and responses are encoded as JSON documents.

## Page

Provides access to static or generated HTML pages. This is the default service, used when no service is explicitly specified.

## Resource

Provides access to static or generated JavaScript and CSS resources. Optimizations such as code minification, batch requests and data-URI image embedding can be performed on the fly.

## Session

Provides persistent communication through a combination of techniques including WebSockets and Ajax long-polling. Most app state is communicated through sessions, allowing real-time collaboration between users.

# Features

## Chat

Provides real-time user-to-user communication.

## Document

Allows users to construct documents using a variety of blocks, such as text, images, video, etc.

## Project

Allows users to organize documents and links to resources in the system or anywhere on the web, together with other users.

# Testing

## Media

The stub Media provider currently simply saves data into local memory. You can upload a file via HTTP PUT like so:

  curl -X PUT -H 'Content-Type: image/png' \
    --data-binary @/Users/brion/Pictures/1708.png \
    http://lazarus.local:8124/:media/new

which should return an HTTP 303 and a short HTML response body pointing to the fetch URL.

