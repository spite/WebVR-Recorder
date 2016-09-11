var extensionId = chrome.runtime.id;
log( 'Background', extensionId );

var settings = {};

var defaultSettings = {

	recordings: []

};

loadSettings().then( res => {
	settings = res;
	log( 'Script and settings loaded', settings );
} );

function notifyAllContentScripts( method ) {

	Object.keys( connections ).forEach( tabId => {

		connections[ tabId ].contentScript.postMessage( { method: method } );

	} );

}

var connections = {};
var recording = {};
var recordingIDs = [];
var recordings = [];
var playingRecording = null;

var db = new Dexie( 'webvr-recordings' );
db.version(1).stores({
	recordings: 'id,frames'
});
db.open().catch(function (e) {
	log ( `Open failed: ${e}` );
});
loadRecordings().then( _ => {
	recordingIDs = recordings.map( r => r.id );
	log( 'Notifying recordings', recordingIDs, recordings );
})

function loadRecordings() {

	return db.recordings.toArray().then( e => recordings = e );

}

function saveRecording( recording ) {

	db.recordings.put( { id: recording.id, frames: recording.frames } ).then( function(){
		log( 'Recording successfully saved' );
	})

}

chrome.runtime.onConnect.addListener( function( port ) {

	log( 'New connection (chrome.runtime.onConnect) from', port.name );

	var name = port.name;

	if( name === 'popup' ) {
		port.postMessage( { method: 'recordings', recordings: recordings } );
		port.postMessage( { method: 'set-recording', recording: recordings[ 0 ] } );
	}

	( function() {

		chrome.tabs.query( { active: true }, e => {

			var tabId = e[ 0 ].id;

			if( !connections[ tabId ] ) connections[ tabId ] = {};
			connections[ tabId ][ name ] = port;

			function listenerPopup( msg, sender ) {

				log( 'Popup', msg );

				switch( msg.method ) {
					case 'start-recording':
						recording = { id: performance.now(), frames: [] };
						connections[ tabId ].contentScript.postMessage( { method: 'start-recording' } );
					break;
					case 'stop-recording':
						connections[ tabId ].contentScript.postMessage( { method: 'stop-recording' } );
						saveRecording( recording );
					break;
					case 'select-recording':
						connections[ tabId ].contentScript.postMessage( { method: 'set-recording', recording: recordings[ msg.value ] } );
					break;
					case 'start-playing':
						connections[ tabId ].contentScript.postMessage( { method: 'start-playing' } );
					break;
					case 'stop-playing':
						connections[ tabId ].contentScript.postMessage( { method: 'stop-playing' } );
					break;
				}
			}

			function listenerContentScript( msg, sender ) {

				log( 'Content Script', msg );

				switch( msg.method ) {
					case 'new-pose':
					recording.frames.push( msg.data );
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
