function log() {

	console.log.apply(
		console, [
			`%c WebVR-Rec `,
			'background: #cc0000; color: #ffffff; text-shadow: 0 -1px #000; padding: 4px 0 4px 0; line-height: 0',
			...arguments
		]
	);

}

log( 'Content-Script', window.location.toString() );

var port = chrome.runtime.connect( { name: 'contentScript' } );

function post( msg ) {

	port.postMessage( msg );

}

post( { method: 'script-ready' } );

port.onMessage.addListener( function( msg ) {

	log( msg );

	switch( msg.method ) {
		case 'start-recording':
		var e = new Event( 'webvr-rec-start-recording' );
		window.dispatchEvent( e );
		break;
		case 'stop-recording':
		var e = new Event( 'webvr-rec-stop-recording' );
		window.dispatchEvent( e );
		break;
	}

} );

window.addEventListener( 'webvr-rec-new-pose', function( e ) {

	post( { method: 'new-pose', data: e.detail } );

} );

var source = '(' + function () {

	'use strict';

	var recording = false;
	var playing = false;

	window.addEventListener( 'webvr-rec-start-recording', e => {
		recording = true;
	} );

	window.addEventListener( 'webvr-rec-stop-recording', e => {
		recording = false;
	} );

	window.addEventListener( 'webvr-rec-start-playing', e => {
		playing = true;
	} );

	window.addEventListener( 'webvr-rec-stop-playing', e => {
		playing = false;
	} );

	var getPose = VRDisplay.prototype.getPose;
	VRDisplay.prototype.getPose = function() {

		var res = getPose.apply( this, arguments );
		if( recording ) {
			var e = new CustomEvent( 'webvr-rec-new-pose', {
				detail: {
					timestamp: res.timestamp,
					position: res.position,
					linearVelocity: res.linearVelocity,
					linearAcceleration: res.linearAcceleration,
					orientation: res.orientation,
					angularVelocity: res.angularVelocity,
					angularAcceleration: res.angularAcceleration
				}
			} );
			window.dispatchEvent( e );
		}
		return res;
	}

} + ')();';

var script = document.createElement('script');
script.textContent = source;
(document.head||document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
