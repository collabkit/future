// Create user interfaces
var galleryApp = new GalleryApp();

// Connect a session so we can get updates on inter-client state...
var session = new Faye.Client('/:session/');
session.subscribe('/commits', function(message) {
	galleryApp.updateLibrary(message);
});
