//http://bl.ocks.org/KoGor/5685876
//https://bl.ocks.org/mbostock/4060606
//http://bl.ocks.org/mpmckenna8/af23032b41f0ea1212563b523e859228 - example of toposjson with leaflet, infobox, etc


/*************************/
/*****  CROSSFILTER  *****/
/*************************/
var cf = crossfilter(data);
console.log(data);

var epiWkDim = cf.dimension(function(d) {return d.epiwk;});
var malDim = cf.dimension(function(d){if (d.mal!='') {return d.mal;}});
var provDim = cf.dimension(function(d) {return d.prov;});
//var zsDim = cf.dimension(function(d) {return d.zs_pc;});
var zsDim = cf.dimension(function(d) {if (d.zs_pc=='') {return 'cod200xxx';} else {return d.zs_pc}});

var casesByZsGroup = zsDim.group().reduceSum(function (d) {return d.cas;});
console.log("Cases by Zone: ", casesByZsGroup.top(Infinity));
var deathsByZsGroup = zsDim.group().reduceSum(function (d) {return d.dec;});
//console.log("Deaths by Zone: ", deathsByZsGroup.top(Infinity));

var all = cf.groupAll();


/********************************/
/******  GLOBAL VARIABLES  ******/
/********************************/

//Global namespace
var g = {};

//Create list of diseases in data
var lookup = {};
g.diseaseList = [];
for (var item, i=0; item = data[i++];) {
  var mal = item.mal;
  if (!(mal in lookup)) {
    lookup[mal] = 1;
    g.diseaseList.push(mal);
  }
}
g.diseaseList.sort();

//Set color variables for map
g.mapcolors = {};
g.mapcolors.color_min = '#ffffcc';
g.mapcolors.color_max = '#800026';
g.mapcolors.color_zero = '#d3d3d3';
g.mapcolors.color_boundary = '#6495ED';

//Declare 'current' variables
g.currentvars = {};
g.currentvars.currentDisease;
g.currentvars.currentMinVal;
g.currentvars.currentMaxVal;


/***************/
/****  MAP  ****/
/***************/
/*function colorAllGeoms(data) {
	data.features.forEach(function(d,i) {
		d3.selectAll('.dashgeom'+d.properties.pcode);  
	});
}*/

/*function colorAllGeoms() {
	//console.log("in colorAllGeoms: ", data)
	casesByZsGroup.top(Infinity).forEach(function(d,i) {    //d=pcode, i=count
		//console.log(d,i);
		color = getFillColor(d.key);   
		d3.selectAll('.dashgeom'+d.key)
			.attr('fill', color);
			//.attr('weight', 2)
			//.attr('dashArray', '2')
			//.attr('fillOpacity', 0.5); 
	});
}
*/

function getCurrentPolyVars() {
	var currentValues = casesByZsGroup.top(Infinity);
	g.currentvars.currentMinVal = 0;
	g.currentvars.currentMaxVal = 0;
	for (var i=0; i<=currentValues.length-1; i++) {
		if (currentValues[i].key != 'cod200xxx') {
			if (g.currentvars.currentMinVal > currentValues[i].value) {g.currentvars.currentMinVal = currentValues[i].value};
			if (g.currentvars.currentMaxVal < currentValues[i].value) {g.currentvars.currentMaxVal = currentValues[i].value};
		}
	}
	//console.log("min - max: ", g.currentvars.currentMinVal, g.currentvars.currentMaxVal);

	var color = d3.scale.linear().domain([1,g.currentvars.currentMaxVal])
    	.interpolate(d3.interpolateHcl)
    	.range([d3.rgb(g.mapcolors.color_min), d3.rgb(g.mapcolors.color_max)]);
	//var colorList = ['#ffffb2','#fecc5c','#fd8d3c','#f03b20','#bd0026'];
	var currentPolyVars = {};
	
	//console.log("polysToFill: ", polysToFill);
	for (var i=0; i<=currentValues.length-1; i++) {
		currentPolyVars[currentValues[i].key] = {};
		currentPolyVars[currentValues[i].key]['value'] = currentValues[i].value;
		currentValues[i].value==0? currentPolyVars[currentValues[i].key]['color'] = g.mapcolors.color_zero : currentPolyVars[currentValues[i].key]['color'] = color(currentValues[i].value); 
	}
    return currentPolyVars;
}



function colorMap() {
	var currentMapData = getCurrentPolyVars();
    //console.log("currentMapData: ", currentMapData);

    geozs.features.forEach(function(d,i) {
    	//var pcode = d.properties.pcode;
    	//console.log("in colorMap: ", d.properties.pcode, currentMapData[d.properties.pcode]);
    	try {
        	var coco = currentMapData[d.properties.pcode].color;
        } catch(e) {
        	var coco = g.mapcolors.color_zero; //if no data then set to minimum color (value=0)
        }
		d3.selectAll('.dashgeom'+d.properties.pcode)
			.attr('fill', coco);
	});

	updateMapLegend(g.currentvars.currentMinVal, g.currentvars.currentMaxVal);
}

function updateMapInfo(zs_name, zs_pcode, prov_name) {
	//console.log("currentMapData: ", currentMapData)
	//console.log(zs_name, zs_pcode, prov_name)
	try {
		try {
			var val = d3.format(",.0f")(currentMapData[zs_pcode].value);
		} catch(e) {
			var val = 0;
		}
		infoUpdate = (zs_name && zs_pcode && prov_name) ? "<h4>"+zs_name+", "+prov_name+ "</h4>Cas: " +  val : "Survolez une région"  
	} catch(e) {
		infoUpdate = "<p><i>ERROR</i></p>"
	}
	$('.mapinfo').html(infoUpdate);	  //HEIDI - jquery - do we really need this?
}; 


function initMapLegend() {
	var margin = {
		top: 10,
		right: 10,
		bottom: 10, 
		left: 10
	};
	var width = 200; 
	var height = 80; 

    //SVG container
	var svg = d3.select("#map-legend")
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + (margin.left + width/2) + "," + ((margin.right+height)*-2) + ")");

	return svg;

}


function updateMapLegend(min, max) {
	//console.log("updateMapLegend: ", min, max, currentMapData)
	d3.select(".maplegend").select("svg").remove();

    //Create gradient for legend 
	var margin = {
		top: 0,
		right: 10,
		bottom: 0, 
		left: 10
	};
	var width = 200; 
	var height = 50; 

    //SVG container
	var svg = d3.select(".maplegend")
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + (margin.left + width/2) + "," + (margin.top + height/2) + ")");

	var colorScale = d3.scale.linear()
		.domain([1,g.currentvars.currentMaxVal])
    	.interpolate(d3.interpolateHcl)
    	.range([d3.rgb(g.mapcolors.color_min), d3.rgb(g.mapcolors.color_max)]);

	//Extra scale since color scale is interpolated
	var tempScale = d3.scale.linear()
		.domain([1, max])
		.range([0, width]);   

	//Calculate variables for gradient
	var numStops = 10;
	tempRange = tempScale.domain();
	tempRange[2] = tempRange[1] - tempRange[0];
	tempPoint = [];
	for(var i = 0; i < numStops; i++) {
		tempPoint.push(i * tempRange[2]/(numStops-1) + tempRange[0]);
	}

	//Create gradient
	svg.append("defs")
		.append("linearGradient")
		.attr("id", "legend-vals") 
		.attr("x1", "0%").attr("y1", "0%")
		.attr("x2", "100%").attr("y2", "0%")
		.selectAll("stop") 
		.data(d3.range(numStops))                
		.enter().append("stop") 
		.attr("offset", function(d,i) { return tempScale( tempPoint[i] )/width; })   
		.attr("stop-color", function(d,i) { return colorScale( tempPoint[i] ); });

	//Draw legend...
	var legendWidth = width;

	//Color legend container
	var legendsvg = svg.append("g")
		.attr("class", "legendWrapper")
		.attr("transform", "translate(" + 0 + "," + 0 + ")");

	//Draw rectangle
	legendsvg.append("rect")
		.attr("class", "legendRect")
		.attr("x", -legendWidth/2)
		.attr("y", 0)
		.attr("rx", 8/2)
		.attr("width", legendWidth)
		.attr("height", 8)
		.style("fill", "url(#legend-vals)");
		
	//Append title
	legendsvg.append("text")
		.attr("class", "legend-title")
		.attr("x", -legendWidth/2)
		.attr("y", -5)
		.style("text-anchor", "left")
		.text("Nombre de Cas");

	//Set scale for x-axis
	var xScale = d3.scale.linear()
		.range([-legendWidth/2, legendWidth/2])
		.domain([1, max]);

	//Define x-axis
	var xAxis = d3.svg.axis()
		.orient("bottom")
		.ticks(5)
		.tickFormat(function(d) { return d; })
		.scale(xScale);

	//Set up x-axis
	legendsvg.append("g")
		.attr("class", "legend-axis")
		.attr("transform", "translate(0," + (5) + ")")
		.call(xAxis);

}





function generateMap(id, responseText, data){ 		
	//console.log("in generateMap");

	currentMapData = getCurrentPolyVars();
    console.log("currentMapData: ", currentMapData);
	
	function style(feat, i){
        try {
        	var coco = currentMapData[feat.properties.pcode].color;
        } catch(e) {
        	var coco = g.mapcolors.color_zero;
        }
        return {fillColor: coco, 
                fillOpacity: 0.8,
                weight: 0.8,
                color: g.mapcolors.color_boundary, 
            	className: 'dashgeom dashgeom'+feat.properties.pcode
            	}
    }

    var baselayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution:'&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }); 

    var map = L.map('map', {
        center: [-4.0,22.0],  
        zoom: 5,
        minZoom: 2,
        maxZoom: 15,
        layers: [baselayer],
        defaultExtentControl: true
    }); 


	//try/catch json parsing of responseText
    try {
        topoob = JSON.parse(responseText)
        geozs = topojson.feature(topoob, topoob.objects.rdc_zs)
        geozs.features = geozs.features.map(function(fm,i){
            var ret = fm;
            //ret.indie = i;
            return ret
        });
        geojson = L.geoJson(geozs, {style:style, onEachFeature: onEachFeature})
					.addTo(map);
        }
    catch(e){
        geojson = {};
        console.log(e)
    }
    //console.log(geozs)


    var mapInfo = L.control({position: 'topright'});
    mapInfo.onAdd = function(map) {
    	var infoDiv = L.DomUtil.create('infoDiv', 'mapinfo');   //create a div with class'mapinfo'
		updateMapInfo('', '', '');
		return infoDiv;
    }

    mapInfo.addTo(map);


	var mapLegend = L.control({position: 'bottomleft'});			
	mapLegend.onAdd = function (map) {	
		svg = L.DomUtil.create('svg', 'maplegend'); 	// create an svg with class 'maplegend'
		return svg;
	};
	mapLegend.addTo(map);


	document.getElementById('btn_reset').onclick = function(abc) {    //zoom to extent when user clicks on reset button
        var pos = abc.target.getAttribute('data-position');
        var zoom = abc.target.getAttribute('data-zoom');
        if (pos && zoom) {
            var locat = pos.split(',');
            var zoo = parseInt(zoom);
            map.setView(locat, zoo, {animation: true});
			//console.log("data-position: ", pos, "data-zoom: ", zoom);
            return false;
        }
    }  


	function highlightFeature(e){
		var layer = e.target;
		try {
        	var coco = currentMapData[layer.feature.properties.pcode].color;
        } catch(e) {
        	var coco = g.mapcolors.color_zero;
        }
		layer.setStyle({
			weight: 5,			//boundary weight
			//opacity: 1,		//boundary opacity
		    color: '#665',   	//boundary color 
			dashArray: '',		//boundary - length of dashes
			fillColor: coco,	//polygon fill color
			fillOpacity: 0.8	//polygon fill opacity
		})
	    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
		updateMapInfo(layer.feature.properties.name, layer.feature.properties.pcode, layer.feature.properties.lvl3_name);
	}

	function resetHighlight(e){
		var layer = e.target;
		//console.log(layer.feature.properties.pcode, currentMapData[layer.feature.properties.pcode]);
		try {
        	var coco = currentMapData[layer.feature.properties.pcode].color;
        } catch(e) {
        	var coco = g.mapcolors.color_zero;
        }

		layer.setStyle({
			weight: 0.8,			//boundary weight
			//opacity: 1,			//boundary opacity
		    color: g.mapcolors.color_boundary, //'#665',   	//boundary color
			//dashArray: '',		//boundary - length of dashes
			fillColor: coco, 		//polygon fill color
			fillOpacity: 0.8		//polygon fill opacity
		})
		updateMapInfo('', '', '');
	}


	function zoomToFeature(e) {
		map.fitBounds(e.target.getBounds());
	}

	function onEachFeature(feature, layer){
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight, 
			//click: zoomToFeature,   //here will want to 'select'
			dblclick: zoomToFeature
		})
	}

	/* function onEachFeature(feature, layer) {	
		layer.on("mouseover", function(f,l) {
      //console.log("MOUSEOVER: ", f.target.feature.properties.name)
			//infodata = [f.target.feature.properties.name, '2015','HA', 'HOOO']; //getInfoData(f.target.feature.properties.adm0_iso);
			/*if (infodata[0]=='') {
				infodata[0] = f.target.feature.properties.name_eng,
				infodata[1] = currentYr
			}; 
			updateInfo(f.target.feature.properties.name + ', ' + f.target.feature.properties.lvl3_name, getValue(f.target.feature.properties.pcode));
		});
		layer.on("mouseout", function(f,l) {
      //console.log("MOUSEOUT: ", f.target.feature.properties.name)
			updateInfo('','');
		}); 
		layer.on("click", function(f,l) {
			if (getInfoData(f.target.feature.properties.adm0_iso)[0] != '') {		//if there exists data for this feature
				addCountryLine('#linegraph', f.target.feature.properties.adm0_iso, 'perm');
			};
		}); 
		layer.on("dblclick", function(f,l) {			
			if (getInfoData(f.target.feature.properties.adm0_iso)[0] != '') {		//if there exists data for this feature
				removeCountryLine('#linegraph', f.target.feature.properties.adm0_iso, 'perm');
			};
			//zoomToFeature;
		}); 
	} */

}


function updateMap(id,data){ 
 	//console.log("In updateMap, map object = ", id, data);
	colorMap();
}



/***********************************/
/****  UPDATE DATA & DASHBOARD  ****/
/***********************************/	

function updateAll(){
	//console.log("In updateAll, map object before update: ", map);
	currentMapData = getCurrentPolyVars();
	//console.log("currentMapData: ", currentMapData);
	map = updateMap('#map', data);
	//console.log("In updateAll, map object after update: ", map);

	//update map_title & map_subtitle here?
	//$('#map_title').html("UPDATE MAP TITLE");
	//$('#map_subtitle').html(("UPDATE MAP SUBTITLE");
		
	//totalEntries = data.length;  //e.g. <-- should calculate total number of cases here?
}


/*********************************************/
/****  GLOBAL VARIABLES & INITIALISATION  ****/
/*********************************************/

var zs_geoms;
var geozs = {};
var geojson;
var currentMapData;
var legendSvg;

window.onload = function () {
	console.log("onload");
	var zs_geoms;
	var req = new XMLHttpRequest();
    var url = 'data/rdc_zs.json'   
        req.open('GET', url, true);
        req.onreadystatechange = handler;
        req.send();
    var topoob = {};
    geozs = {};

    function handler(){

        if(req.readyState === XMLHttpRequest.DONE) {
        	map = generateMap('#map', req.responseText, []);
			$('#map').width($('#map').width());   //HEIDI - jquery - do we really need this?
			updateMapInfo('', '', '');
			//var svg = initMapLegend();
			updateMapLegend(g.currentvars.currentMinVal, g.currentvars.currentMaxVal);
			changeDiseaseSelection();
			console.log("g = ", g);
        }

    }

}
	

var select = document.getElementById("disease-select");
for (disease in g.diseaseList) {
	//console.log("disease: ", disease, g.diseaseList[disease]);
	if (g.diseaseList[disease]!='') {
    	select.options[select.options.length] = new Option(g.diseaseList[disease], disease);
    }
}


function changeDiseaseSelection() {
	var element = document.getElementById('map_title');
	g.currentvars.currentDisease = select.options[select.selectedIndex].text;
	element.innerHTML = g.currentvars.currentDisease;	//HEIDI - Could amend disease names here
	malDim.filterAll();
	malDim.filter(g.currentvars.currentDisease);
	updateAll();
}

function btn_reset() {
	console.log("RESET ALL HERE");
}
