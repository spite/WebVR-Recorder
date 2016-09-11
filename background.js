var extensionId = chrome.runtime.id;
log( 'Background', extensionId );

function notifyAllContentScripts( method ) {

	Object.keys( connections ).forEach( tabId => {

		connections[ tabId ].contentScript.postMessage( { method: method } );

	} );

}

var connections = {};

chrome.runtime.onConnect.addListener( function( port ) {

	log( 'New connection (chrome.runtime.onConnect) from', port.name, port.sender.frameId, port );

	var name = port.name;

	function listenerPopup( msg, sender ) {

		log( 'From popup', msg );

		switch( msg.method ) {
			case 'start-recording':
			notifyAllContentScripts( 'start-recording' );
			break;
			case 'stop-recording':
			notifyAllContentScripts( 'stop-recording' );
			break;
		}
	}

	function listener( msg, sender ) {

		var tabId;

		if( msg.tabId ) tabId = msg.tabId
		else tabId = sender.sender.tab.id;

		if( !connections[ tabId ] ) connections[ tabId ] = {};
		connections[ tabId ][ name ] = port;

		switch( msg.method ) {
			case 'new-pose':
			log( msg.data );
			break;
		}

	}

	port.onMessage.addListener( name === 'popup' ? listenerPopup: listener );

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

	return true;

});
