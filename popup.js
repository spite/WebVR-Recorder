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

post( { method: 'ready' } );

port.onMessage.addListener( function( msg ) {

	/*switch( msg.action ) {
		case 'pose':
		var e = new CustomEvent( 'webvr-pose', {
			detail: {
				position: msg.position,
				rotation: msg.rotation
			}
		} );
		window.dispatchEvent( e );
		break;
	}*/

} );

ge( 'start-recording-button' ).addEventListener( 'click', e => {

	post( { method: 'start-recording' } );

} );

ge( 'stop-recording-button' ).addEventListener( 'click', e => {

	post( { method: 'stop-recording' } );

} );
