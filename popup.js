function log() {

	console.log.apply(
		console, [
			`%c WebVR-Rec `,
			'background: #cc0000; color: #ffffff; text-shadow: 0 -1px #000; padding: 4px 0 4px 0; line-height: 0',
			...arguments
		]
	);

}

log( 'Popup' );

var port = chrome.runtime.connect( { name: 'popup' } );

function post( msg ) {

	port.postMessage( msg );

}

window.addEventListener( 'load', function() {

	ge( 'recordings-select' ).addEventListener( 'change', e => {
		selected = e.target.value;
		post( { method: 'select-recording', value: selected } )
	} );

	post( { method: 'ready' } );

} );

var recording = null;
var selected = 0;
var recordings = [];

port.onMessage.addListener( function( msg ) {

	log( msg );

	switch( msg.method ) {
		case 'recordings':
		recordings = msg.recordings;
		while( ge( 'recordings-select' ).firstChild ) ge( 'recordings-select' ).removeChild( ge( 'recordings-select' ).firstChild );
		if( msg.recordings.length ) {
			msg.recordings.forEach( ( recording, n ) => {
				var o = document.createElement( 'option' );
				var d = new Date( recording.id );
				o.textContent = d.toString();
				o.setAttribute( 'value', n );
				ge( 'recordings-select' ).appendChild( o );
			})
			post( { method: 'select-recording', value: 0 } )
		}
		break;
	}

} );

ge( 'start-recording-button' ).addEventListener( 'click', e => {

	post( { method: 'start-recording' } );

} );

ge( 'stop-recording-button' ).addEventListener( 'click', e => {

	post( { method: 'stop-recording' } );

} );

ge( 'start-playback-button' ).addEventListener( 'click', e => {

	post( { method: 'start-playing' } );

} );

ge( 'stop-playback-button' ).addEventListener( 'click', e => {

	post( { method: 'stop-playing' } );

} );

ge( 'delete-playback-button' ).addEventListener( 'click', e => {

	post( { method: 'delete-recording', value: recordings[ selected ].id } );

} );

ge( 'download-recording-button' ).addEventListener( 'click', e => {

	post( { method: 'download-recording', value: selected } );

} );