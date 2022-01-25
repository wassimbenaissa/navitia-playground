// Copyright (c) 2016 CanalTP
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

var pictos = {};

pictos.makePtPicto = function(json) {
    if ($.isArray(json)) {
        var res = $('<span/>');
        json.forEach(function(elt) {
            res.append(pictos.makePtPicto(elt));
        });
        return res;
    }

    if (!(json instanceof Object) || !('id' in json)) {
        return $('<span/>');
    }
    var img = 'Unknown';
    switch (json.id) {
    case 'physical_mode:Air': img = 'Air'; break;
    case 'physical_mode:Bike': img = 'Bike'; break;
    case 'physical_mode:BikeSharingService': img = 'BikeSharingService'; break;
    case 'physical_mode:Car': img = 'Car'; break;
    case 'physical_mode:Coach': img = 'Coach'; break;
    case 'physical_mode:Metro': img = 'Metro'; break;
    case 'physical_mode:Taxi': img = 'Taxi'; break;
    case 'physical_mode:Tramway': img = 'Tramway'; break;
    case 'physical_mode:Walking': img = 'Walking'; break;
    case 'physical_mode:CheckIn': img = 'CheckIn'; break;
    case 'physical_mode:CheckOut': img = 'CheckOut'; break;
    case 'physical_mode:Shuttle': img = 'Shuttle'; break;

    case 'physical_mode:Funicular':
    case 'physical_mode:SuspendedCableCar':
        img = 'Funicular'; break;

    case 'physical_mode:Bus':
    case 'physical_mode:BusRapidTransit':
    case 'physical_mode:Trolleybus':
        img = 'Bus'; break;

    case 'physical_mode:RapidTransit':
    case 'physical_mode:LocalTrain':
    case 'physical_mode:LongDistanceTrain':
    case 'physical_mode:Train':
    case 'physical_mode:RailShuttle':
        img = 'Train'; break;

    case 'physical_mode:Boat':
    case 'physical_mode:Ferry':
        img = 'Boat'; break;

    default:
        break;
    }

    return pictos.makeImg(img, json.name);
};

pictos.makeImg = function(img, name) {
    return pictos.makeImgFromUrl(sprintf('img/pictos/%s.svg', img), name);
};

pictos.makeImgFromUrl = function(img, name) {
    var tag = $('<img/>')
        .addClass('picto')
        .attr('src', img);
    if (name) { tag.attr('alt', name); tag.attr('title', name); }
    return tag;
};

pictos.makeSnPicto = function(mode) {
    var img = 'Unknown';
    if (mode === 'walking') {
        img = 'Walking';
    } else if (mode === 'bike') {
        img = 'Bike';
    } else if (mode.indexOf('bss') === 0) {
        img = 'BikeSharingService';
    } else if (mode === 'car' || mode === 'carnopark' || mode === 'park' || mode === 'leave_parking') {
        img = 'Car';
    } else if (mode === 'ridesharing') {
        img = 'RideSharing';
    } else if (mode === 'taxi') {
        img = 'Taxi';
    } else if (mode === 'entrance') {
        img = 'Entrance';
    } else if (mode === 'exit') {
        img = 'Exit';
    }
    return pictos.makeImg(img, mode);
};

pictos.makeEquipmentPicto = function(equipment) {
    var img = 'Unknown';
    switch (equipment) {
    case 'has_wheelchair_accessibility':
    case 'has_wheelchair_boarding':
        img = 'Wheelchair'; break;
    case 'has_bike_accepted':
    case 'has_bike_depot':
        img = 'BikeAccepted'; break;
    case 'has_air_conditioned': img = 'AirCoditioning'; break;
    case 'has_visual_announcement': img = 'HearingImpairment'; break;
    case 'has_audible_announcement': img = 'VisualImpairment'; break;
    case 'has_appropriate_escort': img = ''; break;
    case 'has_appropriate_signage': img = 'MentalDisorder'; break;
    case 'has_school_vehicle': img = 'SchoolBus'; break;
    case 'has_elevator': img = 'Elevator'; break;
    case 'has_escalator': img = 'Escalator'; break;
    case 'has_sheltered': img = 'Shelter'; break;
    }
    return pictos.makeImg(img, equipment);
};
