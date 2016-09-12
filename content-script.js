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
		case 'set-recording':
		var e = new CustomEvent( 'webvr-rec-select-playback', {
			detail: msg.recording
		} );
		window.dispatchEvent( e );
		break;
		case 'start-playing':
		var e = new Event( 'webvr-rec-start-playback' );
		window.dispatchEvent( e );
		break;
		case 'stop-playing':
		var e = new Event( 'webvr-rec-stop-playback' );
		window.dispatchEvent( e );
		break;
	}

} );

window.addEventListener( 'webvr-rec-new-pose', function( e ) {

	post( { method: 'new-pose', data: e.detail } );

} );

var source = '(' + function () {

	'use strict';

	console.log( 'here we go' );

	var recording = false;
	var playing = false;
	var playingPtr = 0;
	var playingSequence = null;
	var playingOffset = 0;
	var playingLength = 0;
	var startTime = 0;

	window.addEventListener( 'webvr-rec-start-recording', e => {
		recording = true;
	} );

	window.addEventListener( 'webvr-rec-stop-recording', e => {
		recording = false;
	} );

	window.addEventListener( 'webvr-rec-select-playback', e => {
		playingSequence = e.detail;
		playingOffset = 0;
		playingLength = 0;
		if( playingSequence.frames.length > 0 ) {
			playingOffset = playingSequence.frames[ 0 ].timestamp;
			playingLength = playingSequence.frames[ playingSequence.frames.length - 1 ].timestamp - playingOffset;
		}
	} );

	window.addEventListener( 'webvr-rec-start-playback', e => {
		playing = true;
		playingPtr = 0;
		startTime = performance.now();
	} );

	window.addEventListener( 'webvr-rec-stop-playback', e => {
		playing = false;
	} );

	var getPose = VRDisplay.prototype.getPose;
	VRDisplay.prototype.getPose = function() {

		var res = getPose.apply( this, arguments );

		if( playing ) {

			var ptr = playingOffset + ( performance.now() - startTime ) % playingLength;

			var frame = playingSequence.frames.find( f => ptr <= f.timestamp );

			if( frame ) {

				res.position[ 0 ] = frame.position[ 0 ];
				res.position[ 1 ] = frame.position[ 1 ];
				res.position[ 2 ] = frame.position[ 2 ];

				res.orientation[ 0 ] = frame.orientation[ 0 ];
				res.orientation[ 1 ] = frame.orientation[ 1 ];
				res.orientation[ 2 ] = frame.orientation[ 2 ];
				res.orientation[ 3 ] = frame.orientation[ 3 ];

				console.log( ptr, frame.position[ 0 ] );
			} else {
				console.log( 'not modified' );
			}
		}

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
