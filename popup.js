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
	post( { method: 'ready' } );
} );

port.onMessage.addListener( function( msg ) {

	log( msg );

	switch( msg.method ) {
		case 'recordings':
		msg.recordings.forEach( recording => {
			var o = document.createElement( 'option' );
			o.textContent = recording.id;
			ge( 'recordings-select' ).appendChild( o );
		})
		break;
	}

} );

ge( 'start-recording-button' ).addEventListener( 'click', e => {

	post( { method: 'start-recording' } );

} );

ge( 'stop-recording-button' ).addEventListener( 'click', e => {

	post( { method: 'stop-recording' } );

} );
