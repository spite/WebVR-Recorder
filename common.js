"use strict";

function log() {

	console.log.apply(
		console, [
			`%c WebVR-Rec `,
			'background: #cc0000; color: #ffffff; text-shadow: 0 -1px #000; padding: 4px 0 4px 0; line-height: 0',
			...arguments
		]
	);

}

function fixSettings( settings ) {

	if( settings === undefined ) return defaultSettings;

	var res = {};

	Object.keys( defaultSettings ).forEach( f => {

		res[ f ] = ( settings[ f ] !== undefined ) ? settings[ f ] : defaultSettings[ f ];

	} );

	return res;

}

// chrome.storage can store Objects directly

function loadSettings() {

	return new Promise( ( resolve, reject ) => {

		chrome.storage.sync.get( 'settings', obj => {
			resolve( fixSettings( obj.settings ) );
		} );

	} );

}

function saveSettings( settings ) {

	return new Promise( ( resolve, reject ) => {

		chrome.storage.sync.set( { 'settings': settings }, obj => {
			resolve( obj );
		} );

	} );

}
