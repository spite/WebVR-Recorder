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
		case 'upload-recording':
		fileChooser.click();
		break;
	}

} );

window.addEventListener( 'webvr-rec-new-hmd-pose', function( e ) {

	post( { method: 'new-hmd-pose', data: e.detail } );

} );

window.addEventListener( 'webvr-rec-new-controller-pose', function( e ) {

	post( { method: 'new-controller-pose', data: e.detail } );

} );

var source = '(' + function () {

	'use strict';

	console.log( 'here we go' );

	var recording = false;
	var playing = false;
	var matrixIsSet = false;

	var playingSequence = null;

	function Track() {

		this.playingPtr = 0;
		this.playingOffset = 0;
		this.playingLength = 0;
		this.startTime = 0;

		this.track = null;

	}

	Track.prototype.set = function( t ) {

		t.frames = t.frames.filter( f => f.position !== null && f.orientation !== null );

		this.playingPtr = 0;
		this.playingOffset = 0;
		this.playingLength = 0;

		if( t.frames.length > 0 ) {
			this.playingOffset = t.frames[ 0 ].timestamp;
			this.playingLength = t.frames[ t.frames.length - 1 ].timestamp - this.playingOffset;
		}

		this.track = t;

	}

	Track.prototype.start = function() {
		
		this.playingPtr = 0;
		this.startTime = performance.now();

	}

	Track.prototype.getFrame = function() {

		var ptr = this.playingOffset + ( performance.now() - this.startTime ) % this.playingLength;
		var frame = this.track.frames.find( f => ptr <= f.timestamp );
		return frame;

	}

	var hmdTrack = new Track();
	var controllerTracks = [];

	window.addEventListener( 'webvr-rec-start-recording', e => {
		recording = true;
		matrixIsSet = false;
	} );

	window.addEventListener( 'webvr-rec-stop-recording', e => {
		recording = false;
	} );

	window.addEventListener( 'webvr-rec-select-playback', e => {
		
		playingSequence = e.detail;
		controllerTracks = [];
		hmdTrack.set( playingSequence.poses.hmd );
		/*playingSequence.poses.controllers.forEach( p => {
			var t = new Track();
			t.set( p );
			controllerTracks.push( t );
		} );*/

	} );

	window.addEventListener( 'webvr-rec-start-playback', e => {
		playing = true;
		hmdTrack.start();
	} );

	window.addEventListener( 'webvr-rec-stop-playback', e => {
		playing = false;
	} );

	function copyFrameToPose( frame, pose ) {

		pose.position[ 0 ] = frame.position[ 0 ];
		pose.position[ 1 ] = frame.position[ 1 ];
		pose.position[ 2 ] = frame.position[ 2 ];

		pose.orientation[ 0 ] = frame.orientation[ 0 ];
		pose.orientation[ 1 ] = frame.orientation[ 1 ];
		pose.orientation[ 2 ] = frame.orientation[ 2 ];
		pose.orientation[ 3 ] = frame.orientation[ 3 ];

		return pose;

	}

	function copyFrameToGamepadPose( frame, pose ) {

		var newPose = {
			position: new Float32Array( 3 ),
			orientation: new Float32Array( 4 )
		};

		newPose.position[ 0 ] = frame.position[ 0 ];
		newPose.position[ 1 ] = frame.position[ 1 ];
		newPose.position[ 2 ] = frame.position[ 2 ];

		newPose.orientation[ 0 ] = frame.orientation[ 0 ];
		newPose.orientation[ 1 ] = frame.orientation[ 1 ];
		newPose.orientation[ 2 ] = frame.orientation[ 2 ];
		newPose.orientation[ 3 ] = frame.orientation[ 3 ];

		return newPose;

	}

	var getPose = VRDisplay.prototype.getPose;
	VRDisplay.prototype.getPose = function() {

		var res = getPose.apply( this, arguments );

		if( playing ) {

			var frame = hmdTrack.getFrame();

			if( frame ) {

				res = copyFrameToPose( frame, res );

				//console.log( frame.orientation[ 0 ], res.orientation[ 0 ] );
			} else {
				//console.log( 'not modified' );
			}
		}

		if( recording ) {

			if( matrixIsSet ) {

				var e = new CustomEvent( 'webvr-rec-new-hmd-pose', {
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

			} else {

				var e = new CustomEvent( 'webvr-rec-set-transforms', {
					detail: {
						sittingToStandingTransform: this.stageParameters.sittingToStandingTransform
					}
				} );
				window.dispatchEvent( e );

			}

		}

		return res;

	}

	var getGamepads = navigator.getGamepads;
	navigator.getGamepads = function() {

		var res = getGamepads.apply( navigator );

		/*if( playing ) {

			var id = 0;
			[].forEach.call( res, ( c, n ) => {
				if( c && c.pose ) {
					if( controllerTracks[ id ] ) {
						var frame = controllerTracks[ id ].getFrame();
						if( frame ) {
							c.pose = copyFrameToGamepadPose( frame, c.pose );
						}
					}
					id++;
				}
			} );

			if( id < controllerTracks.length ) {

			}

		}*/

		if( recording ) {
			[].forEach.call( res, ( c, n ) => {
				if( c && c.pose ) {
					var e = new CustomEvent( 'webvr-rec-new-controller-pose', {
						detail: {
							id: n,
							timestamp: Date.now(),
							position: c.pose.position,
							linearVelocity: c.pose.linearVelocity,
							orientation: c.pose.orientation,
							angularVelocity: c.pose.angularVelocity,
						}
					} );
					window.dispatchEvent( e );
				}
			} );
		}

		return res;

	}

} + ')();';

var script = document.createElement('script');
script.textContent = source;
(document.head||document.documentElement).appendChild(script);
script.parentNode.removeChild(script);

var fileChooser = document.createElement('input');
fileChooser.type = 'file';
fileChooser.addEventListener('change', function () {

	var file = fileChooser.files[0];
	var formData = new FormData();
	formData.append(file.name, file);

	var reader = new FileReader();
	reader.onload = function(){
		var data = reader.result;
		post( { method: 'new-upload', data: data } );
	};
	reader.readAsText(file);
	form.reset(); 

});

/* Wrap it in a form for resetting */
var form = document.createElement('form');
form.appendChild(fileChooser);

