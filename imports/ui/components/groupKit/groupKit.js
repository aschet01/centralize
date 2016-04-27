// imports/ui/components/groupKit/groupKit.js
// Called by imports/ui/layouts/appBody/appBody.js

import { Locations } from '../../../api/locations/locations.js'
import { Markers } from '../../../api/markers/markers.js';
import { Places } from '../../../api/places/places.js';
import './groupKit.html';

// Dictionary to hold Marker objeccts referenced by 
//   documents in Markers collection
var markers = {};
var centerMarker = {};

Template.groupLocations.helpers({
  locations: function() {
    return Locations.find({});
  }
});

Template.placeList.helpers({
  places: function() {
    return Places.find({});
  }
});

GoogleMaps.ready('map', function(map){
  geocoder = new google.maps.Geocoder();
  placesService = new google.maps.places.PlacesService(GoogleMaps.maps.map.instance);

  Markers.find().observe({
    added: function (document) {
      var marker = new google.maps.Marker({
        position: new google.maps.LatLng(document.lat, document.lng),
        map: GoogleMaps.maps.map.instance,
      });
      markers[document._id] = marker;
      updateCenter();
    },

    changed: function (document) {
      var marker = markers[document._id];
      const newPosition = new google.maps.LatLng(document.lat, document.lng);
      marker.setPosition(newPosition);
      GoogleMaps.maps.map.instance.panTo(newPosition);
      updateCenter();
    },

    removed: function (document) {
      markers[document._id].setMap(null);
      delete markers[document._id];
      updateCenter();
    }
  });
});

Template.groupLocations.events({
  "submit .newLocation": function(event) {
    event.preventDefault();

    const inputField = document.getElementById("newLocationBox");
    const inputAddress = inputField.value;

    geocoder.geocode({'address': inputAddress}, function(results, status) {
        newLocationandMarker(inputAddress, results, status);
    });

    inputField.value = "";
  },

  "submit .existingLocation": function(event) {
    event.preventDefault();

    const modifiedForm = event.target;
    const inputAddress = modifiedForm.getElementsByTagName("input")[0].value;
    const docId = this._id

    geocoder.geocode({address: inputAddress},
      function(results, status, address=inputAddress, locationId=docId) {
        changeLocationandMarker(address, locationId, results, status);
    });
  },

  "click .removeLocation": function(event) {
    Locations.remove({_id: this._id});
    Markers.remove({_id: this._id});
  }
});


// Finds and places a marker at the geographic center (mean) Location
function updateCenter() {
  var latSum = 0;
  var lngSum = 0;
  var count = 0;

  for (x in markers) {
    var coords = markers[x].getPosition();
    latSum += coords.lat();
    lngSum += coords.lng();
    count += 1;
  }

  if (centerMarker instanceof google.maps.Marker) {
    centerMarker.setMap(null);
  }

  if (count <= 1) {
    return;
  }

  var center = new google.maps.LatLng(latSum/count, lngSum/count);
  var markerImage = {
    url: "flag.png",
    size: new google.maps.Size(20, 32),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(0, 32)
  };

  centerMarker = new google.maps.Marker({
    position: center,
    map: GoogleMaps.maps.map.instance,
    animation: google.maps.Animation.DROP,
    icon: markerImage
  });

  placesService.nearbySearch({
    location: center,
    radius: 1000,
    type: "restaurant"
  }, readPlaces);
}


// PlacesService callback function
function readPlaces(results, status) {
  if (status === google.maps.places.PlacesServiceStatus.OK) {
    clearPlaces();

    for (x in results) {
      var currPlace = results[x];
      Places.insert({name: currPlace.name})
    }
    console.log(results);
  } else {
    console.log("Places service failed: ", status);
  }
}

// Called from updateCenter
function clearPlaces() {
  var ids = [];
  const placeList = Places.find().fetch();
  for (x in placeList) {
    ids.push(placeList[x]._id);
  }

  for (x in ids) {
    Places.remove({_id: ids[x]});
  }
}

// Geocoding callback functions
function newLocationandMarker(address, results, status) {
  if (status === google.maps.GeocoderStatus.OK) {
    const newCoords = results[0].geometry.location;
    GoogleMaps.maps.map.instance.panTo(newCoords);
    
    // Create Location document with result coordinates
    var newLocation = {
      location: address,
      createdAt: new Date(),
      coords: newCoords
    }
    // Get the new _id for the matching marker
    const newId = Locations.insert(newLocation);

    //  Create Marker document 
    const newLat = newCoords.lat();
    const newLng = newCoords.lng();

    Markers.insert({_id: newId, lat: newLat, lng: newLng});

  } else {
    alert("Could not place address: " + status);
  }
}

function changeLocationandMarker(address, locationId, results, status) {
  if (status === google.maps.GeocoderStatus.OK) {
    const newCoords = results[0].geometry.location;
    Locations.update({_id: locationId}, 
                     {$set: {location: address, coords: newCoords}});

    Markers.update({_id: locationId},
                   {$set: {lat: newCoords.lat(), lng: newCoords.lng()}});

  } else {
    alert("Could not place address: " + status);
  }
}