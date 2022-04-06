// Copyright (c) 2016 Hove
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use strict';

// fake includes
var request;

var storage = {};

storage._storagePrefix = 'navitia-playground.';
storage._apiStoragePrefix = storage._storagePrefix + 'api.';
storage._layerStorageKey = storage._storagePrefix + 'layer';
storage._boundsStorageKey = storage._storagePrefix + 'bounds';

storage._localStorageAvailable = function() {
    try {
	var x = '__storage_test__';
	window.localStorage.setItem(x, x);
	window.localStorage.removeItem(x);
	return true;
    }
    catch(e) {
	return false;
    }
};

storage.getApis = function() {
    if (! storage._localStorageAvailable()) { return []; }
    var apis = [];
    for (var elt in window.localStorage) {
        if (elt.indexOf(storage._apiStoragePrefix) === 0 ) {
            apis.push(elt.slice(storage._apiStoragePrefix.length));
        }
    }
    return apis;
};

storage.saveTokenFromRequest = function() {
    var api = $('input.api').val();
    var token = $('input.token').val();
    storage.saveToken(api, token);
};

storage.saveToken = function(api, token) {
    if (! storage._localStorageAvailable()) { return; }
    var key = storage._apiStoragePrefix + api;
    window.localStorage.setItem(key, token);
    request.setSaveTokenButtonStatus();
};

storage.getToken = function(api) {
    if (! storage._localStorageAvailable()) { return; }
    return window.localStorage.getItem(storage._apiStoragePrefix + api);
};

storage.saveLayer = function(data) {
    if (! storage._localStorageAvailable()) { return; }
    window.localStorage.setItem(storage._layerStorageKey, data.name);
};

storage.getLayer = function() {
    if (! storage._localStorageAvailable()) { return null; }
    return window.localStorage.getItem(storage._layerStorageKey);
};

storage.saveBounds = function(bounds) {
    if (! storage._localStorageAvailable()) { return; }
    var data = [
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()]
    ];
    window.localStorage.setItem(storage._boundsStorageKey, JSON.stringify(data));
};

storage.getBounds = function() {
    if (! storage._localStorageAvailable()) { return null; }
    return JSON.parse(window.localStorage.getItem(storage._boundsStorageKey));
};
