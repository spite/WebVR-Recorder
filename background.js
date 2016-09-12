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
	recordings: 'id,poses'
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

	return db.recordings.put( { id: recording.id, poses: recording.poses } );

}

function deleteRecording( id ) {

	return db.recordings.where( 'id' ).equals( id ).delete();

}

chrome.runtime.onConnect.addListener( function( port ) {

	log( 'New connection (chrome.runtime.onConnect) from', port.name );

	var name = port.name;

	if( name === 'popup' ) {
		port.postMessage( { method: 'recordings', recordings: recordings } );
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
						recording = { id: Date.now(), poses: { hmd: { frames: [] }, controllers: [] } };
						connections[ tabId ].contentScript.postMessage( { method: 'start-recording' } );
					break;
					case 'stop-recording':
						log( recording );
						connections[ tabId ].contentScript.postMessage( { method: 'stop-recording' } );
						saveRecording( recording ).then( _ => {
							log( 'Recording successfully saved' );
							loadRecordings().then( _ => {
								Object.keys( connections ).forEach( tabId => {
									if( connections[ tabId ].popup ) connections[ tabId ].popup.postMessage( { method: 'recordings', recordings: recordings } );
								} );
							} );
						});
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
					case 'delete-recording':
						deleteRecording( msg.value ).then( _ => {
							log( 'Recording successfully removed' );
							loadRecordings().then( _ => {
								Object.keys( connections ).forEach( tabId => {
									if( connections[ tabId ].popup ) connections[ tabId ].popup.postMessage( { method: 'recordings', recordings: recordings } );
								} );
							} );
						} );
					break;
				}
			}

			function listenerContentScript( msg, sender ) {

				//log( 'Content Script', msg );

				switch( msg.method ) {
					case 'new-hmd-pose':
					recording.poses.hmd.frames.push( msg.data );
					break;
					case 'new-controller-pose':
					if( !recording.poses.controllers[ msg.data.id ] ) recording.poses.controllers[ msg.data.id ] = { frames: [] };
					recording.poses.controllers[ msg.data.id ].frames.push( msg.data );
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
