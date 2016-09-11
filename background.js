var extensionId = chrome.runtime.id;
log( 'Background', extensionId );

function notifyAllContentScripts( method ) {

	Object.keys( connections ).forEach( tabId => {

		connections[ tabId ].contentScript.postMessage( { method: method } );

	} );

}

var connections = {};

chrome.runtime.onConnect.addListener( function( port ) {

	log( 'New connection (chrome.runtime.onConnect) from', port.name );

	var name = port.name;

	( function() {

		chrome.tabs.query( { active: true }, e => {

			var tabId = e[ 0 ].id;

			if( !connections[ tabId ] ) connections[ tabId ] = {};
			connections[ tabId ][ name ] = port;

			function listenerPopup( msg, sender ) {

				log( 'From popup', msg );

				switch( msg.method ) {
					case 'start-recording':
						recordings = [];
						connections[ tabId ].contentScript.postMessage( { method: 'start-recording' } );
					break;
					case 'stop-recording':
						connections[ tabId ].contentScript.postMessage( { method: 'stop-recording' } );
						log( recordings );
					break;
				}
			}

			function listenerContentScript( msg, sender ) {

				switch( msg.method ) {
					case 'new-pose':
					recordings.push( msg.data );
					break;
				}

			}

			var listener = name === 'popup' ? listenerPopup: listenerContentScript;

			port.onMessage.addListener( listener );

			port.onDisconnect.addListener( function() {

				port.onMessage.removeListener( listener );

				log( name, 'disconnect (chrome.runtime.onDisconnect)' );

				Object.keys( connections ).forEach( c => {

					if( connections[ c ][ name ] === port ) {
						connections[ c ][ name ] = null;
						delete connections[ c ][ name ];
					}

					if ( Object.keys( connections[ c ] ).length === 0 ) {
						connections[ c ] = null;
						delete connections[ c ];
					}
				} )


			} );

			port.postMessage( { method: 'ack' } );

		} );

	})();

	return true;

});
