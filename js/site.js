///////////////////////////////////////////////////
//Next dev steps:
// - use sprite to load png imgs
// - add prov overlay to zones view 
//		- use topojson neighborhoods? (if neighbour has diff prov then make thicker)
// - add composite line series
// - add time range selector
// - add play/pause functionality
//
// Recommendations from others:
// - add prov overlay to zones view
///////////////////////////////////////////////////

/*************************/
/*****  CROSSFILTER  *****/
/*************************/
var cf = crossfilter(data);
console.log(data);

cf.epiWkDim = cf.dimension(function(d) {return d.epiwk;});
cf.malDim = cf.dimension(function(d){if (d.mal!='') {return d.mal;}});
cf.provDim = cf.dimension(function(d) {if (d.prov=='') {return 'cod300xxx';} else {return d.prov_pc}});  
cf.provDim2 = cf.dimension(function(d) {if (d.prov=='') {return 'cod300xxx';} else {return d.prov_pc}});  //to filter on only
cf.zsDim = cf.dimension(function(d) {if (d.zs_pc=='') {return 'cod200xxx';} else {return d.zs_pc}});
cf.zsDim2 = cf.dimension(function(d) {if (d.zs_pc=='') {return 'cod200xxx';} else {return d.zs_pc}});  //to filter on only

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

g.statList = [{abrv: 'cas', full: 'Nombre de Cas', color_scale: 'YlBr'}, {abrv: 'dec', full: 'Nombre de Décès', color_scale: 'Red'}]; //later can add 'Taux d\'Incidence', 'Taux de Mortalité'

//Set color variables for map
g.mapcolors = {};
g.mapcolors.color_scale = {};
g.mapcolors.color_scale.YlBr = {color_min: '#ffffcc', color_max: '#800026'};
g.mapcolors.color_scale.Red = {color_min: '#fee0d2', color_max: '#a50f15'};
g.mapcolors.color_zero = '#a8a8a8'; //'#d3d3d3';
g.mapcolors.color_boundary = '#2f4f4f';  //dark slate grey    //'#6495ED';

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
	//console.log("current layer = ", g.currentvars.currentMapLyr);
	var currentValues = [];
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
	var color = d3.scale.linear().domain([0,g.currentvars.currentMaxVal])
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
	var colorScale = d3.scale.linear()
		.domain([0,g.currentvars.currentMaxVal])
    	.interpolate(d3.interpolateHcl)
    	//.range([d3.rgb(g.mapcolors.color_min), d3.rgb(g.mapcolors.color_max)]);
    	//.range([d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_min), d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_max)]);
		.range([d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_min), d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_max)]);
	

	//Extra scale since color scale is interpolated
	var tempScale = d3.scale.linear()
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
	var xScale = d3.scale.linear()
		.range([-legendWidth/2, legendWidth/2])
		.domain([0, max]);

	//Define x-axis
	var xAxis = d3.svg.axis()
		.orient("bottom")
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





function generateMap(id, data, responseText_zs, responseText_prov) { 		
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

    /*function style_prov_outline(feat, i){
        return {fillOpacity: 0,
                weight: 3,
                color: g.mapcolors.color_boundary, 
            	className: 'dashgeom dashgeom'+feat.properties.pcode
            	}
    }*/

    /*function style_prov(feat, i){
        return {fillColor: 'pink',
        		fillOpacity: 1,
                weight: 1,
                color: g.mapcolors.color_boundary, 
            	className: 'dashgeom dashgeom'+feat.properties.pcode
            	}
    }*/

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
        geozs.features = geozs.features.map(function(fm,i){
            var ret = fm;
            //ret.indie = i;
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
        /*geojson_prov = L.geoJson(geoprov, {style:style_prov_outline})
					.addTo(map);
        }*/
        //geojson_prov = L.geoJson(geoprov, {style:style_prov});
        geojson_prov = L.geoJson(geoprov, {style:style, onEachFeature: onEachFeature});
		geojson_prov.addTo(map);
    }
    catch(e){
        geojson_prov = {};
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
	    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }
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

	/*function selectFeature(e) {
		console.log("filter by: ", e.target.feature.properties.pcode);
		var pcode = e.target.feature.properties.pcode;
		cf.zsDim2.filterAll();
		cf.provDim2.filterAll();
		if (g.currentvars.currentMapLyr=='zone') {
			cf.zsDim2.filter(pcode);
			//console.log(cf.casesByZsGroup.top(Infinity))
		} else if (g.currentvars.currentMapLyr=='prov') {
			cf.provDim2.filter(pcode);
			//console.log(cf.casesByProvGroup.top(Infinity))
		};
		//colorMap();
		updateAll();
	}*/

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

	function onEachFeature(feature, layer){
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight, 
			click: selectFeature, 
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

	return map;
}


function btn_change_lyr(lyr) {
	//console.log("change map level to ", lyr);
	//console.log(map, geojson_zone, geojson_prov);
	if ((lyr=='prov') && ($('#btnZone').hasClass('on'))) {   //switch from zone to province
	 	//console.log("Switched to PROVINCE");
		$('#btnZone').removeClass('on');
		$('#btnProv').addClass('on');
		g.currentvars.currentMapLyr = 'prov'; 
		map.removeLayer(geojson_zone);		//remove zone layer
		geojson_prov.addTo(map);
		switchLayerPolys('prov');			//switch to prov layer
		//updateMap('#map', data);		//should be updateAll here - in case geometries don't match up?
	} else if ((lyr=='zone') && ($('#btnProv').hasClass('on'))) {	//switch from province to zone
		//console.log("Switched to ZONE");
		$('#btnProv').removeClass('on');
		$('#btnZone').addClass('on');
		g.currentvars.currentMapLyr = 'zone'; 
		map.removeLayer(geojson_prov);		//remove prov layer
		geojson_zone.addTo(map);
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


function updateMap(id,data) { 
 	//console.log("In updateMap, map object = ", id, data);
	colorMap();
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

/***********************************/
/****  UPDATE DATA & DASHBOARD  ****/
/***********************************/	

function updateAll(){
	//console.log("In updateAll, map object before update: ", map);
	//console.log("currentMapData: ", currentMapData);
	currentMapData = getCurrentPolyVars();
	//console.log("currentMapData: ", currentMapData);
	//map = updateMap('#map', data);
	updateHeadline();
	updateFiltSum();
	updateMap('#map', data);
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
var currentMapData;
var legendSvg;

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

    var prov_geoms;
	var req2 = new XMLHttpRequest();
    var url_prov = 'data/rdc_prov.json'   
        req2.open('GET', url_prov, true);
        req2.onreadystatechange = handler;
        req2.send();
    var topoob2 = {};
    geoprov = {};

    function handler(){

        if ((req.readyState === XMLHttpRequest.DONE) && (req2.readyState === XMLHttpRequest.DONE))  {
        	//btn_change_lyr(g.currentvars.currentMapLyr);
        	map = generateMap('#map', [], req.responseText, req2.responseText);
			//$('#map').width($('#map').width());  
			updateMapInfo('', '', '', '');
			//var svg = initMapLegend();
			updateMapLegend(g.currentvars.currentMinVal, g.currentvars.currentMaxVal);
			changeDiseaseSelection();
			changeStatSelection();
			console.log("g = ", g);
        }

    }

    /*var URL = new Array();
	URL[0] = 'data/rdc_zs.json';
	URL[1] = 'data/rdc_zs.json';

	var nRequest = new Array();
    for (var i=0; i<2; i++){
	    (function(i) {
	        nRequest[i] = new XMLHttpRequest();
	        nRequest[i].open("GET", URL[i], true);
	        nRequest[i].onreadystatechange = function (oEvent) {
	            if (nRequest[i].readyState === 4) {
	                if (nRequest[i].status === 200) {
	                    //console.log(nRequest[i].responseText);
	                    //alert(nRequest[i].responseText);
		            } else {
		              console.log("Error", nRequest[i].statusText);
		            }
	         	}
	        };
	        nRequest[i].send(null);
	    })(i);
	}

    console.log("nRequest: ", nRequest);*/


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
	'<i>Semaines: </i><b>NA</b><br/>' + loc_html;
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
	updateAll();
}
