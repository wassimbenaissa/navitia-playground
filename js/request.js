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
var storage;
var autocomplete;
var utils;

var request = {};

request.setSaveTokenButtonStatus = function() {
    var api = $('#api input.api').val();
    var token = $('#token input.token').val();
    $('button.save').prop('disabled', storage.getToken(api) === token);
};

request.updateAddPathAC = function(val){
    var input = $(val).prev();
    if (! input.hasClass('path')) {
        return;
    }
    if (! $('input path').length) {
        // No more path inputs, we should update autocomplete of add
        autocomplete.addKeyAutocomplete($('#addPathInput'), 'pathKey');
    }
};

request.getFocusedElemValue = function(elemToTest, focusedElem, noEncoding) {
    var value = $(elemToTest).is('input') ? elemToTest.value : $(elemToTest).text();
    if (! noEncoding) { value = encodeURIComponent(value); }
    if (focusedElem === elemToTest) {
        return sprintf('<span class="focusedParam">%s</span>', value);
    } else {
        return value;
    }
};

request.urlElements = function(focusedElem) {
    var api = request.getFocusedElemValue($('#api input.api')[0], focusedElem, true);
    if (api.slice(-1) === '/') { api = api.slice(0, -1); }

    var path = '';
    $('#path .key, #path input.value').each(function(){
        path += '/' + request.getFocusedElemValue(this, focusedElem);
    });
    var feature = request.getFocusedElemValue($('#featureInput')[0], focusedElem);

    var parameters = '?';
    $('#parameters .key, #parameters input.value').each(function(){
        parameters += request.getFocusedElemValue(this, focusedElem);
        if ($(this).hasClass('key')) {
            parameters += '=';
        }
        if ($(this).hasClass('value')) {
            parameters += '&';
        }
    });
    return {'api': api, 'path': path, 'parameters': parameters, 'feature': feature};
};

request.finalUrl = function(focusedElem) {
    var elements = request.urlElements(focusedElem);
    if (focusedElem === undefined) {
        // called without arg, we want pure text
        return elements.api + elements.path + '/' + elements.feature + elements.parameters;
    } else {
        // with arg, we want a rendering thing
        return sprintf('<span class="api">%s</span>' +
                       '<span class="path">%s</span>' +
                       '<span class="feature">/%s</span>' +
                       '<span class="parameters">%s</span>',
                       elements.api, elements.path, elements.feature, elements.parameters);
    }
};

request.updateUrl = function(focusedElem) {
    var link = request.finalUrl();
    var text = request.finalUrl(focusedElem);
    $('#requestUrl').html($('<a/>').attr('href', link).html(text));
};

request.makeDeleteButton = function() {
    return $('<button/>')
        .html('<img src="img/delete.svg">')
        .click(function() {
            $(this).closest('.toDelete').remove();
            request.updateAddPathAC(this);
            request.updateUrl(this);
        });
};

request.makeTemplatePath = function(val, input) {
    var templateFilled = false;
    var isTemplateFilled = function() {
        var curVal = input.val();
        if (! templateFilled && curVal !== val && curVal !== '') {
            input.closest('.inputDiv').removeClass('templateInput');
            templateFilled = true;
        }
        return templateFilled;
    };
    input.closest('.inputDiv').addClass('templateInput');
    input.focus(function() {
        if (! isTemplateFilled()) { this.value = ''; }
    }).blur(function() {
        if (! isTemplateFilled()) { this.value = val; }
    });
};

request.makeKeyValue = function(key, val, cls) {
    var res = $('<div/>')
        .addClass('inputDiv')
        .addClass('toDelete')
        .append(' ');

    res.append($('<span/>').addClass('key').text(key));

    var valueElt = $('<input/>')
        .attr('type', 'text')
        .attr('autocomplete', 'off')
        .attr('placeholder', 'type your value here')
        .addClass('value')
        .addClass(cls)
        .focus(function() { this.select(); })
        .val(val)
        .appendTo(res);
    res.append($('<span class="tooltips">'));
    res.append(request.makeDeleteButton());

    autocomplete.valueAutoComplete(valueElt, key);
    valueElt.on('input', function() { request.updateUrl(this); });
    valueElt.focus(function() { request.updateUrl(this); });
    if (utils.isTemplate(val)) { request.makeTemplatePath(val, valueElt); }

    return res;
};

request.insertPathElt = function() {
    var key = $('#addPathInput').val();
    $('#addPathElt').before(request.makeKeyValue(key, '', 'path'));
    autocomplete.addKeyAutocomplete($('#addPathInput'), 'pathKey');
    $('#addPathInput').val('').change();
    $('#addPathElt').prev().find('input').first().focus();
};

request.insertParam = function() {
    var key = $('#addParamInput').val();
    $('#addParam').before(request.makeKeyValue(key, '', 'parameters'));
    $('#addParamInput').val('').change();
    $('#addParam').prev().find('input').first().focus();
};

request.submit = function() {
    var url = '?request=' + encodeURIComponent(request.finalUrl());
    var token = $('#token input.token').val();
    if (storage.getToken($('#api input.api').val()) !== token) {
        url += '&token=' + encodeURIComponent(token);
    }
    window.location = url;
};

request.getCoverage = function() {
    var prevIsCoverage = false;
    var coverage = null;
    $('#path .key, #path input.value').each(function() {
        if (prevIsCoverage) {
            coverage = $(this).val();
        }
        prevIsCoverage = $(this).text() === 'coverage';
    });
    return coverage;
};

request.parseUrl = function() {
    var search = new URI(window.location).search(true);
    var req = search.request;
    if (req === undefined) { return null; }

    var req_uri = new URI(req);
    var api = req_uri.origin();
    var paths = req_uri.path().split('/');
    paths = paths.length === 1 ? [] : paths.slice(1);
    var api_path = [];

    var vxxFound = false;
    paths.forEach(function(r) {
        if (vxxFound) {
            api_path.push(decodeURIComponent(r));
        } else {
            api += '/' + decodeURIComponent(r);
            vxxFound = /^v\d+$/.test(r);
        }
    });
    if (! vxxFound) {
        api = req_uri.origin();
        api_path = paths.map(decodeURIComponent);
        utils.notifyWarn('Version not found in the URL. Maybe you forgot "/v1" at the end of the API?');
    }

    var params = req_uri.search(true);

    var token = search.token;

    if (token === undefined) {
        if (req_uri.username()) {
            token = req_uri.username();
            api = new URI(api).username('').toString();
        } else { token = storage.getToken(api); }
    }

    return {
        token: token,
        request: req,
        api: api,
        path: api_path,
        query: params === undefined ? {} : params
    };
};

request.setAutocomplete = function(){
    autocomplete.addKeyAutocomplete($('#featureInput'), 'features');
    autocomplete.addKeyAutocomplete($('#addPathInput'), 'pathKey');
    autocomplete.addKeyAutocomplete($('#addParamInput'), 'paramKey');
    autocomplete.apiAutocomplete();
};

request.keyboardSubmit = function() {
    $(document).keydown(function(event) {
        // control+enter, or option+enter on OS X
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            request.submit();
        }
    });
};

request.manage = function() {
    // save token
    request.setSaveTokenButtonStatus();
    $('input.token')
        .change(request.setSaveTokenButtonStatus)
        .on('input', request.setSaveTokenButtonStatus);

    // hidden token management
    $('input.token').focusin(function() { $(this).attr('type', 'text'); })
        .focusout(function() { $(this).attr('type', 'password'); });

    // Manage add input/button
    $('button.add').prop('disabled', true);
    $('.addInput').on('input change', function() {
        $(this).parent().find('button.add').prop('disabled', this.value.length === 0);
    });
    $('.addInput').keyup(function(event) {
        if (event.keyCode === 13) {
            $(this).parent().find('button.add').click();
        }
    });

    $('#request input').focus(function() { this.select(); });

    var req = request.parseUrl();

    if (req === null) {
        request.setAutocomplete();
        return;
    }

    if (req.token === undefined) { req.token = ''; }
    $('#token input.token').attr('value', req.token);
    $('#api input.api').attr('value', req.api);
    request.setSaveTokenButtonStatus();

    var prevPathElt = null;
    req.path.forEach(function(r) {
        if (prevPathElt === null) {
            prevPathElt = r;
        } else {
            $('#addPathElt').before(request.makeKeyValue(prevPathElt, r, 'path'));
            prevPathElt = null;
        }
    });
    if (prevPathElt !== null) {
        $('#featureInput').val(prevPathElt);
    }

    var addParam = $('#addParam');
    for (var key in req.query) {
        if (! req.query.hasOwnProperty(key)) { continue; }
        var value = req.query[key];
        // a list of params, ex.: forbidded_uris[]
        if (Array.isArray(value)) {
            value.forEach(function(v){
                addParam.before(request.makeKeyValue(decodeURIComponent(key), decodeURIComponent(v), 'parameters'));
            });
        } else {
            addParam.before(request.makeKeyValue(decodeURIComponent(key), decodeURIComponent(value), 'parameters'));
        }
    }
    request.setAutocomplete();
    request.updateUrl(null);
};
