///////////////////////////////////////////////////
//Next dev steps:
// - use sprite to load png imgs
// - make zone/prov buttons more aesthetic
// - add prov overlay to zones view 
// - add composite line series
// - add time range selector
// - add play/pause functionality
//
// Recommendations from others:
// - add prov overlay to zones view
// - Help Intro.js
///////////////////////////////////////////////////

// - examples online: http://techslides.com/over-2000-d3-js-examples-and-demos
// - brush handles: https://bl.ocks.org/mbostock/4349545
// - brush snapping: https://bl.ocks.org/mbostock/6232537
// - vertical bar chart brush (nbremer): http://bl.ocks.org/nbremer/d8dff2fa37345d54f9e58eb74db460d0
// - https://bl.ocks.org/misanuk/fc39ecc400eed9a3300d807783ef7607
// - brush snapping: http://bl.ocks.org/emeeks/8899a3e8c31d4c5e7cfd

// - leaflet overlay: http://jsfiddle.net/FH9VF/11/



/***********************/
/*****  DATA PREP  *****/
/***********************/
//Global namespace
var g = {};
var date_extent = [0,100];
[data,date_extent] = addEpitime(data,g);
console.log(g);

/*************************/
/*****  CROSSFILTER  *****/
/*************************/
var cf = crossfilter(data);
console.log(data);

//cf.epiWkDim = cf.dimension(function(d) {return d.epiwk;});
cf.epiDateDim = cf.dimension(function(d) {return d.epidate});
cf.malDim = cf.dimension(function(d){if (d.mal!='') {return d.mal}});
cf.provDim = cf.dimension(function(d) {if (d.prov=='') {return 'cod300xxx';} else {return d.prov_pc}});  
cf.provDim2 = cf.dimension(function(d) {if (d.prov=='') {return 'cod300xxx';} else {return d.prov_pc}});  //to filter on only
cf.zsDim = cf.dimension(function(d) {if (d.zs_pc=='') {return 'cod200xxx';} else {return d.zs_pc}});
cf.zsDim2 = cf.dimension(function(d) {if (d.zs_pc=='') {return 'cod200xxx';} else {return d.zs_pc}});  //to filter on only

cf.casesByEpiDateGroup = cf.epiDateDim.group().reduceSum(function (d) {return d.cas;});
console.log("Cases by EpiDate: ", cf.casesByEpiDateGroup.top(Infinity));
cf.deathsByEpiDateGroup = cf.epiDateDim.group().reduceSum(function (d) {return d.dec;});
console.log("Deaths by EpiDate: ", cf.deathsByEpiDateGroup.top(Infinity));

cf.casesByZsGroup = cf.zsDim.group().reduceSum(function (d) {return d.cas;});
console.log("Cases by Zone: ", cf.casesByZsGroup.top(Infinity));
cf.deathsByZsGroup = cf.zsDim.group().reduceSum(function (d) {return d.dec;});
console.log("Deaths by Zone: ", cf.deathsByZsGroup.top(Infinity));

cf.casesByProvGroup = cf.provDim.group().reduceSum(function (d) {return d.cas;});
console.log("Cases by Province: ", cf.casesByProvGroup.top(Infinity));
cf.deathsByProvGroup = cf.provDim.group().reduceSum(function (d) {return d.dec;});
console.log("Deaths by Province: ", cf.deathsByZsGroup.top(Infinity));


/********************************/
/******  GLOBAL VARIABLES  ******/
/********************************/

//Global namespace
//var g = {};

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

g.statList = [{abrv: 'cas', full: 'Nombre de Cas', color_scale: 'YlBr'}, {abrv: 'dec', full: 'Nombre de Décès', color_scale: 'Red'}]; //later can add 'Taux d\'Incidence', 'Taux de Mortalité'

//Set color variables for map
g.mapcolors = {};
g.mapcolors.color_scale = {};
g.mapcolors.color_scale.YlBr = {color_min: '#ffffcc', color_max: '#800026'};
g.mapcolors.color_scale.Red = {color_min: '#fee0d2', color_max: '#a50f15'};
g.mapcolors.color_zero = '#a8a8a8'; //'#d3d3d3';
g.mapcolors.color_boundary = '#2f4f4f';  //dark slate grey    //'#6495ED';
g.mapcolors.color_rivers = '#1673ae'; //'#3b8ec2';

//Declare 'current' variables
g.currentvars = {};
g.currentvars.currentDisease;
g.currentvars.currentStat = g.statList[0];
g.currentvars.currentMinVal;
g.currentvars.currentMaxVal;
g.currentvars.currentMapLyr = 'prov';    //'prov' or 'zone'
g.currentvars.currentSum;
g.currentvars.currentZones = {pcodes: [], names: []};
g.currentvars.currentProvs = {pcodes: [], names: []};
g.currentvars.currentEpiDates = {};
g.currentvars.currentEpiDates.min_default = new Date(2015,7,31);
g.currentvars.currentEpiDates.max_default = new Date(2015,10,30);
g.currentvars.currentEpiDates.min = g.currentvars.currentEpiDates.min_default; //new Date(2015,7,31);
g.currentvars.currentEpiDates.max = g.currentvars.currentEpiDates.max_default; //new Date(2015,10,30);
g.currentvars.currentEpiDates.all = []; //[new Date(2015,2,2), new Date(2015,2,9)];
g.currentvars.currentEpiWeek = {};
g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);



/***************/
/****  MAP  ****/
/***************/

function getCurrentPolyVars() {
	//console.log("current layer = ", g.currentvars.currentMapLyr);
	var currentValues = [];

	cf.epiDateDim.filterAll();
    //HEIDI - do we need to consider .filterRange for exceptions, e.g. min==max or min>max?
	cf.epiDateDim.filterRange([g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max]);
	
	if (g.currentvars.currentMapLyr=='zone') {
		if (g.currentvars.currentStat.abrv=='cas') {
			currentValues = cf.casesByZsGroup.top(Infinity);
		} else if (g.currentvars.currentStat.abrv=='dec') {
			currentValues = cf.deathsByZsGroup.top(Infinity);
		};
	} else if (g.currentvars.currentMapLyr=='prov') {
		if (g.currentvars.currentStat.abrv=='cas') {
			currentValues = cf.casesByProvGroup.top(Infinity);
		} else if (g.currentvars.currentStat.abrv=='dec') {
			currentValues = cf.deathsByProvGroup.top(Infinity);
		};
	};
	//console.log("currentValues: ", currentValues);
	g.currentvars.currentMinVal = 0;
	g.currentvars.currentMaxVal = 0;
	g.currentvars.currentSum = 0;
	for (var i=0; i<=currentValues.length-1; i++) {
		if (currentValues[i].key != 'cod200xxx') {
			if (g.currentvars.currentMinVal > currentValues[i].value) {g.currentvars.currentMinVal = currentValues[i].value};
			if (g.currentvars.currentMaxVal < currentValues[i].value) {g.currentvars.currentMaxVal = currentValues[i].value};
			g.currentvars.currentSum += currentValues[i].value;
		}
	}
	//console.log("min - max: ", g.currentvars.currentMinVal, g.currentvars.currentMaxVal);

	//console.log("g.mapcolors: ", g.mapcolors.color_scale, g.currentvars.currentStat);
	var color = d3.scaleLinear().domain([0,g.currentvars.currentMaxVal])
    	.interpolate(d3.interpolateHcl)
    	//.range([d3.rgb(g.mapcolors.color_min), d3.rgb(g.mapcolors.color_max)]);
    	.range([d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_min), d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_max)]);
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
	currentMapData = getCurrentPolyVars();
    //console.log("currentMapData: ", currentMapData);

    if (g.currentvars.currentMapLyr=='zone') {
    	var features = geozs.features;
    } else if (g.currentvars.currentMapLyr=='prov') {
    	var features = geoprov.features;
    };

	features.forEach(function(d,i) {
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

function updateMapInfo(zs_name, zs_pcode, prov_name, prov_pcode) {
	//console.log("currentMapData: ", currentMapData)
	//console.log(zs_name, zs_pcode, prov_name, prov_pcode);
	if (g.currentvars.currentMapLyr=='prov') {
		try {
			try {
				var val = d3.format(",.0f")(currentMapData[prov_pcode].value);
			} catch(e) {
				var val = 0;
			}
			infoUpdate = (prov_name && prov_pcode) ? "<h4>"+prov_name+ "</h4>Cas: " +  val : "Survolez une région"  
		} catch(e) {
			infoUpdate = "<p><i>ERROR</i></p>"
		}
	} else if (g.currentvars.currentMapLyr=='zone') {
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
	}
	$('.mapinfo').html(infoUpdate);	
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
	max = Math.max(1, max);
	d3.select(".maplegend").select("svg").remove();
	var shift_right = 25;

    //Create gradient for legend 
	var margin = {
		top: 0,
		right: 12,
		bottom: 0, 
		left: 14
	};
	var width = 200; 
	var height = 50; 

	function getTicks() {
		if (max == 1) {
			return 1;
		} else if (max == 2) {
			return 2;
		} else if (max == 3) {
			return 3;
		} else if (max == 4) {
			return 4;
		} else if (max >= 5000) {
			return 3;
		} else {
			return 5;
		};
	};	
	var numTicks = getTicks();

    //SVG container
	var svg = d3.select(".maplegend")
		.append("svg")
		.attr("width", width + shift_right + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.append("g")
		.attr("transform", "translate(" + (margin.left + width/2) + "," + (margin.top + height/2) + ")");

	//console.log('current color scale: ', g.currentvars.currentStat.color_scale);
	var colorScale = d3.scaleLinear()
		.domain([0,g.currentvars.currentMaxVal])
    	.interpolate(d3.interpolateHcl)
    	//.range([d3.rgb(g.mapcolors.color_min), d3.rgb(g.mapcolors.color_max)]);
    	//.range([d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_min), d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_max)]);
		.range([d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_min), d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_max)]);
	

	//Extra scale since color scale is interpolated
	var tempScale = d3.scaleLinear()
		.domain([0, max])
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

	//Draw zero rectangle
	legendsvg.append("rect")
		//.attr("class", "legendZero")
		.attr("x", -legendWidth/2)
		.attr("y", 0)
		.attr("rx", 8/2)
		.attr("width", 20)
		.attr("height", 8)
		.style("fill", g.mapcolors.color_zero);

	//Draw colour scale rectangle
	legendsvg.append("rect")
		.attr("class", "legendRect")
		.attr("x", shift_right-legendWidth/2)
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
		.text(g.currentvars.currentStat.full);

	//Set scale for x-axis
	var xScale = d3.scaleLinear()
		.range([-legendWidth/2, legendWidth/2])
		.domain([0, max]);

	//Define x-axis
	var xAxis = d3.axisBottom()
		//.orient("bottom")
		.ticks(numTicks)
		.tickFormat(function(d) {if (d==0) {return '';} else {return d3.format(",.0f")(d);} })
		.scale(xScale);

	//Set up x-axis
	legendsvg.append("g")
		.attr("class", "legend-axis")
		.attr("transform", "translate(" + shift_right + "," + (5) + ")")
		.call(xAxis);

	//Append 0 tick
	legendsvg.append("text")
		.attr("class", "legend-axis")
		.attr("x", (-legendWidth+14)/2)
		.attr("y", 22)
		.style("text-anchor", "left")
		.text("0");

}





function generateMap(id, data, responseText_zs, responseText_prov, responseText_riv) { 		
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

    function style_prov_outline(feat, i){
        return {fillOpacity: 0,
                weight: 1.8,
                color: 'black', //g.mapcolors.color_boundary, 
            	//className: 'dashgeom dashgeom'+feat.properties.pcode
            	}
    }

    /*function style_prov(feat, i){
        return {fillColor: 'pink',
        		fillOpacity: 1,
                weight: 1,
                color: g.mapcolors.color_boundary, 
            	className: 'dashgeom dashgeom'+feat.properties.pcode
            	}
    }*/

    function style_riv(feat, i){
        return {fillOpacity: 0,
                weight: 1,
                color: g.mapcolors.color_rivers, 
            	className: 'dashgeom rivers'
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
        topoob = JSON.parse(responseText_zs)
        geozs = topojson.feature(topoob, topoob.objects.rdc_zs)
        //geozs_neighbors = topojson.neighbors(topoob.objects.rdc_zs.geometries);
                    
        geozs.features = geozs.features.map(function(fm,i){
            var ret = fm;
            ret.indie = i;
            return ret
        });
        /*geojson_zone = L.geoJson(geozs, {style:style, onEachFeature: onEachFeature})
					.addTo(map);*/
		geojson_zone = L.geoJson(geozs, {style:style, onEachFeature: onEachFeature});
		//geojson_zone.addTo(map);
    }
    catch(e){
        geojson_zone = {};
        console.log(e)
    }
    //console.log('zone neighbors: ', geozs_neighbors);
    //console.log(geozs)


 	//try/catch json parsing of responseText
	try {
	    topoob2 = JSON.parse(responseText_prov)
	    geoprov = topojson.feature(topoob2, topoob2.objects.rdc_prov)
	    geoprov.features = geoprov.features.map(function(fm,i){
	        var ret = fm;
	        //ret.indie = i;
	        return ret
	    });
	    /*geojson_prov = L.geoJson(geoprov, {style:style_prov, onEachFeature: onEachFeature})
					.addTo(map);*/
	    //geojson_prov_outline = L.geoJson(geoprov, {style:style_prov_outline});
	    //geojson_prov = L.geoJson(geoprov, {style:style_prov});
	    geojson_prov = L.geoJson(geoprov, {style:style, onEachFeature: onEachFeature});
		geojson_prov.addTo(map);
	}
	catch(e){
	    geojson_prov = {};
	    console.log(e)
	}
	//console.log(geoprov)

	//try/catch json parsing of responseText
	try {
	    topoob3 = JSON.parse(responseText_riv)
	    georiv = topojson.feature(topoob3, topoob3.objects.rdc_rivers)
	    georiv.features = georiv.features.map(function(fm,i){
	        var ret = fm;
	        //ret.indie = i;
	        return ret
	    });
	    /*geojson_prov = L.geoJson(geoprov, {style:style_prov, onEachFeature: onEachFeature})
					.addTo(map);*/
	    /*geojson_prov = L.geoJson(geoprov, {style:style_prov_outline})
					.addTo(map);
	    }*/
	    //geojson_prov = L.geoJson(geoprov, {style:style_prov});
	    geojson_riv = L.geoJson(georiv, {style:style_riv});
		geojson_riv.addTo(map);
	}
	catch(e){
	    geojson_riv = {};
	    console.log(e)
	}
	//console.log(geoprov)
  

	/*geojson2.on('click', function (e) {
		console.log(e.originalEvent.srcElement.classList[1], e.originalEvent.srcElement.classList[1]);
	    //alert('map ' + e.latlng + e.originalEvent.srcElement.classList[1]);  //geojson2.originalEvent.srcElement.farthestViewportElement.firstChild.firstChild.classList[1]
	}); */

    var mapInfo = L.control({position: 'topright'});
    mapInfo.onAdd = function(map) {
    	var infoDiv = L.DomUtil.create('infoDiv', 'mapinfo');   //create a div with class'mapinfo'
		updateMapInfo('', '', '','');
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
	    /*if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }*/
        if (g.currentvars.currentMapLyr=='prov') {
        	updateMapInfo('','', layer.feature.properties.name, layer.feature.properties.pcode);
        } else if (g.currentvars.currentMapLyr=='zone') {
			updateMapInfo(layer.feature.properties.name, layer.feature.properties.pcode, layer.feature.properties.lvl3_name, '');
		}
    	
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
		updateMapInfo('', '', '', '');
	}


	function zoomToFeature(e) {
		map.fitBounds(e.target.getBounds());
	}


	function selectFeature(e) {
		//console.log("filter by: ", e.target.feature.properties.pcode);
		var pcode = e.target.feature.properties.pcode;
		if (g.currentvars.currentMapLyr=='zone') {
			if (g.currentvars.currentZones.pcodes.indexOf(pcode) == -1) {  //if not selected in map
				g.currentvars.currentZones.pcodes.push(pcode);
				g.currentvars.currentZones.names.push(getName(pcode,'zone'));
				cf.zsDim2.filterAll();
				cf.zsDim2.filterFunction(function (d) {
					return (g.currentvars.currentZones.pcodes.indexOf(d)!=-1);
				});
			} else {	//if already selected them remove it
				g.currentvars.currentZones.pcodes.splice(g.currentvars.currentZones.pcodes.indexOf(pcode), 1);  //find pcode and remove it
				g.currentvars.currentZones.names.splice(g.currentvars.currentZones.names.indexOf(getName(pcode,'zone')), 1); 
				if (g.currentvars.currentZones.pcodes.length==0) {		//if it had been the only zone
					cf.zsDim2.filterAll();
				} else {
					cf.zsDim2.filterAll();
					cf.zsDim2.filterFunction(function (d) {
						return (g.currentvars.currentZones.pcodes.indexOf(d)!=-1);
					});
				}
			};
		} else if (g.currentvars.currentMapLyr=='prov') {
			if (g.currentvars.currentProvs.pcodes.indexOf(pcode) == -1) {  //if not selected in map
				g.currentvars.currentProvs.pcodes.push(pcode);
				g.currentvars.currentProvs.names.push(getName(pcode,'prov'));
				cf.provDim2.filterAll();
				cf.provDim2.filterFunction(function (d) {
					return (g.currentvars.currentProvs.pcodes.indexOf(d)!=-1);
				});
			} else {	//if already selected them remove it
				g.currentvars.currentProvs.pcodes.splice(g.currentvars.currentProvs.pcodes.indexOf(pcode), 1);  //find pcode and remove it
				g.currentvars.currentProvs.names.splice(g.currentvars.currentProvs.names.indexOf(getName(pcode,'prov')), 1); 
				if (g.currentvars.currentProvs.pcodes.length==0) {		//if it had been the only province
					cf.provDim2.filterAll();
				} else {
					cf.provDim2.filterAll();
					cf.provDim2.filterFunction(function (d) {
						return (g.currentvars.currentProvs.pcodes.indexOf(d)!=-1);
					});
				}
			};
		};
		updateAll();
	}

	/*function selectZone(e) {
		console.log(e);
		var clickBounds = L.latLngBounds(e.latlng, e.latlng);

        var intersectingFeatures = [];
        for (var l in map._layers) {
          var overlay = map._layers[l];
          if (overlay._layers) {
            for (var f in overlay._layers) {
              var feature = overlay._layers[f];
              var bounds;
              if (feature.getBounds) bounds = feature.getBounds();
              else if (feature._latlng) {
                bounds = L.latLngBounds(feature._latlng, feature._latlng);
              }
              if (bounds && clickBounds.intersects(bounds)) {
                intersectingFeatures.push(feature);
                console.log("feature: ", feature)
              }
              if (bounds)
            }
          }
          //console.log("overlay: ", overlay);
        }
        var html = "Found features: " + intersectingFeatures.length + "<br/>" + intersectingFeatures.map(function(o) {
          //return o.properties.type
          //console.log(o);
          if (o.feature.properties.pcode) {
          	return o.feature.properties.pcode;
          } else {
          	return 'RIVER'
          }
        }).join('<br/>');

        map.openPopup(html, e.latlng, {
          offset: L.point(0, -24)
        });

	}*/

	function onEachFeature(feature, layer){
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight, 
			click: selectFeature, 
			dblclick: zoomToFeature
		})
	}

	/*function onZoneFeature(feature, layer){
		layer.on({
			//mouseover: highlightZone,
			//mouseout: resetZoneHighlight, 
			click: selectZone, 
			dblclick: zoomToFeature
		})
	}*/

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

	return map;
}

function btn_rivers() {
	if ($('#btnRiv').hasClass('on')) {   //turn rivers off
		map.removeLayer(geojson_riv);
		$('#btnRiv').removeClass('on');
	} else {							 //turn rivers on
		geojson_riv.addTo(map);
		geojson_riv.bringToFront();
		$('#btnRiv').addClass('on');
	}
};

function btn_change_lyr(lyr) {
	//console.log("change map level to ", lyr);
	//console.log(map, geojson_zone, geojson_prov);
	if ((lyr=='prov') && ($('#btnZone').hasClass('on'))) {   //switch from zone to province
	 	//console.log("Switched to PROVINCE");
		$('#btnZone').removeClass('on');
		$('#btnProv').addClass('on');
		g.currentvars.currentMapLyr = 'prov'; 
		map.removeLayer(geojson_zone);		//remove zone layer
		//map.removeLayer(geojson_prov_outline);
		geojson_prov.addTo(map);
		geojson_prov.bringToBack();
		switchLayerPolys('prov');			//switch to prov layer
		//updateMap('#map', data);		//should be updateAll here - in case geometries don't match up?
	} else if ((lyr=='zone') && ($('#btnProv').hasClass('on'))) {	//switch from province to zone
		//console.log("Switched to ZONE");
		$('#btnProv').removeClass('on');
		$('#btnZone').addClass('on');
		g.currentvars.currentMapLyr = 'zone'; 
		map.removeLayer(geojson_prov);		//remove prov layer
		geojson_zone.addTo(map);
		geojson_zone.bringToBack();
		//geojson_prov_outline.addTo(map);
		//geojson_prov_outline.bringToFront();
		switchLayerPolys('zone');			//switch to zone layer
		//updateMap('#map', data);		//should be updateAll here - in case geometries don't match up?
	}
	updateAll();
}

function switchLayerPolys(lyr) {		//amends polygon selection when switching between layers - from prov to zone is ok (all sub-zones included), from zone to province need to include all zones in the province
	//console.log("SWITCH LAYER TO ", lyr, " - updating polygon selection");
	if (lyr=='zone') {		//switch from prov to zone
		g.currentvars.currentZones.pcodes = [];  //reset zone selection to null
		g.currentvars.currentZones.names = []
		for (var i=0; i<=g.currentvars.currentProvs.pcodes.length-1; i++) {		//for each poly selected in prov layer
			for (var j=0; j<= geonames.length-1; j++) {
				if (g.currentvars.currentProvs.pcodes[i]==geonames[j].prov_pcode) {  //add all zones for that poly into zone list
					g.currentvars.currentZones.pcodes.push(geonames[j].zs_pcode);
					g.currentvars.currentZones.names.push(getName(geonames[j].zs_pcode, 'zone'));
				}
			}
		}
		g.currentvars.currentProvs.pcodes = [];  //reset prov selection to null
		g.currentvars.currentProvs.names = []; 
		selectManyFeatures('zone');
	} else if (lyr=='prov') {	//switch from zone to prov
		g.currentvars.currentProvs.pcodes = [];  //reset prov selection to null
		g.currentvars.currentProvs.names = []; 
		for (var i=0; i<=g.currentvars.currentZones.pcodes.length-1; i++) {		//for each poly selected in zone layer
			console.log(i, g.currentvars.currentZones.pcodes[i]);
			for (var j=0; j<= geonames.length-1; j++) {
				if (g.currentvars.currentZones.pcodes[i]==geonames[j].zs_pcode) {
					console.log("FOUND MATCH: ", g.currentvars.currentZones.pcodes[i], geonames[j].zs_pcode)
					console.log(g.currentvars.currentProvs.pcodes, geonames[j].prov_pcode)
					if (g.currentvars.currentProvs.pcodes.indexOf(geonames[j].prov_pcode) == -1) {		//if prov poly not already in list, then add it (if in list, do nothing)
						console.log("Not in list - needs to be added")
						g.currentvars.currentProvs.pcodes.push(geonames[j].prov_pcode);
						g.currentvars.currentProvs.names.push(getName(geonames[j].prov_pcode, 'prov'));
					};
					break;
				}
			}
		}
		g.currentvars.currentZones.pcodes = [];  //reset zone selection to null
		g.currentvars.currentZones.names = []
		selectManyFeatures('prov');
	};
	//console.log("Current Zones: ", g.currentvars.currentZones);
	//console.log("Current Provs: ", g.currentvars.currentProvs);
};


function selectManyFeatures(lyr) {
	//console.log("in selectManyFeatures, ", lyr)
	if (lyr=='zone') {
		//console.log("lyr ", lyr);
		cf.zsDim2.filterAll();
		cf.provDim2.filterAll();
		if (g.currentvars.currentZones.pcodes.length!=0) {  //if list is not empty then filter it
			cf.zsDim2.filterFunction(function (d) {
				//console.log(d); 
				return (g.currentvars.currentZones.pcodes.indexOf(d)!=-1);
			});
		}
	} else if (lyr=='prov') {
		//console.log("lyr ", lyr);
		cf.zsDim2.filterAll();
		cf.provDim2.filterAll();
		if (g.currentvars.currentProvs.pcodes.length!=0) {  //if list is not empty then filter it
			cf.provDim2.filterFunction(function (d) {
				//console.log(d); // g.currentvars.currentProvs.pcodes.indexOf(d));
				return (g.currentvars.currentProvs.pcodes.indexOf(d)!=-1);
			});
		};

	};
}



function getName(pcode, lyr) {
	var name = '';
	//console.log(geonames);
	for (var i=0; i <= geonames.length-1; i++) {
		if ((lyr=='prov') && (pcode==geonames[i].prov_pcode)) {
			name = geonames[i].prov;
			break;
		} else if ((lyr=='zone') && (pcode==geonames[i].zs_pcode)) {
			name = geonames[i].zs + ', ' + geonames[i].prov;
			break;
		};
	}
	//console.log('name: ', name);
	return name;
}


/*******************************/
/****  CREATE OTHER CHARTS  ****/
/*******************************/

// - brush snapping - https://bl.ocks.org/mbostock/6232537
// - brush handles - https://bl.ocks.org/mbostock/4349545    https://bl.ocks.org/Fil/2d43867ba1f36a05459c7113c7f6f98a
// - fix issue with weeks 2015-50 and -51
// - fix issue with blank pcodes (have one way of dealing with them)
// * tooltip on bars
// - y-axis dynamic title
// * update in filter summary window
// * change data input on cases/deaths/disease selection
// * update rest of dashboard

function getCurrentTimeSeriesData() {
	var timeSeries = [];

	if (g.currentvars.currentStat.abrv=='cas') {
		timeSeries = cf.casesByEpiDateGroup.top(Infinity);
	} else if (g.currentvars.currentStat.abrv=='dec') {
		timeSeries = cf.deathsByEpiDateGroup.top(Infinity);
	};
	//console.log("timeSeries: ", timeSeries);
	return timeSeries;
}


function createTimeSeriesCharts(id1, id2) {
	//console.log("IN CREATE CHARTS");

	var margin = {top: 10, right: 20, bottom: 20, left: 60},		//margins of actual x- and y-axes within svg  
	    margin2 = {top: 10, right: 20, bottom: 20, left: 60}, 
	    width = $(id1).width() - margin.left - margin.right,		//width of main svg
	    width2 = $(id2).width() - margin2.left - margin2.right,
	    height = $(id1).height() - margin.top - margin.bottom,		//height of main svg
	    height2 = $(id2).height() - margin2.top - margin2.bottom;

	//Render main SVGs
	svg1 = d3.select(id1)         
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom);

	svg2 = d3.select(id2)         
		.append("svg")
		.attr("width", width2 + margin2.left + margin2.right)
		.attr("height", height2 + margin2.top + margin2.bottom);

	var x = d3.scaleTime().range([0, width]),   		//x-axis width, accounting for specified margins
		x2 = d3.scaleTime().range([0, width2]),
	    y = d3.scaleLinear().range([height, 0]),
	    y2 = d3.scaleLinear().range([height2, 0]);

	var xAxis = d3.axisBottom(x),
	    xAxis2 = d3.axisBottom(x2),
	    yAxis = d3.axisLeft(y).ticks(5);

	svg1.append("defs").append("clipPath")
	    .attr("id", "clip")
	  	.append("rect")
	    .attr("width", width)
	    .attr("height", height);

	/*svg2.append("defs").append("clipPath")
	    .attr("id", "clip")
	  	.append("rect")
	    .attr("width", width2)
	    .attr("height", height2);*/

	var focus = svg1.append("g")
	    .attr("class", "focus")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var context = svg2.append("g")
	    .attr("class", "context")
	    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

	var time_data = getCurrentTimeSeriesData();
	x.domain(d3.extent(time_data, function(d) { return d.key; }));
	y.domain([0, d3.max(time_data, function(d) { return d.value; })]);
	x2.domain(x.domain());
	y2.domain(y.domain());

	var orig_bar_width = (width/time_data.length-2);
	var bar_width = (width/time_data.length-2);			//changing bar width only for focus chart

	focus.selectAll(".bar")
	    .data(time_data)
	    .enter().append("rect")
	    .attr("class", "bar")
	    .attr("x", function(d) { return x(d.key); })
	    .attr("y", function(d) { return y(d.value); })
	    .attr("width", bar_width)
	    .attr("height", function(d) { return height - y(d.value); });

  	focus.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  	focus.append("g")
      .attr("class", "axis axis--y")
      .call(yAxis);

	context.selectAll(".bar2")
	    .data(time_data)
	    .enter().append("rect")
	    .attr("class", "bar2")
	    .attr("x", function(d) { return x2(d.key); })
	    .attr("y", function(d) { return y2(d.value); })
	    .attr("width", orig_bar_width)
	    .attr("height", function(d) { return height2 - y2(d.value); });

	context.append("g")
	      .attr("class", "axis axis--x")
	      .attr("transform", "translate(0," + height2 + ")")
	      .call(xAxis2);


	//add y-axis title
	focus
		.append("text")
		.attr("class", "axis-title")
		//.attr("transform", "translate(-15," +  (height+margin.bottom)/2 + ") rotate(-90)")
		.attr("transform", "translate(-40," + (80) + ") rotate(-90)")
		.text(" ");


		//Render grey line showing current year
	/*	lineGraph.append("line")
			.attr("class", "year_line")
			.attr("x1", margin.left + timeScale(currentYr))  
			.attr("y1", margin.top)    			//+ve value moves down from top
			.attr("x2", margin.left + timeScale(currentYr))  
			.attr("y2", height + margin.top)			//-ve value moves up from bottom
			.attr('stroke', '#c7c9c9')  //light grey
			//.attr('stroke-dasharray', '5, 5')
			.attr("stroke-width", 1);	*/
			
			
	 	//Add intro text to linegraph to explain how to add/remove country, regional, and global lines	
	/*	var g2 = lineGraph.append('text')				//create a group 'g2' in the main svg/'lineGraph' 
			.attr("class","linegraph_intro")
			.attr("x", 55)
			.attr("y", 30)
			//.attr('font-size', '12px')
			.style('fill', 'darkOrange')
			.html('Click on country in map or barchart to add');
		var g2 = lineGraph.append('text')				 
			.attr("class","linegraph_intro")
			.attr("x", 120)
			.attr("y", 50)
			.style('fill', 'darkOrange')
			.html('country line here');
			.html('double-click any line here to remove'); */

	//return [svg1, svg2];

}

	



function updateTimeSeriesCharts(id1, id2, time_data) {
	//console.log("IN UPDATE CHARTS");

	var margin = {top: 10, right: 20, bottom: 20, left: 60},		//margins of actual x- and y-axes within svg  
	    margin2 = {top: 10, right: 20, bottom: 20, left: 60}, 
	    width = $(id1).width() - margin.left - margin.right,		//width of main svg
	    width2 = $(id2).width() - margin2.left - margin2.right,
	    height = $(id1).height() - margin.top - margin.bottom,		//height of main svg
	    height2 = $(id2).height() - margin2.top - margin2.bottom;

	var x = d3.scaleTime().range([0, width]),   		//x-axis width, accounting for specified margins
		x2 = d3.scaleTime().range([0, width2]),
	    y = d3.scaleLinear().range([height, 0]),
	    y2 = d3.scaleLinear().range([height2, 0]);

	//set domains
	x.domain(d3.extent(time_data, function(d) { return d.key; }));
	y.domain([0, d3.max(time_data, function(d) { return d.value; })]);
	x2.domain(x.domain());
	y2.domain(y.domain());
	
	var xAxis = d3.axisBottom(x),
	    xAxis2 = d3.axisBottom(x2),
	    yAxis = d3.axisLeft(y).ticks(5);

	//get the width of each bar 
	var orig_bar_width = (width/time_data.length-2);
	var bar_width = (width/time_data.length-2);
	//var barWidth = width / data.length;
	
	//select all bars, take them out, and exit previous data set
	//then add/enter new data set
	var bar = svg1.select('g').selectAll(".bar")
					.remove()
					.exit()
					.data(time_data)	

	var tooltip = d3.select("body").append("div").attr("class", "toolTip");

	//now give each rectangle corresponding data
	bar.enter()
		.append("rect")
	    .attr("class", "bar")
	    .attr("x", function(d) { return x(d.key); })
	    .attr("y", function(d) { return y(d.value); })
	    .attr("width", bar_width)
	    .attr("height", function(d) { return height - y(d.value); })
	    .on("mousemove", function(d){
            tooltip
              .style("left", d3.event.pageX - 50 + "px")
              .style("top", d3.event.pageY - 70 + "px")
              .style("display", "inline-block")
              .html("Semaine epi: <b>" + getEpiWeek(d.key) + "</b><br>Semaine du: <b>" + dateFormat(d.key) + "</b><br>Total: <b>" + d.value + "</b>");
        })
    	.on("mouseout", function(d){ tooltip.style("display", "none");});

	
	//left axis
	svg1.select('.axis--y')
		.call(yAxis)
	//bottom axis
	svg1.select('.axis--x')
		//.attr("class", "axis axis--x")
		.call(xAxis)
		/*.selectAll("text")
			.style("text-anchor", "end")
			.attr("dx", "-.8em")
			.attr("dy", ".15em")
			.attr("transform", function(d){
				return "rotate(-65)";
			});*/

	svg1.select(".axis-title")
		.text(g.currentvars.currentStat.full);

	

	var bar2 = svg2.select('g').selectAll(".bar2")
					.remove()
					.exit()
					.data(time_data)	

	bar2.enter()
		.append("rect")
		.attr("class", "bar2")
	    .attr("x", function(d) { return x2(d.key); })
	    .attr("y", function(d) { return y2(d.value); })
	    .attr("width", orig_bar_width)
	    .attr("height", function(d) { return height2 - y2(d.value); });


	var zoom = d3.zoom()
	    .scaleExtent([1, Infinity])
	    .translateExtent([[0, 0], [width, height]])
	    .extent([[0, 0], [width, height]])
	    .on("zoom", zoomed);

	var brush = d3.brushX()
	    .extent([[0, 0], [width2, height2]])
	    .on("brush", brushmoved)
	    .on("end", brushend);


	if (svg2.selectAll('g.brush').empty()) {
		//console.log("APPENDING NEW BRUSH");
		var gBrush = svg2.append("g")
					    .attr("class", "brush")
					    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")")
				        .call(brush);
		gBrush.call(brush.move, [g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max].map(x));		
		//console.log("APPENDING NEW BRUSH - DONE");   
	} else {
		//console.log("SELECTING BRUSH")
		var gBrush = svg2.select('g.brush');
		brushupdate();
		//console.log("SELECTING BRUSH - DONE")
	}


	// style brush resize handle
	// https://github.com/crossfilter/crossfilter/blob/gh-pages/index.html#L466
/*	var brushResizePath = function(d) {
		//console.log(d, height, height2)
	    var e = +(d.type == "e"),
	        x = e ? 1 : -1,
	        y = (height2 + margin2.bottom) / 2;
	    return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) + "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
	}

	var handle = gBrush.selectAll(".handle--custom")
	  .data([{type: "w"}, {type: "e"}])
	  .enter().append("path")
	    .attr("class", "handle--custom")
	    .attr("stroke", "#000")
	    .attr("cursor", "ew-resize")
	    .attr("d", brushResizePath);*/

	/*var handle = gBrush.selectAll(".handle--custom")
	  .data([{type: "w"}, {type: "e"}])
	  .enter().append("path")
	    .attr("class", "handle--custom")
	    .attr("fill", "#666")
	    .attr("fill-opacity", 0.8)
	    .attr("stroke", "#000")
	    .attr("stroke-width", 1.5)
	    .attr("cursor", "ew-resize")
	    .attr("transform", "translate(" + (0) + "," + (20) + ")")
	    .attr("d", d3.arc()
	        .innerRadius(0)
	        .outerRadius((height2 + margin2.bottom) / 3)
	        .startAngle(0)
	        .endAngle(function(d, i) { return i ? Math.PI : -Math.PI; }));*/



	//gBrush.call(brush.move, [new Date(2015,8,1), new Date(2015,11,1)].map(x));    //inital handle positions - 01 Sep 15 - 01 Dec 15

	function brushmoved() {
		//console.log("IN BRUSHMOVED");

		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
	    
	    //var s = d3.event.selection;
	    var s = d3.event.selection || x2.range();   //range selected or entire range
	    //console.log(d3.event.selection, x2.range());
	    //console.log("s: ", s, x2.range());
	    //console.log("s: ", s);
	    //console.log("width: ", width);
	    //console.log("x range, domain: ", x.range(), x.domain());
	    //console.log("x2 range, domain: ", x2.range(), x2.domain());

	    bar_width = (orig_bar_width) * (x2.range()[1]-x2.range()[0])/(s[1]-s[0]);
	    //console.log("bar_width: ", bar_width)
	    g.currentvars.currentEpiDates.all = [];
	    g.currentvars.currentEpiDates.s = s;


	    //if (s == x2.range()) {
	    if ((s[0]==x2.range()[0]) && (s[1]==x2.range()[1])) {  //if full extent
	    	//console.log("s==x2.range()")
	        //handle.attr("display", "none");
	        //svg2.selectAll(".bar2").classed("active", true);
	        //bar2.classed("active", true);

	        for (var i=0; i<=g.epitime.all.length-1; i++) {
				g.currentvars.currentEpiDates.all.push(g.epitime.all[i].epiDate);
			}

	    } else {	        
	        var sx = s.map(x2.invert);
	        svg2.selectAll(".bar2").classed("active", function(d) {
	        	if (sx[0] <= d.key && d.key <= sx[1]) {  	//if bar date is in selected range
	        		//console.log("ACTIVE: ", sx[0] <= d.key && d.key <= sx[1], d.key);
	        		g.currentvars.currentEpiDates.all.push(d.key);
	        	} else {
	        		//console.log("NOT ACTIVE: ", sx[0] <= d.key && d.key <= sx[1], d.key);
	        	};
	        	return sx[0] <= d.key && d.key <= sx[1]; 
	        });
	        //handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4); */return "translate(" + [ s[i], - height / 4] + ")"; });

	    	x.domain(s.map(x2.invert, x2));
	    	svg1.select("g").selectAll(".bar")
	    		.attr("x", function(d) { return x(d.key); })
	    		.attr("width", bar_width);
		    svg1.select("g").select(".axis--x").call(xAxis);
		    svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
		        .scale(width / (s[1] - s[0]))
		        .translate(-s[0], 0));
	    }
	    g.currentvars.currentEpiDates.min = new Date(Math.min.apply(null,g.currentvars.currentEpiDates.all));
	    g.currentvars.currentEpiDates.max = new Date(Math.max.apply(null,g.currentvars.currentEpiDates.all));
	    g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
		g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);
		//console.log("IN BRUSHMOVED - DONE");
	}

	function brushupdate() {  //called when updating through code, not mousemove
		//console.log("IN BRUSHUPDATE ", g.currentvars.currentEpiDates);
		
		gBrush.call(brush.move, [g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max].map(x));	

		//console.log("IN BRUSHUPDATE ", g.currentvars.currentEpiDates);
		if ((g.currentvars.currentEpiDates.s[0]==x2.range()[0]) && (g.currentvars.currentEpiDates.s[1]==x2.range()[1])) {  //full extent
			svg2.selectAll(".bar2").classed("active", true);
		} else {
			svg2.selectAll(".bar2").classed("active", function(d) {				
				/*if (g.currentvars.currentEpiDates.all.indexOf(d.key) != -1) {  	//if bar date is in selected range
	        		//console.log("ACTIVE: ", g.currentvars.currentEpiDates.all.indexOf(d.key) != -1, d.key);
	        		//g.currentvars.currentEpiDastes.all.push(d.key);
	        	} else {
	        		//console.log("NOT ACTIVE: ", g.currentvars.currentEpiDates.all.indexOf(d.key) != -1, d.key);
	        	};*/
	        	return g.currentvars.currentEpiDates.all.indexOf(d.key) != -1;
	        });
	    }
        
		x.domain([g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max]);
        var s = [x2(g.currentvars.currentEpiDates.min), x2(g.currentvars.currentEpiDates.max)];
        //console.log(s);

        bar_width = (orig_bar_width) * (x2.range()[1]-x2.range()[0])/(s[1]-s[0]);
    	//handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4); */return "translate(" + [ s[i], - height / 4] + ")"; });
	
    	svg1.select("g").selectAll(".bar")
    		.attr("x", function(d) { return x(d.key); })
    		.attr("width", bar_width);
	    svg1.select("g").select(".axis--x").call(xAxis);
	    svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
	        .scale(width / (s[1] - s[0]))
	        .translate(-s[0], 0));
	    //console.log("IN BRUSHUPDATE - DONE");
	}

	function brushend() {
		//console.log("******** IN BRUSH END *********");
		//console.log(d3.event.sourceEvent);
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
	    var s = d3.event.selection || x2.range();   //range selected or entire range
	    //console.log("s: ", s, x2.range());
	    if ((s[0]==x2.range()[0]) && (s[1]==x2.range()[1])){
	    	//console.log("FULL EXTENT HERE");
	    	g.currentvars.currentEpiDates.min = g.epitime.date_extent[0];
			g.currentvars.currentEpiDates.max = g.epitime.date_extent[1];
			g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
			g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);
			g.currentvars.currentEpiDates.all = [];

			//populate g.currentvars.currentEpiDates.all with all weeks from min to max
			for (var i=0; i<=g.epitime.all.length-1; i++) {
				g.currentvars.currentEpiDates.all.push(g.epitime.all[i].epiDate);
			}

			/*svg2.selectAll(".bar2").classed("active", function(d) {
				console.log(d.key, g.currentvars.currentEpiDates.all.indexOf(d.key) == -1);
	        	return g.currentvars.currentEpiDates.all.indexOf(d.key) == -1;
	        });*/
	        svg2.selectAll(".bar2").classed("active", true);
			
			x.domain([g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max]);
	        var s = [x2(g.currentvars.currentEpiDates.min), x2(g.currentvars.currentEpiDates.max)];
	        //console.log(s);

	        bar_width = (orig_bar_width) * (x2.range()[1]-x2.range()[0])/(s[1]-s[0]);
	    	//handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4); */return "translate(" + [ s[i], - height / 4] + ")"; });
		
	    	svg1.select("g").selectAll(".bar")
	    		.attr("x", function(d) { return x(d.key); })
	    		.attr("width", bar_width);
		    svg1.select("g").select(".axis--x").call(xAxis);
		    svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
		        .scale(width / (s[1] - s[0]))
		        .translate(-s[0], 0));
			
	    }

    	updateMap();

	    //console.log("******** BRUSH END *********");
	}

	function zoomed() {
		//console.log("IN ZOOMED");
	    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
	    var t = d3.event.transform;
	    x.domain(t.rescaleX(x2).domain());
	    console.log(t, t.rescaleX(x2).domain(), x.range().map(t.invertX, t));
	    //focus.select(".area").attr("d", area);
	    svg1.select("g").selectAll(".bar").attr("x", function(d) { return x(d.key); });
	    svg1.select("g").selectAll(".bar")
	    svg1.select("g").select(".axis--x").call(xAxis);
	    svg2.select("g").select(".brush").call(brush.move, x.range().map(t.invertX, t));
	    //console.log("IN ZOOMED - DONE");
	}	

	//console.log("UPDATE CHARTS - DONE");	

};



/***********************************/
/****  UPDATE DATA & DASHBOARD  ****/
/***********************************/	

function updateMap() {
	currentMapData = getCurrentPolyVars();
	updateHeadline();
	updateFiltSum();
	colorMap();
}

function updateAll() {
	//console.log("In updateAll, map object before update: ", map);
	//console.log("currentMapData: ", currentMapData);
	/*currentMapData = getCurrentPolyVars();
	//console.log("currentMapData: ", currentMapData);
	
	//map = updateMap('#map', data);
	updateHeadline();
	updateFiltSum();
	//updateMap('#map', data);
	colorMap();*/
	updateMap();

	currentTimeSeriesData = getCurrentTimeSeriesData();
	//console.log("currentTimeSeriesData: ", currentTimeSeriesData);
	updateTimeSeriesCharts('#timeseries', '#timeseriesbrush', currentTimeSeriesData);
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
//var geozs = {};
var geojson_zone;
var geojson_prov;
//var geojson_prov_outline;
var geojson_riv;
var currentMapData;
var currentTimeSeriesData;
//var timeSeriesCharts;
var legendSvg;
var svg1, svg2;
var dateFormat = d3.timeFormat("%d %b %y");

window.onload = function () {
	//console.log("onload");
	var zs_geoms;
	var req = new XMLHttpRequest();
    var url_zs = 'data/rdc_zs.json'   
        req.open('GET', url_zs, true);
        req.onreadystatechange = handler;
        req.send();
    var topoob = {};
    geozs = {};
    //geozs_neighbors = {};

    var prov_geoms;
	var req2 = new XMLHttpRequest();
    var url_prov = 'data/rdc_prov.json'   
        req2.open('GET', url_prov, true);
        req2.onreadystatechange = handler;
        req2.send();
    var topoob2 = {};
    geoprov = {};

    var riv_geoms;
	var req3 = new XMLHttpRequest();
    var url_riv = 'data/rdc_rivers.json'   
        req3.open('GET', url_riv, true);
        req3.onreadystatechange = handler;
        req3.send();
    var topoob3 = {};
    georiv = {};

    function handler(){
        if ((req.readyState === XMLHttpRequest.DONE) && (req2.readyState === XMLHttpRequest.DONE) && (req3.readyState === XMLHttpRequest.DONE))  {
        	//btn_change_lyr(g.currentvars.currentMapLyr);
        	map = generateMap('#map', [], req.responseText, req2.responseText, req3.responseText);
			//$('#map').width($('#map').width());  
			createTimeSeriesCharts('#timeseries', '#timeseriesbrush');
			//console.log(timeSeriesCharts);
			updateMapInfo('', '', '', '');
			updateMapLegend(g.currentvars.currentMinVal, g.currentvars.currentMaxVal);
			changeDiseaseSelection();
			changeStatSelection();
			console.log("g = ", g);
        }

    }

}
	

var select_disease = document.getElementById("disease-select");
for (disease in g.diseaseList) {
	//console.log("disease: ", disease, g.diseaseList[disease]);
	if (g.diseaseList[disease]!='') {
    	select_disease.options[select_disease.options.length] = new Option(g.diseaseList[disease], disease);
    }
}

var select_stat = document.getElementById("stat-select");
for (stat in g.statList) {
	//console.log("stat: ", stat, g.statList[stat].full);
	if (g.statList[stat].full!='') {
    	select_stat.options[select_stat.options.length] = new Option(g.statList[stat].full, stat);
    }
}


function changeDiseaseSelection() {
	var element = document.getElementById('map_title');
	g.currentvars.currentDisease = select_disease.options[select_disease.selectedIndex].text;
	element.innerHTML = g.currentvars.currentDisease + ' - ' + g.currentvars.currentStat.full;	//Could amend/correct/re-write disease names here
	cf.malDim.filterAll();
	cf.malDim.filter(g.currentvars.currentDisease);
	updateAll();
}

function changeStatSelection() {
	var element = document.getElementById('map_title');
	//g.currentvars.currentStat.full = select_stat.options[select_stat.selectedIndex].text;
	for (i=0; i<=g.statList.length-1; i++) {
		if (g.statList[i].full == select_stat.options[select_stat.selectedIndex].text) {
			g.currentvars.currentStat = g.statList[i];
			break;
		}
	}
	element.innerHTML = g.currentvars.currentDisease + ' - ' + g.currentvars.currentStat.full;
	//console.log("Change Stat to: ", g.currentvars.currentStat.abrv, g.currentvars.currentStat.full);
	updateAll();
}


function updateHeadline() {
	var headline = document.getElementById("head-val");
	headline.innerHTML = 'Total indiqué sur la carte:<br/><big>' + d3.format(",.0f")(g.currentvars.currentSum) + '</big>';
};

function updateFiltSum() {
	var filtSum = document.getElementById("win_filt-sum");

	//var zones_txt, provs_txt;
	var loc_html;

	//g.currentvars.currentZones.pcodes.length==0 ? zones_txt = 'Toutes les zones' : zones_txt = g.currentvars.currentZones.names.join("; ");
	//g.currentvars.currentProvs.pcodes.length==0 ? provs_txt = 'Toutes les provinces' : provs_txt = g.currentvars.currentProvs.names.join(", ");
	
	if (g.currentvars.currentMapLyr=='zone') {
		loc_html = '<i>Zones: </i><b>';
		g.currentvars.currentZones.pcodes.length==0 ? loc_html += 'Toutes les zones' : loc_html += g.currentvars.currentZones.names.join("; ");
		loc_html += '</b>';
	} else if (g.currentvars.currentMapLyr=='prov') {
		loc_html = '<i>Provinces: </i><b>';
		g.currentvars.currentProvs.pcodes.length==0 ? loc_html += 'Toutes les provinces' : loc_html += g.currentvars.currentProvs.names.join(", ");
		loc_html += '</b>';
	};


	filtSum.innerHTML='<p class="filt-sum-title">Resumé d\'options choisies:</p><i>Pathologie: </i><b>' + g.currentvars.currentDisease + '</b><br/>' + 
	'<i>Statistique: </i><b>' + g.currentvars.currentStat.full + '</b><br/>' + 
	'<i>Semaines epi: </i><b>' + g.currentvars.currentEpiWeek.min + ' - ' + g.currentvars.currentEpiWeek.max + ' </b><i>(Dates: ' + dateFormat(g.currentvars.currentEpiDates.min) +' - '+ dateFormat(g.currentvars.currentEpiDates.max) + ')</i><br/>' + loc_html;
}

function btn_filt_sum() {
	var filtSum = document.getElementById("win_filt-sum");
	if ($('#btnFiltSum').hasClass('on')) {   //switch off
		$('#btnFiltSum').removeClass('on');
		filtSum.style.display = 'none';
	} else {	//switch on
		$('#btnFiltSum').addClass('on');
		//updateFiltSum();
		filtSum.style.display = 'block';
	}
}

function btn_reset() {
	//console.log("RESET ALL HERE");
	cf.zsDim.filterAll();
	cf.zsDim2.filterAll();
	cf.provDim.filterAll();
	cf.provDim2.filterAll();
	g.currentvars.currentZones = {pcodes: [], names: []};
	g.currentvars.currentProvs = {pcodes: [], names: []};
	cf.epiDateDim.filterAll();
	g.currentvars.currentEpiDates.min = g.currentvars.currentEpiDates.min_default; //new Date(2015,7,31);
	g.currentvars.currentEpiDates.max = g.currentvars.currentEpiDates.max_default; //new Date(2015,10,30);
	updateAll();
}

function btn_selectDates() {
	g.currentvars.currentEpiDates.min = new Date(2015,2,2);
	g.currentvars.currentEpiDates.max = new Date(2015,2,31);
	g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
	g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);
	g.currentvars.currentEpiDates.all = [];

	//populate g.currentvars.currentEpiDates.all with all weeks from min to max
	for (var i=0; i<=g.epitime.all.length-1; i++) {
		if ((g.currentvars.currentEpiDates.min <= g.epitime.all[i].epiDate) && (g.epitime.all[i].epiDate <= g.currentvars.currentEpiDates.max)) {
			g.currentvars.currentEpiDates.all.push(g.epitime.all[i].epiDate);
		}
	}
	updateTimeSeriesCharts('#timeseries', '#timeseriesbrush', currentTimeSeriesData);
}
