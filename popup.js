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
		post( { method: 'select-recording', value: e.target.value } )
	} );

	post( { method: 'ready' } );

} );

var recording = null;

port.onMessage.addListener( function( msg ) {

	log( msg );

	switch( msg.method ) {
		case 'recordings':
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
			ge( 'selected-playback' ).textContent = ge( 'recordings-select' ).options[ 0 ].textContent;
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
