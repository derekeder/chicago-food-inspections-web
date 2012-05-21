/*------------------------------------------------------------------+
| Functions used for searchable fusion table maps                  |
| Requires jQuery                                                  |
+-------------------------------------------------------------------*/

var map;
var geocoder;
var addrMarker;
var addrMarkerImage = 'http://derekeder.com/images/icons/blue-pushpin.png';

var fusionTableId = 3443286; //replace this with the ID of your fusion table

var searchRadius = 805; //in meters ~ 1/2 mile
var recordName = "inspection";
var recordNamePlural = "inspections";
var searchrecords;

var searchStr;
var searchRadiusCircle;

google.load('visualization', '1', {}); //used for custom SQL call to get count

function initialize() {
  initializeDateSlider();
  $( "#resultCount" ).html("");

	geocoder = new google.maps.Geocoder();
  var chicago = new google.maps.LatLng(41.889667, -87.701446);
  var myOptions = {
    zoom: 12,
    center: chicago,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  map = new google.maps.Map($("#map_canvas")[0],myOptions);

  $("#ddlRadius").val("805");
  
  $("#cbResult1").attr("checked", "checked"); 
  $("#cbResult2").attr("checked", "checked"); 
  $("#cbResult3").attr("checked", "checked");
  $("#cbResult4").attr("checked", "");
  
  searchrecords = null;
  $("#txtSearchName").val("");
  $("#txtSearchAddress").val("");
  doSearch();
}

function initializeDateSlider() {
	var minDate = new Date(2010, 1-1, 1);
    var maxDate = new Date();
    var initialStartDate = new Date();
    initialStartDate.setDate(maxDate.getDate() - 120);
    $('#minDate').html($.datepicker.formatDate('M yy', minDate));
    $('#maxDate').html($.datepicker.formatDate('M yy', maxDate));
    
    $('#startDate').html($.datepicker.formatDate('mm/dd/yy', initialStartDate));
    $('#endDate').html($.datepicker.formatDate('mm/dd/yy', maxDate));
    
    $('#date-range').slider({
    	range: true,
    	step: 30,
    	values: [ Math.floor((initialStartDate.getTime() - minDate.getTime()) / 86400000), Math.floor((maxDate.getTime() - minDate.getTime()) / 86400000) ],
        max: Math.floor((maxDate.getTime() - minDate.getTime()) / 86400000),
        slide: function(event, ui) {
            var date = new Date(minDate.getTime());
            date.setDate(date.getDate() + ui.values[0]);
            $('#startDate').html($.datepicker.formatDate('mm/dd/yy', date));
            date = new Date(minDate.getTime());
            date.setDate(date.getDate() + ui.values[1]);
            $('#endDate').html($.datepicker.formatDate('mm/dd/yy', date));
        },
        stop: function(event, ui) {
        	doSearch();
        }
    });
  }

function doSearch() 
{
	clearSearch();
	var address = $("#txtSearchAddress").val();
	searchRadius = $("#ddlRadius").val();
	
	var result1 = $("#cbResult1").is(':checked');
	var result2 = $("#cbResult2").is(':checked');
	var result3 = $("#cbResult3").is(':checked');
	var result4 = $("#cbResult4").is(':checked');
	
	searchStr = "SELECT Location FROM " + fusionTableId + " WHERE Location not equal to ''";
	
	//-----filter by type-------
	var searchType = "'Results' IN (-1,";
  if (result1)
		searchType += "1,";
	if (result2)
		searchType += "2,";
	if (result3)
		searchType += "3,";
  if (result4)
		searchType += "4,";

  searchStr += " AND " + searchType.slice(0, searchType.length - 1) + ")";
  
  //date range
  searchStr += " AND 'Inspection Date' >= '" + $('#startDate').html() + "'";
  searchStr += " AND 'Inspection Date' <= '" + $('#endDate').html() + "'";
  
  //business name
  var name = $("#txtSearchName").val();
  
  if (name != "") {
    name = name.replace("'", "\\'");
		searchStr += " AND 'AKA Name' contains ignoring case '" + name + "'";
  }
	
	// because the geocode function does a callback, we have to handle it in both cases - when they search for and address and when they dont
	if (address != "") {
		if (address.toLowerCase().indexOf("chicago") == -1)
			address = address + " chicago";
    _trackClickEventWithGA("Search", "Chicago Food Inspections", address);

		geocoder.geocode( { 'address': address}, function(results, status) {
		  if (status == google.maps.GeocoderStatus.OK) {
  			//console.log("found address: " + results[0].geometry.location.toString());
  			map.setCenter(results[0].geometry.location);
  			map.setZoom(14);
  			
  			addrMarker = new google.maps.Marker({
  			  position: results[0].geometry.location, 
  			  map: map, 
  			  icon: addrMarkerImage,
  			  animation: google.maps.Animation.DROP,
  			  title:address
  			});
  			drawSearchRadiusCircle(results[0].geometry.location);
  			
  			searchStr += " AND ST_INTERSECTS(Location, CIRCLE(LATLNG" + results[0].geometry.location.toString() + "," + searchRadius + "))";
  			
  			//get using all filters
  			//console.log(searchStr);
  			searchrecords = new google.maps.FusionTablesLayer(fusionTableId, {
  				query: searchStr
  		  });
  		
  			searchrecords.setMap(map);
  			displayCount(searchStr);
		  } 
		  else {
		    alert("We could not find your address: " + status);
		  }
		});
	}
	else {
		//get using all filters
		//console.log(searchStr);
		searchrecords = new google.maps.FusionTablesLayer(fusionTableId, {
			query: searchStr
		});
	
		searchrecords.setMap(map);
		displayCount(searchStr);
	}
}

function clearSearch() {
	if (searchrecords != null)
		searchrecords.setMap(null);
	if (addrMarker != null)
		addrMarker.setMap(null);	
	if (searchRadiusCircle != null)
		searchRadiusCircle.setMap(null);
}

function findMe() {
  // Try W3C Geolocation (Preferred)
  var foundLocation;
  
  if(navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
      addrFromLatLng(foundLocation);
    }, null);
  }
  else {
  	alert("Sorry, we could not find your location.");
  }
}

function addrFromLatLng(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#txtSearchAddress').val(results[1].formatted_address);
          $('.hint').focus();
          doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  }

function drawSearchRadiusCircle(point) {
    var circleOptions = {
      strokeColor: "#4b58a6",
      strokeOpacity: 0.3,
      strokeWeight: 1,
      fillColor: "#4b58a6",
      fillOpacity: 0.05,
      map: map,
      center: point,
      clickable: false,
      zIndex: -1,
      radius: parseInt(searchRadius)
    };
    searchRadiusCircle = new google.maps.Circle(circleOptions);
}

function getFTQuery(sql) {
	var queryText = encodeURIComponent(sql);
	return new google.visualization.Query('http://www.google.com/fusiontables/gvizdata?tq='  + queryText);
}

function displayCount(searchStr) {
  //set the query using the parameter
  searchStr = searchStr.replace("SELECT Location ","SELECT Count() ");
  console.log(searchStr);
  //set the callback function
  getFTQuery(searchStr).send(displaySearchCount);
}

function displaySearchCount(response) {
  var numRows = 0;
  if (response.getDataTable().getNumberOfRows() > 0)
  	numRows = parseInt(response.getDataTable().getValue(0, 0));
  var name = recordNamePlural;
  if (numRows == 1)
	name = recordName;
  $( "#resultCount" ).fadeOut(function() {
      $( "#resultCount" ).html(addCommas(numRows) + " " + name + " found");
    });
  $( "#resultCount" ).fadeIn();
}

function getLeaderboard() {
	 var sql = "SELECT 'License #', 'AKA Name', 'Address', 'Inspection Date', 'Results' ";
	 sql += "FROM " + fusionTableId + " WHERE 'Facility Type' = 'Restaurant' AND 'Risk' = 'Risk 1 (High)' ";
	 sql += "AND Results <= 3 ";
	 sql += "ORDER BY 'Inspection Date' ASC LIMIT 100 ";
	 
	  //set the callback function
	  //console.log(getFTQuery(sql));
	  getFTQuery(sql).send(displayLeaderboard);
}

function displayLeaderboard(response) {
  var table = "";
  numRows = response.getDataTable().getNumberOfRows();
  
  var count = 1;
  if (numRows > 0) {
    for(i = 0; i < numRows; i++) {
      var license = response.getDataTable().getValue(i, 0);
      var name = response.getDataTable().getValue(i, 1);
      var address = response.getDataTable().getValue(i, 2);
      var dateInspected = Date.parse(response.getDataTable().getValue(i, 3));
      var results = response.getDataTable().getValue(i, 4);
      if (results == "1") results = "<span class='label-green'>Passed</span>";
      else if (results == "2") results = "<span class='label-yellow'>Passed w/ conditions</span>";
      else if (results == "3") results = "<span class='label-red'>Failed</span>";
      
      var daysSince = parseInt((new Date() - dateInspected) / (1000 * 60 * 60 * 24));
      
    	table += "<tr>";
    	table += "<td>" + count + "</td>";
      table += "<td><h3><a href='http://www.yelp.com/search?find_desc=" + name + "&find_loc=" + address + "&ns=1'>" + name + "</a></h3></td>";
      table += "<td>" + address + "</td>";
      table += "<td>" + daysSince + " days <br /> <span class='mute'>" + $.format.date(new Date(dateInspected), "MMM dd, yyyy") + "</span></td>";
      table += "<td>" + results + "</td>";
      table += "<td id='closed-" + license + "'></td>";
      table += "</tr>";
      
      //var yelp = new YelpApi.Search(name, address, license);
      
      count++;
    }
    
    //console.log(table);
    $("#leaderboard-content").html(table);
  }
}

function addCommas(nStr) {
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}