////////////////////////////////////////////////////////////////////
//Next dev steps:
// - remove "var data ="" from data.js  (or add it in export from database?)
// - barchart:
//    - on hover tooltip for whole height of chart, not only for bars  https://blog.webkid.io/responsive-chart-usability-d3/
//    - epiweek date on Thurs 00:00, should be Thurs 12:00 to be exactly halfway through week
//
// Recommendations from others:
// - Help Intro.js
//
// Suggestions:
// - add buttons for selecting relative time range options? e.g. 'last 1 epimonth', 'last 8 epiweeks'
// - move Nombre de Cas/lethality dropdown choices to above map (as only relevant to map)
//
// Done since last update:
// - added lethality layer to map & bar chart
// - brush chart default time selection relfects relative time (uses 'last 3 months' as default)
// - x-axis label displays epiweek (not date) & calculates label frequency depending on bar width
// - added province boundary to zones view in map
// - made zone/prov buttons more aesthetic  
////////////////////////////////////////////////////////////////////

// - examples online: http://techslides.com/over-2000-d3-js-examples-and-demos
// - brush handles: https://bl.ocks.org/mbostock/4349545
// - brush snapping: https://bl.ocks.org/mbostock/6232537
// - brush snapping: http://bl.ocks.org/emeeks/8899a3e8c31d4c5e7cfd
// - https://bl.ocks.org/misanuk/fc39ecc400eed9a3300d807783ef7607
// - leaflet overlay: http://jsfiddle.net/FH9VF/11/



/***********************/
/*****  DATA PREP  *****/
/***********************/
//Global namespace
var g = {};
[data,date_extent] = addEpitime(data,g);
//console.log("date_extent: ", date_extent);
console.log(g);

/*************************/
/*****  CROSSFILTER  *****/
/*************************/
var cf = crossfilter(data);
console.log(data);

//cf.epiWkDim = cf.dimension(function(d) {return d.epiwk;});
cf.epiDateDim = cf.dimension(function(d) {return d.epidate});
cf.malDim = cf.dimension(function(d){if (d.mal!='') {return d.mal}});
/*cf.provDim = cf.dimension(function(d) {if (d.prov=='') {return 'cod300xxx';} else {return d.prov_pc}});  
cf.provDim2 = cf.dimension(function(d) {if (d.prov=='') {return 'cod300xxx';} else {return d.prov_pc}});  //to filter on only
cf.zsDim = cf.dimension(function(d) {if (d.zs_pc=='') {return 'cod200xxx';} else {return d.zs_pc}});
cf.zsDim2 = cf.dimension(function(d) {if (d.zs_pc=='') {return 'cod200xxx';} else {return d.zs_pc}});  //to filter on only*/
cf.provDim = cf.dimension(function(d) {if (d.prov=='') {return '';} else {return d.prov_pc}});  
cf.provDim2 = cf.dimension(function(d) {if (d.prov=='') {return '';} else {return d.prov_pc}});  //to filter on only
cf.zsDim = cf.dimension(function(d) {if (d.zs_pc=='') {return '';} else {return d.zs_pc}});
cf.zsDim2 = cf.dimension(function(d) {if (d.zs_pc=='') {return '';} else {return d.zs_pc}});  //to filter on only

/*cf.casesByEpiDateGroup = cf.epiDateDim.group().reduceSum(function (d) {return d.cas;});
console.log("Cases by EpiDate: ", cf.casesByEpiDateGroup.top(Infinity));
cf.deathsByEpiDateGroup = cf.epiDateDim.group().reduceSum(function (d) {return d.dec;});
console.log("Deaths by EpiDate: ", cf.deathsByEpiDateGroup.top(Infinity));*/
cf.statsByEpiDateGroup = cf.epiDateDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);
console.log("Stats by EpiDate: ", cf.statsByEpiDateGroup.top(Infinity));

/*cf.casesByZsGroup = cf.zsDim.group().reduceSum(function (d) {return d.cas;});
console.log("Cases by Zone: ", cf.casesByZsGroup.top(Infinity));
cf.deathsByZsGroup = cf.zsDim.group().reduceSum(function (d) {return d.dec;});
console.log("Deaths by Zone: ", cf.deathsByZsGroup.top(Infinity));*/
cf.statsByZsGroup = cf.zsDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);
console.log("Stats by Zone: ", cf.statsByZsGroup.top(Infinity));

/*cf.casesByProvGroup = cf.provDim.group().reduceSum(function (d) {return d.cas;});
console.log("Cases by Province: ", cf.casesByProvGroup.top(Infinity));
cf.deathsByProvGroup = cf.provDim.group().reduceSum(function (d) {return d.dec;});
console.log("Deaths by Province: ", cf.deathsByProvGroup.top(Infinity));*/
cf.statsByProvGroup = cf.provDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);
console.log("Stats by Province: ", cf.statsByProvGroup.top(Infinity));


function reduceAdd(p, v) {
	//console.log("add", p,v);
    p.cas += v.cas;
    p.dec += v.dec;
    p.let = p.cas!=0 ? (p.dec/p.cas) : 0;
    return p;
}
function reduceRemove(p, v) {
	//console.log("subtract", p,v);
    p.cas -= v.cas;
    p.dec -= v.dec;
    p.let = p.cas!=0 ? (p.dec/p.cas) : 0;
    return p;
}
function reduceInitial() {
	//console.log("initialise");
    return {
        cas: 0,
        dec: 0,
        let: 0
    };
}


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

//g.statList = [{abrv: 'cas', full: 'Nombre de Cas', color_scale: 'YlBr'}, {abrv: 'dec', full: 'Nombre de Décès', color_scale: 'Red'}, {abrv: 'let', full: 'Létalité', color_scale: 'Red'}]; //later can add 'Taux d\'Incidence', 'Taux de Mortalité'
g.statList = [{abrv: 'cas', full: 'Nombre de Cas', color_scale: 'YlBr'}, {abrv: 'let', full: 'Létalité', color_scale: 'Red'}]; //later can add 'Taux d\'Incidence', 'Taux de Mortalité'


//Set color variables for map
g.mapcolors = {};
g.mapcolors.color_scale = {};
g.mapcolors.color_scale.YlBr = {color_min: '#ffffcc', color_max: '#800026'};
g.mapcolors.color_scale.Red = {color_min: '#fee0d2', color_max: '#a50f15'};
g.mapcolors.color_zero = '#d3d3d3'; //'#a8a8a8';
g.mapcolors.color_boundary = '#2f4f4f';  //dark slate grey    //'#6495ED';
g.mapcolors.color_rivers = '#1673ae'; //'#3b8ec2';
g.mapcolors.playbar_color = '#4d4d4d'; 

//Declare 'current' variables
g.currentvars = {};
g.currentvars.currentDisease;
g.currentvars.currentStat = g.statList[0];
g.currentvars.currentMinVal;
g.currentvars.currentMaxVal;
g.currentvars.currentMapLyr = 'prov';    //'prov' or 'zone'
g.currentvars.currentTotals = {};
g.currentvars.currentZones = {pcodes: [], names: []};
g.currentvars.currentProvs = {pcodes: [], names: []};
g.currentvars.currentEpiDates = {};
//g.currentvars.currentEpiDates.min_default = new Date(2015,7,31);
//g.currentvars.currentEpiDates.max_default = new Date(2015,10,30);
var dateRange = getEpiRange();
g.currentvars.currentEpiDates.min_default = dateRange[0];
g.currentvars.currentEpiDates.max_default = dateRange[1];
g.currentvars.currentEpiDates.min = g.currentvars.currentEpiDates.min_default; //new Date(2015,7,31);
g.currentvars.currentEpiDates.max = g.currentvars.currentEpiDates.max_default; //new Date(2015,10,30);
g.currentvars.currentEpiDates.all = []; //[new Date(2015,2,2), new Date(2015,2,9)];
g.currentvars.currentEpiWeek = {};
g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);
g.currentvars.currentTimeSeries = [];
g.currentvars.currentAnimation = {};
g.currentvars.currentAnimation.playMode = 'stop'; //'play', 'pause', or 'stop'
g.currentvars.currentAnimation.currentEpiDate;
//g.currentvars.currentAnimation.currentEpiWeek = getEpiWeek(g.currentvars.currentAnimation.currentEpiDate);
g.currentvars.currentAnimation.maxLegendVal;




/***************/
/****  MAP  ****/
/***************/

function getCurrentPolyVars() {
	//console.log("current layer = ", g.currentvars.currentMapLyr);
	var currentValues = [];

	cf.epiDateDim.filterAll();
    //console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)
    if (g.currentvars.currentAnimation.playMode=='play') {
    	cf.epiDateDim.filterExact(g.currentvars.currentAnimation.currentEpiDate);
    } else if (sameDay(g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)) {
    	//console.log("same day ok");
    	cf.epiDateDim.filterExact(g.currentvars.currentEpiDates.min);
	} else {  //filter from min date to max date + 1 (+1 is so that it includes max date)
    	cf.epiDateDim.filterRange([g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 1)]); 
    };
	
	
	if (g.currentvars.currentMapLyr=='zone') {
		//if (g.currentvars.currentStat.abrv=='cas') {
			//currentValues = cf.casesByZsGroup.top(Infinity);
			currentValues = cf.statsByZsGroup.top(Infinity);
		//} else if (g.currentvars.currentStat.abrv=='dec') {
			//currentValues = cf.deathsByZsGroup.top(Infinity);
			//currentValues = cf.lethalityByZsGroup.top(Infinity);
			//currentValues = cf.statsByZsGroup.top(Infinity);
		//};
	} else if (g.currentvars.currentMapLyr=='prov') {
		//if (g.currentvars.currentStat.abrv=='cas') {
			//currentValues = cf.casesByProvGroup.top(Infinity);
			currentValues = cf.statsByProvGroup.top(Infinity);
		//} else if (g.currentvars.currentStat.abrv=='dec') {
			//currentValues = cf.deathsByProvGroup.top(Infinity);
			//currentValues = cf.lethalityByProvGroup.top(Infinity);
			//currentValues = cf.statsByProvGroup.top(Infinity);
		//};
	};
	//console.log("currentValues: ", currentValues);
	g.currentvars.currentMinVal = 0;
	g.currentvars.currentMaxVal = 0;
	g.currentvars.currentTotals = {'cas': 0, 'dec': 0, 'let': 0};
	if (g.currentvars.currentAnimation.playMode=='play') {
		g.currentvars.currentMaxVal = g.currentvars.currentAnimation.maxLegendVal;
		for (var i=0; i<=currentValues.length-1; i++) {
			//if ((currentValues[i].key != 'cod200xxx') && (currentValues[i].key != '')) {
			if (currentValues[i].key != '') {
				//g.currentvars.currentSum += currentValues[i].value;
				/*g.currentvars.currentTotals.cas = currentValues[i].value.cas;
				g.currentvars.currentTotals.dec = currentValues[i].value.dec;
				g.currentvars.currentTotals.leth = currentValues[i].value.leth;*/
					g.currentvars.currentTotals.cas += currentValues[i].value.cas;
					g.currentvars.currentTotals.dec += currentValues[i].value.dec;
					g.currentvars.currentTotals.let = (g.currentvars.currentTotals.cas!=0)? g.currentvars.currentTotals.dec/g.currentvars.currentTotals.cas : 0;
			}
		}
	} else {
		for (var i=0; i<=currentValues.length-1; i++) {
			//if ((currentValues[i].key != 'cod200xxx') && (currentValues[i].key != '')){
			if (currentValues[i].key != '') {
				//if (g.currentvars.currentMinVal > currentValues[i].value) {g.currentvars.currentMinVal = currentValues[i].value};
				//console.log(g.currentvars.currentMaxVal, currentValues[i].value[g.currentvars.currentStat.abrv], currentValues[i])
				if (g.currentvars.currentMaxVal < currentValues[i].value[g.currentvars.currentStat.abrv]) {g.currentvars.currentMaxVal = currentValues[i].value[g.currentvars.currentStat.abrv]};
				//g.currentvars.currentSum += currentValues[i].value;
				g.currentvars.currentTotals.cas += currentValues[i].value.cas;
				g.currentvars.currentTotals.dec += currentValues[i].value.dec;
				g.currentvars.currentTotals.let = (g.currentvars.currentTotals.cas!=0)? g.currentvars.currentTotals.dec/g.currentvars.currentTotals.cas : 0;
			}
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
		currentPolyVars[currentValues[i].key]['value'] = currentValues[i].value[g.currentvars.currentStat.abrv];
		currentValues[i].value[g.currentvars.currentStat.abrv]==0? currentPolyVars[currentValues[i].key]['color'] = g.mapcolors.color_zero : currentPolyVars[currentValues[i].key]['color'] = color(currentValues[i].value[g.currentvars.currentStat.abrv]); 
	}
	//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)
	//console.log("Current poly vars: ", currentPolyVars);
    return currentPolyVars;
}


function getMaxLegendVal() {   //if ((currentValues[i].key != 'cod200xxx') && (currentValues[i].key != '')) 
	var maxValue = 0;
	var values = [];

	for (var i=0; i<=g.currentvars.currentEpiDates.all.length-1; i++) {
		cf.epiDateDim.filterAll();
		cf.epiDateDim.filterExact(g.currentvars.currentEpiDates.all[i]).top(Infinity);

		if (g.currentvars.currentMapLyr=='zone') {
			/*if (g.currentvars.currentStat.abrv=='cas') {
				values = cf.casesByZsGroup.top(Infinity);
			} else if (g.currentvars.currentStat.abrv=='dec') {
				values = cf.deathsByZsGroup.top(Infinity);
				//values = cf.lethalityByZsGroup.top(Infinity);
			} else if (g.currentvars.currentStat.abrv=='leth') {*/
				values = cf.statsByZsGroup.top(Infinity);
				//values = cf.lethalityByZsGroup.top(Infinity);
			//};
		} else if (g.currentvars.currentMapLyr=='prov') {
			/*if (g.currentvars.currentStat.abrv=='cas') {
				values = cf.casesByProvGroup.top(Infinity);
			} else if (g.currentvars.currentStat.abrv=='dec') {
				values = cf.deathsByProvGroup.top(Infinity);
				//values = cf.lethalityByProvGroup.top(Infinity);
			};*/
			values = cf.statsByProvGroup.top(Infinity);
		};


		//console.log("values, ", g.currentvars.currentEpiDates.all[i], values);
		for (var j=0; j<=values.length-1; j++) {
			//if ((values[j].key != 'cod200xxx') && (values[j].key != '')) {
			if (values[j].key != '') {
				//console.log(maxValue, g.currentvars.currentStat.abrv, values[j].value[g.currentvars.currentStat.abrv])
				if (maxValue < values[j].value[g.currentvars.currentStat.abrv]) {
					maxValue = values[j].value[g.currentvars.currentStat.abrv]
					if (values[j].value[g.currentvars.currentStat.abrv]==1) {
						//console.log(values[j].key, values[j].value['let'])
					}
					//console.log("up a notch: ", values[j].value[g.currentvars.currentStat.abrv], values[j])
				};
				//console.log(maxValue, values[j].value[g.currentvars.currentStat.abrv])
			}
		}

	}

	//filter dates from min to max+1 (+1 in order to include max date itself)
	cf.epiDateDim.filterRange([g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 1)]);
	//console.log("Max Legend Value = ", maxValue);
	return maxValue;
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
				if (g.currentvars.currentStat.abrv=='cas') {
					var val = "Cas: " + d3.format(",.0f")(currentMapData[prov_pcode].value);
				} else if (g.currentvars.currentStat.abrv=='dec') {
					var val = "Décès: " + d3.format(",.0f")(currentMapData[prov_pcode].value);
				} else if (g.currentvars.currentStat.abrv=='let') {
					var val = "Létalité: " + d3.format(",.2%")(currentMapData[prov_pcode].value);
				};
			} catch(e) {
				var val = 0;
			}
			infoUpdate = (prov_name && prov_pcode) ? "<h4>"+prov_name+ "</h4>" + val : "Survolez une région"  
		} catch(e) {
			infoUpdate = "<p><i>ERROR</i></p>"
		}
	} else if (g.currentvars.currentMapLyr=='zone') {
		try {
			try {
				//var val = d3.format(",.0f")(currentMapData[zs_pcode].value);
				if (g.currentvars.currentStat.abrv=='cas') {
					var val = "Cas: " + d3.format(",.0f")(currentMapData[zs_pcode].value);
				} else if (g.currentvars.currentStat.abrv=='dec') {
					var val = "Décès: " + d3.format(",.0f")(currentMapData[zs_pcode].value);
				} else if (g.currentvars.currentStat.abrv=='let') {
					var val = "Létalité: " + d3.format(",.2%")(currentMapData[zs_pcode].value);
				};
			} catch(e) {
				var val = 0;
			}
			infoUpdate = (zs_name && zs_pcode && prov_name) ? "<h4>"+zs_name+", "+prov_name+ "</h4>" +  val : "Survolez une région"  
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
	if ((g.currentvars.currentStat.abrv=='cas') || (g.currentvars.currentStat.abrv=='dec')) {
		max = Math.max(1, max);
	}
	d3.select(".maplegend").select("svg").remove();
	var shift_right = 25;

    //Create gradient for legend 
	var margin = {
		top: 0,
		right: 18,
		bottom: 0, 
		left: 14
	};
	var width = 200; 
	var height = 50; 

	function getTicks() {
		if (g.currentvars.currentStat.abrv=='let') {
			return 3;
		} else if (max == 1) {
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
		.tickFormat(function(d) {
			if (d==0) {
				return '';
			} else {
				if ((g.currentvars.currentStat.abrv=='cas') || (g.currentvars.currentStat.abrv=='dec')) {
					return d3.format(",.0f")(d);
				} else if (g.currentvars.currentStat.abrv=='let') {
					return d3.format(",.1%")(d);
				}
			} 
		})
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



function generateMap(id, data, responseText_zs, responseText_prov, responseText_provbound, responseText_riv) { 		
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

    function style_prov_bound(feat, i){		//polyline layer
        return {color: 'black', //g.mapcolors.color_boundary,
                weight: 2,
			    opacity: 1
            	//className: 'dashgeom boundgeom'+feat.properties.pcode
            	}
    }

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

    map = L.map('map', {
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
                    
        /*geozs.features = geozs.features.map(function(fm,i){
            var ret = fm;
            ret.indie = i;
            return ret
        });*/
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
	    geojson_prov = L.geoJson(geoprov, {style:style, onEachFeature: onEachFeature});
		geojson_prov.addTo(map);
	}
	catch(e){
	    geojson_prov = {};
	    console.log(e)
	}

	//try/catch json parsing of responseText
	try {
	    topoob3 = JSON.parse(responseText_provbound)
	    geoprovbound = topojson.feature(topoob3, topoob3.objects.rdc_prov_bound)
	    geojson_prov_bound = L.geoJson(geoprovbound, {style:style_prov_bound});
		//geojson_prov_bound.addTo(map);
	}
	catch(e){
	    geojson_prov_bound = {};
	    console.log(e)
	}

	//try/catch json parsing of responseText
	try {
	    topoob4 = JSON.parse(responseText_riv)
	    georiv = topojson.feature(topoob4, topoob4.objects.rdc_rivers)
	    geojson_riv = L.geoJson(georiv, {style:style_riv});
		geojson_riv.addTo(map);
	}
	catch(e){
	    geojson_riv = {};
	    console.log(e)
	}


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
		if (g.currentvars.currentAnimation.playMode == 'stop') {
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
	}

	function onEachFeature(feature, layer){
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight, 
			click: selectFeature, 
			dblclick: zoomToFeature
		})
	}

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
		map.removeLayer(geojson_prov_bound);
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
		geojson_prov_bound.addTo(map);
		geojson_prov_bound.bringToFront();
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
			//console.log(i, g.currentvars.currentZones.pcodes[i]);
			for (var j=0; j<= geonames.length-1; j++) {
				if (g.currentvars.currentZones.pcodes[i]==geonames[j].zs_pcode) {
					//console.log("FOUND MATCH: ", g.currentvars.currentZones.pcodes[i], geonames[j].zs_pcode)
					//console.log(g.currentvars.currentProvs.pcodes, geonames[j].prov_pcode)
					if (g.currentvars.currentProvs.pcodes.indexOf(geonames[j].prov_pcode) == -1) {		//if prov poly not already in list, then add it (if in list, do nothing)
						//console.log("Not in list - needs to be added")
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

function getCurrentTimeSeriesData() {
	var timeSeries = [];

	/*if (g.currentvars.currentStat.abrv=='cas') {
		timeSeries = cf.casesByEpiDateGroup.top(Infinity);
	} else if (g.currentvars.currentStat.abrv=='dec') {
		timeSeries = cf.deathsByEpiDateGroup.top(Infinity);
		//timeSeries = cf.lethalityByEpiDateGroup.top(Infinity);
	} else if (g.currentvars.currentStat.abrv=='let') {	*/			
		statsInTime = cf.statsByEpiDateGroup.top(Infinity);
		//timeSeries = cf.lethalityByEpiDateGroup.top(Infinity);
	//};
	//console.log("statsInTime: ", statsInTime);

	for (var i=0; i<=statsInTime.length-1; i++) {
		timeSeries.push({'key': statsInTime[i].key, 'value': statsInTime[i].value});
	}
	//sort into date order
	timeSeries.sort(function(a,b){
		return b.key - a.key;
	    //return new Date(b.key) - new Date(a.key);
	});
	//console.log("timeSeries: ", timeSeries);

	g.currentvars.currentTimeSeries = timeSeries;
	return timeSeries;
}


function createTimeSeriesCharts(id1, id2) {
	//console.log("IN CREATE CHARTS");

	var margin = {top: 10, right: 60, bottom: 20, left: 60},		//margins of actual x- and y-axes within svg  
	    margin2 = {top: 10, right: 60, bottom: 20, left: 60}, 
	    width = $(id1).width() - margin.left - margin.right,		//width of main svg
	    width2 = $(id2).width() - margin2.left - margin2.right,
	    height = $(id1).height() - margin.top - margin.bottom,		//height of main svg
	    height2 = $(id2).height() - margin2.top - margin2.bottom;

	//Render main SVGs
	svg1 = d3.select(id1)         
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom);
		/*.attr("width", "100%")
		.attr("height", "100%");*/

	svg2 = d3.select(id2)         
		.append("svg")
		.attr("width", width2 + margin2.left + margin2.right)
		.attr("height", height2 + margin2.top + margin2.bottom);
		/*.attr("width", "100%")
		.attr("height", "100%");*/

	var x = d3.scaleTime().range([0, width]),   		//x-axis width, accounting for specified margins
		x2 = d3.scaleTime().range([0, width2]),
	    y = d3.scaleLinear().range([height, 0]),
	    y2 = d3.scaleLinear().range([height2, 0]),
	    ylet = d3.scaleLinear().range([height, 0]),
	    ylet2 = d3.scaleLinear().range([height2, 0]);

	var xAxis = d3.axisBottom(x),
	    xAxis2 = d3.axisBottom(x2),
	    yAxis = d3.axisLeft(y).ticks(5).tickFormat(function(d) {return d3.format(",.0f")(d)}),
		yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) {return d3.format(",.1%")(d)});

	svg1.append("defs").append("clipPath")
	    .attr("id", "clip")
	  	.append("rect")
	    .attr("width", width)
	    .attr("height", height);
	    /*.attr("width", "100%")
		.attr("height", "100%");*/

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
	//console.log("time_data: ", time_data);
	//x.domain(d3.extent(time_data, function(d) { return d.key; }));
	x.domain([g.epitime.date_extent[0], d3.timeDay.offset(g.epitime.date_extent[1], 7)]);
	y.domain([0, d3.max(time_data, function(d) { return d.value.cas; })]);
	ylet.domain([0, d3.max(time_data, function(d) { return d.value.let; })]);
	x2.domain(x.domain());
	y2.domain(y.domain());
	ylet2.domain(ylet.domain());

	var orig_bar_width = (width/time_data.length);
	var bar_width = (width/time_data.length)-0.5;		//changing bar width only for focus chart  //0.5 for bar spacing
	g.currentvars.currentEpiDates.bar_width = bar_width;
	g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
	//console.log("bar_width: ", bar_width, g.currentvars.currentEpiDates.tick_freq);

	focus.selectAll(".bar")
	    .data(time_data)
	    .enter().append("rect")
	    .attr("class", "bar")
	    .attr("clip-path", "url(#clip)")
	    .attr("x", function(d) { return x(d.key); })
	    .attr("y", function(d) { return y(d.value.cas); })
	    .attr("width", bar_width)
	    .attr("height", function(d) { return height - y(d.value.cas); });

  	focus.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  	focus.append("g")
      .attr("class", "axis axis--y")
      .call(yAxis);

    
    var valueline = d3.line()
	    .x(function(d) { 		//add 3.5days here so data point drawn in middle of epiweek bar
	    	var newdate = new Date(d.key); 
	    	return x(newdate.setDate(newdate.getDate() + 3.5)); 
	    })  
	    .y(function(d) { return ylet(d.value.let); });

	focus.append("path")
	    .data([time_data])
	    .attr("class", "line")
	    .attr("clip-path", "url(#clip)")
	    .attr("d", valueline);

	focus.append("g")
      .attr("class", "axis axis--ylet")
      .attr("transform", "translate( " + width + ", 0 )")
      .call(yletAxis);

	context.selectAll(".bar2")
	    .data(time_data)
	    .enter().append("rect")
	    .attr("class", "bar2")
	    .attr("x", function(d) { return x2(d.key); })
	    .attr("y", function(d) { return y2(d.value.cas); })
	    .attr("width", orig_bar_width)
	    .attr("height", function(d) { return height2 - y2(d.value.cas); });

	context.append("g")
	      .attr("class", "axis axis--x")
	      .attr("transform", "translate(0," + height2 + ")")
	      .call(xAxis2);

	/*var valueline2 = d3.line()
	    .x(function(d) { 		//add 3.5days here so data point drawn in middle of epiweek bar
	    	var newdate = new Date(d.key); 
	    	return x(newdate.setDate(newdate.getDate() + 3.5)); 
	    })  
	    .y(function(d) { return ylet2(d.value.let); });

	context.append("path")
	    .data([time_data])
	    .attr("class", "line2")
	    .attr("d", valueline2);*/


	//add y-axis titles
	focus
		.append("text")
		.attr("class", "y-axis-title")
		//.attr("transform", "translate(-15," +  (height+margin.bottom)/2 + ") rotate(-90)")
		.attr("transform", "translate(-45," + (87) + ") rotate(-90)")
		.text(" ");
	focus
		.append("text")
		.attr("class", "ylet-axis-title")
		//.attr("transform", "translate(-15," +  (height+margin.bottom)/2 + ") rotate(-90)")
		.attr("transform", "translate(" + (width+60) + "," + (66) + ") rotate(-90)")
		.text(" ");


	//Render vertical line overlapping current bar in play mode
	svg1.append("line")
		.attr("class", "playBar_line");

}

	
function getTickFrequency(bar_width) {
	if (bar_width > 55) {return 1}
	else if (bar_width > 35) {return 2}
	else if (bar_width > 20) {return 3}
	else {
		var freq = 97.405*Math.pow(bar_width, -1.133);    //power eqn fit for this purpose
		//console.log("bar_width, tick freq: ", bar_width, freq, g.currentvars.currentEpiDates.min);
		return freq;
	}
}

function updateTimeSeriesCharts(id1, id2, time_data) {
	//console.log("IN UPDATE CHARTS");

	var margin = {top: 10, right: 60, bottom: 20, left: 60},		//margins of actual x- and y-axes within svg  
	    margin2 = {top: 10, right: 60, bottom: 20, left: 60}, 
	    width = $(id1).width() - margin.left - margin.right,		//width of main svg
	    width2 = $(id2).width() - margin2.left - margin2.right,
	    height = $(id1).height() - margin.top - margin.bottom,		//height of main svg
	    height2 = $(id2).height() - margin2.top - margin2.bottom;

	var x = d3.scaleTime().range([0, width]),   		//x-axis width, accounting for specified margins
		x2 = d3.scaleTime().range([0, width2]),
	    y = d3.scaleLinear().range([height, 0]),
	    y2 = d3.scaleLinear().range([height2, 0]),
	    ylet = d3.scaleLinear().range([height, 0]),
	    ylet2 = d3.scaleLinear().range([height2, 0]);

	//set domains
	x.domain([g.epitime.date_extent[0], d3.timeDay.offset(g.epitime.date_extent[1], 7)]);
	y.domain([0, d3.max(time_data, function(d) {return d.value.cas; })]);
	ylet.domain([0, d3.max(time_data, function(d) {return d.value.let; })]);
	x2.domain(x.domain());
	y2.domain(y.domain());
	ylet2.domain(ylet.domain());

	/*function numFormat(val) {
		if ((g.currentvars.currentStat.abrv=='cas') || (g.currentvars.currentStat.abrv=='dec')) {
			return d3.format(',.0f')(val);
		} else if (g.currentvars.currentStat.abrv=='let') {
			return d3.format(',.2%')(val);
		} else {
			return d3.format(',.0f')(val);
		}
	}*/
	//get the width of each bar 
	var orig_bar_width = (width/time_data.length);
	var bar_width = (width/time_data.length) - 0.5;		//0.5 for bar spacing
	g.currentvars.currentEpiDates.bar_width = bar_width;
	g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
	//console.log("bar_width: ", bar_width, g.currentvars.currentEpiDates.tick_freq);


	var xAxis = d3.axisBottom(x)
		.ticks(d3.timeThursday, g.currentvars.currentEpiDates.tick_freq) 
		//.ticks(function(d) {return d3.timeThursday})
		//.ticks(function(d) {console.log(d); return (d3.timeMonday, tick_frequency)})
		.tickFormat(function(d) {
				//d3.timeDay.offset(d3.timeMonday, 3.5)
				//console.log("Updating xAxis, tick: ", dateFormat(d)); 
				var newdate = new Date(d); 
				//return getEpiWeek(d);
				//return dateFormat(d);
				return getEpiWeek(d3.timeDay.offset(d, -3));
		}),
	    xAxis2 = d3.axisBottom(x2),
		yAxis = d3.axisLeft(y).ticks(5).tickFormat(function(d) {return d3.format(",.0f")(d)}),
		yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) {return d3.format(",.1%")(d)});

	
	
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
	    .attr("clip-path", "url(#clip)")
	    .attr("x", function(d) { return x(d.key); })
	    .attr("y", function(d) { return y(d.value.cas); })
	    .attr("width", bar_width)
	    .attr("height", function(d) { return height - y(d.value.cas); })
	    .on("mousemove", function(d){
            tooltip
              .style("left", d3.event.pageX - 50 + "px")
              .style("top", d3.event.pageY - 70 + "px")
              .style("display", "inline-block")
              .html("Semaine epi: <b>" + getEpiWeek(d.key) + "</b><br>Semaine du: <b>" + dateFormat(d.key) + "</b><br>" + g.statList[0].full + ": <b>" + d3.format(',.0f')(d.value.cas) + "</b><br>" + g.statList[1].full + ": <b>" + d3.format(',.2%')(d.value.let) + "</b>")
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

	var valueline = d3.line()
	    .x(function(d) { 		//add 3.5days here so data point drawn in middle of epiweek bar
	    	var newdate = new Date(d.key); 
	    	return x(newdate.setDate(newdate.getDate() + 3.5)); 
	    })  
	    .y(function(d) { return ylet(d.value.let); });

	var letline = svg1.select('g').selectAll(".line")
					.remove()
					.exit()
					.data([time_data]);

	letline.enter().append('path')
				.attr("class", "line")
				.attr("clip-path", "url(#clip)")
    			.attr("d", valueline);

	/*svg1.select('g').selectAll(".line")
	    .data([time_data])
	    .attr("class", "line")
	    .attr("d", valueline);*/

	svg1.select('.axis--ylet')
      //.attr("transform", "translate( " + width + ", 0 )")
      .call(yletAxis);
	svg1.select(".y-axis-title")
		//.text(g.currentvars.currentStat.full);
		.text(g.statList[0].full);
	svg1.select(".ylet-axis-title")
		.text(g.statList[1].full);

	var bar2 = svg2.select('g').selectAll(".bar2")
					.remove()
					.exit()
					.data(time_data)

	bar2.enter()
		.append("rect")
		.attr("class", "bar2")
	    .attr("x", function(d) { return x2(d.key); })
	    .attr("y", function(d) { return y2(d.value.cas); })
	    .attr("width", orig_bar_width)
	    .attr("height", function(d) { return height2 - y2(d.value.cas); });

/*	var valueline2 = d3.line()
	    .x(function(d) { 		//add 3.5days here so data point drawn in middle of epiweek bar
	    	var newdate = new Date(d.key); 
	    	return x(newdate.setDate(newdate.getDate() + 3.5)); 
	    })  
	    .y(function(d) { return ylet2(d.value.let); });

	var letline2 = svg2.select('g').selectAll(".line2")
					.remove()
					.exit()
					.data([time_data]);

	letline2.enter().append('path')
				.attr("class", "line2")
    			.attr("d", valueline2);*/

	svg2.select('.axis--x2')
		.call(xAxis2)	

	var zoom = d3.zoom()
	    .scaleExtent([1, Infinity])
	    .translateExtent([[0, 0], [width, height]])
	    .extent([[0, 0], [width, height]])
	    .on("zoom", zoomed);

	var brush = d3.brushX()
	    .extent([[0, 0], [width2, height2]])
	    .on("brush", brushmoved)
	    .on("end", brushend);



	//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)
	if (svg2.selectAll('g.brush').empty()) {
		//console.log("APPENDING NEW BRUSH");
		var gBrush = svg2.append("g")
					    .attr("class", "brush")
					    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")")
				        .call(brush);

		var handle = gBrush.selectAll(".handle--custom")
			  .data([{type: "w"}, {type: "e"}])
			  .enter().append("path")
			    .attr("class", "handle--custom")
			    .attr("fill", "#666")
			    .attr("fill-opacity", 1)
			    .attr("stroke", "#000")
			    .attr("stroke-width", 1.5)
			    .attr("cursor", "ew-resize")
			    .attr("transform", "translate(" + (0) + "," + (14) + ")")
			    .attr("d", d3.arc()
			        .innerRadius(0)
			        .outerRadius(16) //(height2 + margin2.bottom)/4) // + margin2.bottom) / 3)
			        .startAngle(0)
			        .endAngle(function(d, i) {return i ? Math.PI : -Math.PI; }));
		//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)	
		gBrush.call(brush.move, [g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7)].map(x)); 
	} else {
		//console.log("SELECTING BRUSH")
		var gBrush = svg2.select('g.brush');
		var handle = gBrush.selectAll(".handle--custom");
		brushupdate();
		//console.log(g.currentvars.currentEpiDates.bar_width, g.currentvars.currentEpiDates.tick_freq);
	}
	//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)

	// style brush handle
	/*var brushResizePath = function(d) {
	    var e = +(d.type == "e"),
	        x = e ? 1 : -1,
	        y = height / 2;
	    return "M" + (.5 * x) + "," + y + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6) + "V" + (2 * y - 6) + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y) + "Z" + "M" + (2.5 * x) + "," + (y + 8) + "V" + (2 * y - 8) + "M" + (4.5 * x) + "," + (y + 8) + "V" + (2 * y - 8);
	}*/

	function brushmoved() {
		//console.log("IN BRUSHMOVED", g.currentvars.currentEpiDates);
		//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max);
		//console.log("PROBLEM Current epidates ALL: ", g.currentvars.currentEpiDates.all);
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
	    
	    //var s = d3.event.selection;
	    var s = d3.event.selection || x2.range();   //range selected or entire range
	    //console.log(d3.event.selection, x2.range(), s);

	    bar_width = ((orig_bar_width) * (x2.range()[1]-x2.range()[0])/(s[1]-s[0])) - 0.5;   //0.5 for bar spacing
	    g.currentvars.currentEpiDates.bar_width = bar_width;
	    g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
	    //console.log("bar_width: ", bar_width, g.currentvars.currentEpiDates.tick_freq);

		/*function getTickFrequency() {
			if (g.currentvars.currentEpiDates.bar_width > 55) {return 1}
			else if (g.currentvars.currentEpiDates.bar_width > 35) {return 2}
			else if (g.currentvars.currentEpiDates.bar_width > 20) {return 3}
			else {
				var freq = 97.405*Math.pow(g.currentvars.currentEpiDates.bar_width,-1.133);    //power eqn fit for this purpose
				console.log("bar_width, tick freq: ", g.currentvars.currentEpiDates.bar_width, freq);
				return freq;
			}
		}*/
		
		var xAxis = d3.axisBottom(x)
			.ticks(d3.timeThursday, g.currentvars.currentEpiDates.tick_freq)
			//.ticks(d3.timeDay.floor(), g.currentvars.currentEpiDates.tick_freq)
			//.ticks(d3.timeThursday.every(g.currentvars.currentEpiDates.tick_freq).range(new Date(2015, 1, 2), new Date(2015, 10, 8)))
			//.ticks(d3.timeThursday.every(g.currentvars.currentEpiDates.tick_freq))
			//.ticks(d3.timeThursday.filter(function(d) {console.log(d3.timeHour.offset(d, 12)); return (d3.timeHour.offset(d, 12))}))
			//.ticks(function(d) {/*console.log(d); */return (d3.timeMonday)})
			//.ticks(day.filter(function(d) { return day.count(0, d) % 3 === 0; }))
			//.ticks(d3.timeThursday.filter(function(d) { return d3.timeThursday.offset(d, -3) })) //Day.count(0, d) % 3 === 0; }))
			.tickFormat(function(d) {
					//d3.timeDay.offset(d3.timeMonday, 3.5)
					//console.log("Updating xAxis, tick: ", dateFormat(d)); 
					var newdate = new Date(d); 
					var newdate2 = new Date(d3.timeDay.offset(newdate, 3));
					var newdate3 = new Date(newdate2);
					//newdate3.setHours(newdate2.getHours() + 12);
					//console.log(newdate, newdate2, newdate3);
					//console.log(d3.timeThursday.setHours)
					//console.log(d3.timeDay.offset(newdate, 3));
					//return getEpiWeek(d);
					//return dateFormat(d);
					//return getEpiWeek(d3.timeDay.offset(newdate3, -3.5));
					return getEpiWeek(d3.timeDay.offset(d, -3));
			})
	    svg1.select('g').select('.axis--x').call(xAxis);

	    //svg1.select('.axis--x').call(xAxis)

	    g.currentvars.currentEpiDates.all = [];
	    g.currentvars.currentEpiDates.s = s;


	    //if (s == x2.range()) {
	    if ((s[0]==x2.range()[0]) && (s[1]==x2.range()[1])) {  //if full extent
	    	//console.log("FULL EXTENT ", s, x2.range());
	        //handle.attr("display", "none");
	        svg2.selectAll(".bar2").classed("active", true);

	        for (var i=0; i<=g.epitime.all.length-1; i++) {
				g.currentvars.currentEpiDates.all.push(g.epitime.all[i].epiDate);
			}


			//svg2.select(".line2").attr("stroke", "green");

	    } else {	  
	    	//console.log("Current epidates ALL: ", g.currentvars.currentEpiDates.all);
	    	//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)      
	        var sx = s.map(x2.invert);
	        //console.log("s, sx: ", s, sx);
	        svg2.selectAll(".bar2").classed("active", function(d) {
	        	if (sx[0] <= d.key && d.key < sx[1]) {  	
	        		g.currentvars.currentEpiDates.all.push(d.key);
	        	} else {
	        		//console.log("NOT ACTIVE: ", sx[0] <= d.key && d.key <= sx[1], d.key);
	        	};
	        	return sx[0] <= d.key && d.key < sx[1]; 
	        });
	        //svg2.select('g').selectAll(".line2").attr("stroke", "green");
	        //console.log("PROBLEM Current epidates ALL: ", g.currentvars.currentEpiDates.all);
	        //console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)
	        handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4); */return "translate(" + [ s[i], 14] + ")"; });
	        //handle.attr("display", null).attr("transform", function(d, i) {"translate(" + [ s[i], (- height / 4) + 14] + ")"});

	    	

		

			x.domain(s.map(x2.invert, x2));
	    	svg1.select("g").selectAll(".bar")
	    		.attr("x", function(d) { return x(d.key); })
	    		.attr("width", bar_width);

	    	/*var xAxis = d3.axisBottom(x)
				.ticks(d3.timeThursday, g.currentvars.currentEpiDates.tick_freq)
				//.ticks(function(d) {return d3.timeThursday})
				//.ticks(function(d) {console.log(d); return (d3.timeMonday, tick_frequency)})
				.tickFormat(function(d) {
						//d3.timeDay.offset(d3.timeMonday, 3.5)
						//console.log("Updating xAxis, tick: ", dateFormat(d)); 
						var newdate = new Date(d); 
						//return getEpiWeek(d);
						//return dateFormat(d);
						return getEpiWeek(d3.timeDay.offset(d, -3));
				})*/
		    svg1.select('g').select('.axis--x').call(xAxis);
		
	/*var valueline = d3.line()
			    .x(function(d) { console.log(d.key, d3.format(',.2%')(d.value.let)); return x(d.key); })
			    .y(function(d) { return ylet(d.value.let); }); */

			//console.log('time_data max lethality = ', d3.format(',.2%')(d3.max(time_data, function(d) { return d.value.let; })));
			//console.log(ylet.domain()[0], ' - ', d3.format(',.2%')(ylet.domain()[1]));
			ylet.domain([0, d3.max(time_data, function(d) { return d.value.let; })]);
			ylet2.domain([0, d3.max(time_data, function(d) { return d.value.let; })]);
			//console.log(ylet.domain()[0], ' - ', d3.format(',.2%')(ylet.domain()[1]));
			svg1.select("g").selectAll(".line")
	    		.data([time_data])
			    .attr("class", "line")
			    .attr("d", valueline);



		    //svg1.select("g").select(".axis--ylet").call(yletAxis);
		    //svg1.select("g").select(".axis--ylet").attr("transform", "translate( " + width + ", 0 )").call(yletAxis);

		    svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
		        .scale(width / (s[1] - s[0]))
		        .translate(-s[0], 0));

	    }
	    //console.log("PROBLEM Current epidates ALL: ", g.currentvars.currentEpiDates.all);
	    //console.log("PROBLEM Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)
	    g.currentvars.currentEpiDates.min = new Date(Math.min.apply(null,g.currentvars.currentEpiDates.all));
	    g.currentvars.currentEpiDates.max = new Date(Math.max.apply(null,g.currentvars.currentEpiDates.all));
	    g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
		g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);

/*		active_data = [];
		for (var i=0; i<=time_data.length-1; i++) {
			if ((d3.timeDay.offset(g.currentvars.currentEpiDates.min, -7) <= time_data[i].key) && (time_data[i].key <= d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7))) {
				active_data.push(time_data[i]);
			}
		}
		//console.log("active data: ", active_data);

		var valueline3 = d3.line()
		    .x(function(d) { 		//add 3.5days here so data point drawn in middle of epiweek bar
		    	var newdate = new Date(d.key); 
		    	return x2(newdate.setDate(newdate.getDate() + 3.5)); 
		    })  
		    .y(function(d) { return ylet2(d.value.let); });

        var letline2_active = svg2.select('g').selectAll(".line2_active")
				.remove()
				.exit()
				.data([active_data]);

		letline2_active.enter().append('path')
			.attr("class", "line2_active")
			.attr("d", valueline3)
	        .attr("stroke", "red");*/
        //svg2.selectAll(".line2").attr("stroke", "green");

		//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)
		//console.log("IN BRUSHMOVED - DONE");
	}

	function brushupdate() {  //called when updating through code, not mousemove
		//console.log("IN BRUSHUPDATE ", g.currentvars.currentEpiDates);

		gBrush.call(brush.move, [g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7)].map(x));	

		//console.log("IN BRUSHUPDATE ", g.currentvars.currentEpiDates);
		if ((g.currentvars.currentEpiDates.s[0]==x2.range()[0]) && (g.currentvars.currentEpiDates.s[1]==x2.range()[1])) {  //full extent
			//console.log("FULL EXTENT ", s, x2.range());
			svg2.selectAll(".bar2").classed("active", true);
		} else {
			svg2.selectAll(".bar2").classed("active", function(d) {				
	        	return g.currentvars.currentEpiDates.all.indexOf(d.key) != -1;
	        });
	    }
        
		//x.domain([g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max]);
		x.domain([g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7)]);
        //var s = [x2(g.currentvars.currentEpiDates.min), x2(g.currentvars.currentEpiDates.max)];
        var s = [x2(g.currentvars.currentEpiDates.min), x2(d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7))];

        bar_width = ((orig_bar_width) * (x2.range()[1]-x2.range()[0])/(s[1]-s[0])) - 0.5;   //0.5 for bar spacing
        g.currentvars.currentEpiDates.bar_width = bar_width;
        g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
        //console.log("bar_width: ", bar_width,g.currentvars.currentEpiDates.tick_freq);
    	handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4); */return "translate(" + [g.currentvars.currentEpiDates.s[i], 14] + ")"; });
	
    	

/*		active_data = [];
		for (var i=0; i<=time_data.length-1; i++) {
			if ((d3.timeDay.offset(g.currentvars.currentEpiDates.min, -7) <= time_data[i].key) && (time_data[i].key <= d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7))) {
				active_data.push(time_data[i]);
			}
		}
		//console.log("active data: ", active_data);

		var valueline3 = d3.line()
		    .x(function(d) { 		//add 3.5days here so data point drawn in middle of epiweek bar
		    	var newdate = new Date(d.key); 
		    	return x2(newdate.setDate(newdate.getDate() + 3.5)); 
		    })  
		    .y(function(d) { return ylet2(d.value.let); });

        var letline2_active = svg2.select('g').selectAll(".line2_active")
				.remove()
				.exit()
				.data([active_data]);

		letline2_active.enter().append('path')
			.attr("class", "line2_active")
			.attr("d", valueline3)
        	//.attr("stroke", "green")
        	/*.attr("stroke", function (d,i) {
        		console.log(d,i);
	            //return (d.key > new Date(2015,7,31)) ? 'red' : 'green';
	            return (d.y < 0.06) ? 'red' : 'green';
	        })
	        .attr("stroke", "red");*/
        //svg2.selectAll(".line2").attr("stroke", "green");



	    //svg1.select("g").select(".axis--ylet").call(yletAxis);
	    //svg1.select("g").select(".axis--ylet").attr("transform", "translate( " + width + ", 0 )").call(yletAxis);

		svg1.select("g").selectAll(".bar")
    		.attr("x", function(d) { return x(d.key); })
    		.attr("width", bar_width);

    	/*var xAxis = d3.axisBottom(x)
			.ticks(d3.timeThursday, g.currentvars.currentEpiDates.tick_freq)
			//.ticks(function(d) {return d3.timeThursday})
			//.ticks(function(d) {console.log(d); return (d3.timeMonday, tick_frequency)})
			.tickFormat(function(d) {
					//d3.timeDay.offset(d3.timeMonday, 3.5)
					//console.log("Updating xAxis, tick: ", dateFormat(d)); 
					var newdate = new Date(d); 
					//return getEpiWeek(d);
					//return dateFormat(d);
					return getEpiWeek(d3.timeDay.offset(d, -3));
			})*/
	    //svg1.select('g').select('.axis--x').call(xAxis);
	    //svg1.select("g").select(".axis--x").call(xAxis);

		/*var valueline = d3.line()
			    .x(function(d) { console.log(d.key, d.value.let); return x(d.key); })
			    .y(function(d) { return ylet(d.value.let); }); */

		ylet.domain([0, d3.max(time_data, function(d) { return d.value.let; })]);
		ylet2.domain([0, d3.max(time_data, function(d) { return d.value.let; })]);
		//console.log(ylet.domain()[0], ' - ', d3.format(',.2%')(ylet.domain()[1]));
		svg1.select("g").selectAll(".line")
    		.data([time_data])
		    .attr("class", "line")
		    .attr("d", valueline);

	    svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
	        .scale(width / (s[1] - s[0]))
		        .translate(-s[0], 0));

	    //svg1.select("g").select(".axis--x").call(xAxis);
	    //console.log(g.currentvars.currentEpiDates.bar_width, g.currentvars.currentEpiDates.tick_freq);
	    //console.log("IN BRUSHUPDATE - DONE");
	}

	function brushend() {
		//console.log("******** IN BRUSH END ********* ", g.currentvars.currentEpiDates);
		//console.log(d3.event.sourceEvent);
		//console.log(g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max);
		
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
	    var s = d3.event.selection || x2.range();   //range selected or entire range
	    //console.log(d3.event.target);

	    //determines whether to hide bar handles or not (in full extent)
	    if (d3.event.sourceEvent) {
	    	//console.log(d3.event.sourceEvent);

	    	//technique to get propagation path in both Chrome & Firefox
	    	var path2 = [d3.event.sourceEvent.target]; 
	    	var i = 0; 
	    	while ((varx = path2[i++].parentElement) != null) path2.push(varx);
	    	//console.log("path2: ", path2);
	    	var clicked_on = path2[0].tagName;

	    	//gets propagation path in Chrom eonly:
	    	//var clicked_on = d3.event.sourceEvent.path[0].tagName;
	    	//console.log(clicked_on)
	    } else {
	    	var clicked_on = 'NA';
	    }
	    //var clicked_on = d3.event.sourceEvent? d3.event.sourceEvent.path[0].tagName : 'NA';
	    //console.log(clicked_on);
	    //console.log("s: ", s, d3.event.selection, x2.range());

	    if (d3.event.sourceEvent==null) {  //brush change in program
	    	//console.log("BRUSH UPDATE IN PROGRAM ", g.currentvars.currentEpiDates.s[0], g.currentvars.currentEpiDates.s[1]);
	    	//console.log("bar_width: ", g.currentvars.currentEpiDates.bar_width, g.currentvars.currentEpiDates.tick_freq);
	    	handle.attr("display", null).attr("transform", function(d, i) {return "translate(" + [g.currentvars.currentEpiDates.s[i], 14] + ")"; });
			//svg1.select("g").select(".axis--x").call(xAxis);
	    } else if ((s[0]==x2.range()[0]) && (s[1]==x2.range()[1])){  //full extent selected - manually by user
	    	//console.log("FULL EXTENT HERE ", s, x2.range());
	    	g.currentvars.currentEpiDates.min = g.epitime.date_extent[0];
			g.currentvars.currentEpiDates.max = g.epitime.date_extent[1];
			g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
			g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);
			g.currentvars.currentEpiDates.all = [];

			//populate g.currentvars.currentEpiDates.all with all weeks from min to max
			for (var i=0; i<=g.epitime.all.length-1; i++) {
				g.currentvars.currentEpiDates.all.push(g.epitime.all[i].epiDate);
			}

	        svg2.selectAll(".bar2").classed("active", true);

	        /*active_data = [];
			for (var i=0; i<=time_data.length-1; i++) {
				if ((d3.timeDay.offset(g.currentvars.currentEpiDates.min, -7) <= time_data[i].key) && (time_data[i].key <= d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7))) {
					active_data.push(time_data[i]);
				}
			}
			//console.log("active data: ", active_data);

			var valueline3 = d3.line()
			    .x(function(d) { 		//add 3.5days here so data point drawn in middle of epiweek bar
			    	var newdate = new Date(d.key); 
			    	return x2(newdate.setDate(newdate.getDate() + 3.5)); 
			    })  
			    .y(function(d) { return ylet2(d.value.let); });
			//console.log("valueline3: ", valueline3.x())

	        var letline2_active = svg2.select('g').selectAll(".line2_active")
					.remove()
					.exit()
					.data([active_data]);

			letline2_active.enter().append('path')
				.attr("class", "line2_active")
				.attr("d", valueline3)
	        	//.attr("stroke", "green")
	        	/*.attr("stroke", function (d,i) {
	        		console.log(d,i);
		            //return (d.key > new Date(2015,7,31)) ? 'red' : 'green';
		            //return (d.y < 0.06) ? 'red' : 'green';
		            return 'green';
		        });
		        .attr("stroke", "red");*/
	        //svg2.selectAll(".line2").attr("stroke", "green");

			
			x.domain([g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7)]);
	        var s = [x2(g.currentvars.currentEpiDates.min), x2(d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7))];
	        //var s = [x2(g.currentvars.currentEpiDates.min), x2(g.currentvars.currentEpiDates.max)];

	        bar_width = ((orig_bar_width) * (x2.range()[1]-x2.range()[0])/(s[1]-s[0])) - 0.5;   //0.5 for bar spacing
	        g.currentvars.currentEpiDates.bar_width = bar_width;
	        g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
	        //console.log("bar_width: ", bar_width);

	        if (clicked_on=='rect') {    
	        	//console.log(d3.event.sourceEvent);
	        	if (!((g.currentvars.currentEpiDates.s[0]==x2.range()[0]) && (g.currentvars.currentEpiDates.s[1]==x2.range()[1]))){ 
	        		handle.attr("display", "none");
	        	};
	        } else {
	        	handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4); */return "translate(" + [g.currentvars.currentEpiDates.s[i], 14] + ")"; });
	        	//handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4);*/ return "translate(" + [ s[i], - height / 4] + ")"; });
	        }
	    	
	    	

		    

			svg1.select("g").selectAll(".bar")
	    		.attr("x", function(d) { return x(d.key); })
	    		.attr("width", bar_width);

	    	var xAxis = d3.axisBottom(x)
				.ticks(d3.timeThursday, g.currentvars.currentEpiDates.tick_freq)
				//.ticks(function(d) {return d3.timeThursday})
				//.ticks(function(d) {console.log(d); return (d3.timeMonday, tick_frequency)})
				.tickFormat(function(d) {
						//d3.timeDay.offset(d3.timeMonday, 3.5)
						//console.log("Updating xAxis, tick: ", dateFormat(d)); 
						var newdate = new Date(d); 
						//return getEpiWeek(d);
						//return dateFormat(d);
						return getEpiWeek(d3.timeDay.offset(d, -3));
				})
	    	//svg1.select('g').select('.axis--x').call(xAxis);
		    svg1.select("g").select(".axis--x").call(xAxis);

			/*var valueline = d3.line()
			    .x(function(d) { console.log(d.key, d.value.let); return x(d.key); })
			    .y(function(d) { return ylet(d.value.let); });*/

			ylet.domain([0, d3.max(time_data, function(d) { return d.value.let; })]);
			//console.log(ylet.domain()[0], ' - ', d3.format(',.2%')(ylet.domain()[1]));
			svg1.select("g").selectAll(".line")
	    		.data([time_data])
			    .attr("class", "line")
			    .attr("d", valueline);

		    //svg1.select("g").select(".axis--ylet").call(yletAxis);
		    //svg1.select("g").select(".axis--ylet").attr("transform", "translate( " + width + ", 0 )").call(yletAxis);

		    svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
		        .scale(width / (s[1] - s[0]))
		        .translate(-s[0], 0));
			
	    } else {
	    	//console.log("BRUSH CHANGED MANUALLY BUT NOT TO FULL EXTENT / SNAP");

	    	var d0 = d3.event.selection.map(x2.invert),
			    d1 = d0.map(d3.timeMonday.round);
			//console.log("d0, d1 = ", d0, d1);

			  // If empty when rounded, use floor & ceil instead.
			  if (d1[0] >= d1[1]) {
			    d1[0] = d3.timeMonday.floor(d0[0]);
			    d1[1] = d3.timeMonday.offset(d1[0]);
			    //temp = new Date(d3.timeMonday.offset(d1[0]));
			    //d1[1] = d3.timeMonday.offset(d1[0], 7);
			  }

			  d3.select(this).transition().call(d3.event.target.move, d1.map(x2));
			  //console.log("d0, d1 = ", d0, d1);
	    }


    	updateMap();

	    //console.log("******** BRUSH END *********");
	}

	function zoomed() {
		//console.log("IN ZOOMED");
	    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
	    var t = d3.event.transform;
	    x.domain(t.rescaleX(x2).domain());
	    //console.log(t, t.rescaleX(x2).domain(), x.range().map(t.invertX, t));
	    //focus.select(".area").attr("d", area);
	    svg1.select("g").selectAll(".bar").attr("x", function(d) { return x(d.key); });
	    svg1.select("g").selectAll(".bar")
	    //svg1.select("g").selectAll("path").attr("x", function(d) { return x(d.key); });
	    //svg1.select("g").selectAll("path")
	    //svg1.select("g").select(".axis--ylet").call(yletAxis);

	    /*var xAxis = d3.axisBottom(x)
			.ticks(d3.timeThursday, g.currentvars.currentEpiDates.tick_freq)
			//.ticks(function(d) {return d3.timeThursday})
			//.ticks(function(d) {console.log(d); return (d3.timeMonday, tick_frequency)})
			.tickFormat(function(d) {
					//d3.timeDay.offset(d3.timeMonday, 3.5)
					//console.log("Updating xAxis, tick: ", dateFormat(d)); 
					var newdate = new Date(d); 
					//return getEpiWeek(d);
					//return dateFormat(d);
					return getEpiWeek(d3.timeDay.offset(d, -3));
			})
	    //svg1.select('g').select('.axis--x').call(xAxis);
	    svg1.select("g").select(".axis--x").call(xAxis);*/
	    svg2.select("g").select(".brush").call(brush.move, x.range().map(t.invertX, t));

	    //console.log("IN ZOOMED - DONE");
	}	

	//console.log("UPDATE CHARTS - DONE");	

};



/************************************/
/******  PLAY/PAUSE ANIMATION  ******/
/************************************/	

var playInterval;
var slideDuration = 1200; //in milliseconds
var autoRewind = false;   //automatically repeat from beginning
var currentDate = new Date (g.currentvars.currentEpiDates.min);
g.currentvars.currentAnimation.currentEpiDate = currentDate;

$(function() {

    $("#btnPlayPause").on("click", function() {	   
    	//console.log("PLAYPAUSE")			//Play/Pause button clicked
    	if (g.currentvars.currentAnimation.playMode =='stop') {
    		currentDate = new Date (g.currentvars.currentEpiDates.min);
    	} ;
    	$('#btnStop').css('display','block');   //display Stop button
    	$('#playMode_text').css('display','inline-block');   //display play mode text under stop button
		if (playInterval != undefined) {    //in Pause mode (playInterval defined when button is playing)
			//console.log("PAUSE")
            clearInterval(playInterval);
            playInterval = undefined;
            $("#btnPlayPause").removeClass('pause'); 
            togglePlayMode('pause');
            return;
        }
		$("#btnPlayPause").addClass('pause');  //in Play mode 
			//console.log("PLAY")
			if (currentDate > g.currentvars.currentEpiDates.max) {
				currentDate = new Date (g.currentvars.currentEpiDates.min);
				g.currentvars.currentAnimation.currentEpiDate = currentDate;
			}

			togglePlayMode('play');

			playInterval = setInterval(function () {

	            if (currentDate > g.currentvars.currentEpiDates.max) {		//if we reach the final timestep
	                if (autoRewind) {				//if we loop (autoRewind) then go back to beginning
	                    currentDate = new Date (g.currentvars.currentEpiDates.min);
	                    g.currentvars.currentAnimation.currentEpiDate = currentDate;
	                }
	                else {							//if we don't loop (autoRewind) then stop and clear 
						currentDate = new Date (g.currentvars.currentEpiDates.min);
						g.currentvars.currentAnimation.currentEpiDate = currentDate;
	                    clearInterval(playInterval);
						playInterval = undefined;
						$("#btnPlayPause").removeClass('pause');  
			            togglePlayMode('pause');
	                    return;
	                }
	            } else {
	            	g.currentvars.currentAnimation.currentEpiDate = currentDate;
	            }

				svg1.selectAll(".bar").classed("playBar", function(d) {		
					if (sameDay(d.key,currentDate)) {
						updateMap();
						addPlayLine();
						return true;
					} else {
						return false;
					}
				})
				
				currentDate.setDate(currentDate.getDate() + 7);
				
	    	}, slideDuration);

    });

    $("#btnStop").on("click", function() {	
    	togglePlayMode('stop');
    	clearInterval(playInterval);
        playInterval = undefined;
        $('#btnPlayPause').removeClass('pause'); 
    	$('#btnStop').css('display','none'); 
    	$('#playMode_text').css('display','none');  
    });
    
});


function addPlayLine() {
	var id1 = '#timeseries';
	var margin = {top: 10, right: 60, bottom: 20, left: 60},		//margins of actual x- and y-axes within svg  
	    width = $(id1).width() - margin.left - margin.right,		//width of main svg
	    height = $(id1).height() - margin.top - margin.bottom;		//height of main svg

	var x = d3.scaleTime().range([0, width])  		//x-axis width, accounting for specified margins
						  .domain([g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7)]);

	//var week_width = x(d3.timeDay.offset(g.currentvars.currentEpiDates.min, 7)) - x(g.currentvars.currentEpiDates.min);
	var week_width = width/g.currentvars.currentEpiDates.all.length;
	//console.log(width,'/', g.currentvars.currentEpiDates.all.length,'=', week_width);

	svg1.selectAll('.playBar_line') //.transition()
		.attr("class", "playBar_line")
		.attr("x1", margin.left + x(g.currentvars.currentAnimation.currentEpiDate) + week_width/2)  
		.attr("y1", margin.top)    		
		.attr("x2", margin.left + x(g.currentvars.currentAnimation.currentEpiDate) + week_width/2)  
		.attr("y2", height + margin.top)		
		.attr('stroke', g.mapcolors.playbar_color)  
		.attr("stroke-width", 2)
		.attr('display', 'block');
}


function togglePlayMode(mode) {

	if (mode =='play') {
		g.currentvars.currentAnimation.playMode ='play';
		g.currentvars.currentAnimation.maxLegendVal = getMaxLegendVal();
		//map disabled in selectFeatures function
		$('#btnZone').addClass('no-point');
		$('#btnProv').addClass('no-point');
		//$('.btn_lyr').addClass('no-point');
		if ($('#btnZone').hasClass('on')) {
			$('#btnProv').addClass('disable');
		} else if ($('#btnProv').hasClass('on')) {
			$('#btnZone').addClass('disable');
		} 
		$('#stat-select').addClass('no-point');
		$('#disease-select').addClass('no-point');
		$('.styledSelect').addClass('no-point');
		$('.select').addClass('no-point');
		$('#btn_reset').addClass('no-point');

		svg2.selectAll(".bar2.active").style('fill', '#7f7f7f');
		svg2.select('g.brush').remove();

	} else if (mode =='pause') {
		g.currentvars.currentAnimation.playMode ='pause';

	} else if (mode =='stop') {
		g.currentvars.currentAnimation.playMode ='stop';
		g.currentvars.currentAnimation.currentEpiDate = 'NA';	
		//map enabled in selectFeatures function
		$('#btnZone').removeClass('no-point');
		$('#btnProv').removeClass('no-point');
		if ($('#btnZone').hasClass('on')) {
			$('#btnProv').removeClass('disable');
		} else if ($('#btnProv').hasClass('on')) {
			$('#btnZone').removeClass('disable');
		} 
		$('#stat-select').removeClass('no-point');
		$('#disease-select').removeClass('no-point');
		$('.styledSelect').removeClass('no-point');
		$('.select').removeClass('no-point');
		$('#btn_reset').removeClass('no-point');

		svg1.selectAll(".bar").classed("playBar", function(d) {return false;})
		svg1.selectAll(".playBar_line").attr('display', 'none');
		//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)
		updateAll();
		//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)

	};
}



/***********************************/
/****  UPDATE DATA & DASHBOARD  ****/
/***********************************/	

function updateMap() {
	//currentMapData = getCurrentPolyVars();
	colorMap();
	updateHeadline();
	updateFiltSum();
}

function updateAll() {
	updateMap();
	//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)
	currentTimeSeriesData = getCurrentTimeSeriesData();
	//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)
	//console.log("currentTimeSeriesData: ", currentTimeSeriesData);
	updateTimeSeriesCharts('#timeseries', '#timeseriesbrush', currentTimeSeriesData);
	//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)
}


/*********************************************/
/****  GLOBAL VARIABLES & INITIALISATION  ****/
/*********************************************/

var map;
var zs_geoms;
//var geozs = {};
var geojson_zone;
var geojson_prov;
var geojson_prov_bound;
var geojson_riv;
var currentMapData;
var currentTimeSeriesData;
//var timeSeriesCharts;
var legendSvg;
var svg1, svg2;
var dateFormat = d3.timeFormat("%d %b %y");

function sameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

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

    var prov_bound_geoms;
	var req3 = new XMLHttpRequest();
    var url_prov_bound = 'data/rdc_prov_bound.json'   
        req3.open('GET', url_prov_bound, true);
        req3.onreadystatechange = handler;
        req3.send();
    var topoob3 = {};
    geoprovbound = {};

    var riv_geoms;
	var req4 = new XMLHttpRequest();
    var url_riv = 'data/rdc_rivers.json'   
        req4.open('GET', url_riv, true);
        req4.onreadystatechange = handler;
        req4.send();
    var topoob4 = {};
    georiv = {};

    function handler(){
        if ((req.readyState === XMLHttpRequest.DONE) && (req2.readyState === XMLHttpRequest.DONE) && (req3.readyState === XMLHttpRequest.DONE) && (req4.readyState === XMLHttpRequest.DONE))  {
        	//btn_change_lyr(g.currentvars.currentMapLyr);
        	map = generateMap('#map', [], req.responseText, req2.responseText, req3.responseText, req4.responseText);
			//$('#map').width($('#map').width());  
			createTimeSeriesCharts('#timeseries', '#timeseriesbrush');
			//console.log(timeSeriesCharts);
			updateMapInfo('', '', '', '');
			updateMapLegend(g.currentvars.currentMinVal, g.currentvars.currentMaxVal);
			changeDiseaseSelection();
			changeStatSelection();
			console.log("g = ", g);
			resize();
        }

    }

}
	

var select_disease = document.getElementById("disease-select");
for (disease in g.diseaseList) {
	//console.log("disease: ", disease, g.diseaseList[disease]);

	/*opt = new Option(g.diseaseList[disease], disease);
    opt.className = "opt";
    select_disease.options[select_disease.options.length] = opt;*/

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

// Iterate over each select element
$('select').each(function () {

    // Cache the number of options
    var $this = $(this),
        numberOfOptions = $(this).children('option').length;

	console.log($this, numberOfOptions);

    // Hides the select element
    $this.addClass('s-hidden');

    // Wrap the select element in a div
    $this.wrap('<div class="select"></div>');

    // Insert a styled div to sit over the top of the hidden select element
    $this.after('<div class="styledSelect"></div>');

    // Cache the styled div
    var $styledSelect = $this.next('div.styledSelect');

    // Show the first select option in the styled div
    $styledSelect.text($this.children('option').eq(0).text());

    // Insert an unordered list after the styled div and also cache the list
    var $list = $('<ul />', {
        'class': 'options'
    }).insertAfter($styledSelect);


    // Insert a list item into the unordered list for each select option
    for (var i = 0; i < numberOfOptions; i++) {
        $('<li />', {
            text: $this.children('option').eq(i).text(),
            rel: $this.children('option').eq(i).val()
        }).appendTo($list);
    }

    // Cache the list items
    var $listItems = $list.children('li');

    // Show the unordered list when the styled div is clicked (also hides it if the div is clicked again)
    $styledSelect.click(function (e) {
        e.stopPropagation();
        $('div.styledSelect.active').each(function () {
            $(this).removeClass('active').next('ul.options').hide();
        });
        $(this).toggleClass('active').next('ul.options').toggle();
    });

    // Hides the unordered list when a list item is clicked and updates the styled div to show the selected list item
    // Updates the select element to have the value of the equivalent option
    $listItems.click(function (e) {
        e.stopPropagation();
        $styledSelect.text($(this).text()).removeClass('active');
        $this.val($(this).attr('rel'));
        $list.hide();
        //console.log($this.val(), $styledSelect.text(), $styledSelect.context.id);
        if (($styledSelect.context.id == 'disease-select') && (g.currentvars.currentDisease != $styledSelect.text())) {
        	g.currentvars.currentDisease = $styledSelect.text();
        	changeDiseaseSelection();
        	console.log($this.val(), $styledSelect.text(), $styledSelect.context.id);
        } else if (($styledSelect.context.id == 'stat-select') && (g.currentvars.currentStat.full != $styledSelect.text())) {
        	g.currentvars.currentStat = $styledSelect.text();
        	changeStatSelection();
        	console.log($this.val(), $styledSelect.text(), $styledSelect.context.id);
        };
    });

    // Hides the unordered list when clicking outside of it
    $(document).click(function () {
        $styledSelect.removeClass('active');
        $list.hide();
    });

});




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
	var total = function() {
		if (g.currentvars.currentStat.abrv== 'cas') {
			return d3.format(",.0f")(g.currentvars.currentTotals.cas);
		} else if (g.currentvars.currentStat.abrv == 'dec') {
			return d3.format(",.0f")(g.currentvars.currentTotals.dec);
		} else if (g.currentvars.currentStat.abrv == 'let') {
			return d3.format(",.2%")(g.currentvars.currentTotals.let);
		}	
	}
	headline.innerHTML = 'Total indiqué sur la carte:<br/><big>' + total() + '</big>';
};

function updateFiltSum() {
	var filtSum = document.getElementById("win_filt-sum");
	var sem_html, dat_html, loc_html;

	if (g.currentvars.currentAnimation.playMode!='stop') {
		//sem_html = g.currentvars.currentAnimation.currentEpiWeek;
		sem_html = getEpiWeek(g.currentvars.currentAnimation.currentEpiDate)
		dat_html = dateFormat(g.currentvars.currentAnimation.currentEpiDate);
	} else {
		if (sameDay(g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)) {
			sem_html = g.currentvars.currentEpiWeek.min;
			dat_html = dateFormat(g.currentvars.currentEpiDates.min);
		} else {
			sem_html = g.currentvars.currentEpiWeek.min + ' - ' + g.currentvars.currentEpiWeek.max;
			dat_html = dateFormat(g.currentvars.currentEpiDates.min) +' - '+ dateFormat(g.currentvars.currentEpiDates.max);
		}
	};

	if (g.currentvars.currentMapLyr=='zone') {
		loc_html = '<i>Zones: </i><b>';
		g.currentvars.currentZones.pcodes.length==0 ? loc_html += 'Toutes les zones' : loc_html += g.currentvars.currentZones.names.join("; ");
		loc_html += '</b>';
	} else if (g.currentvars.currentMapLyr=='prov') {
		loc_html = '<i>Provinces: </i><b>';
		g.currentvars.currentProvs.pcodes.length==0 ? loc_html += 'Toutes les provinces' : loc_html += g.currentvars.currentProvs.names.join(", ");
		loc_html += '</b>';
	};

	filtSum.innerHTML='<p class="filt-sum-title">Resumé des options choisies:</p><i>Pathologie: </i><b>' + g.currentvars.currentDisease + '</b><br/>' + 
	'<i>Statistique: </i><b>' + g.currentvars.currentStat.full + '</b><br/>' + 
	'<i>Semaines epi: </i><b>' + sem_html + ' </b><br/><i>(Dates: ' + dat_html + ')</i><br/>' + loc_html;
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
	//console.log(g.currentvars.currentEpiDates.bar_width, g.currentvars.currentEpiDates.tick_freq);
}

$('#btnIntro').click(function(){
 	//console.log('CLICKED INTRO BUTTON');
 	helpTour();
});

/*$(function() {
    $('#btnIntro').click(function(){
        if ($('#btnIntro').hasClass('on') ) {
            removeHints();
            $('#btnIntro').removeClass('on');
        } else {
            addHints();
            $('#btnIntro').addClass('on');
        }
    });
});*/

/*function btn_selectDates() {
	g.currentvars.currentEpiDates.min = new Date(2015,2,2);
	g.currentvars.currentEpiDates.max = new Date(2015,2,31);
	g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
	g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);
	g.currentvars.currentEpiDates.all = [];

	//populate g.currentvars.currentEpiDates.all with all weeks from min to max
	for (var i=0; i<=g.epitime.all.length-1; i++) {
		if ((g.currentvars.currentEpiDates.min <= g.epitime.all[i].epiDate) && (g.epitime.all[i].epiDate < g.currentvars.currentEpiDates.max)) {
			g.currentvars.currentEpiDates.all.push(g.epitime.all[i].epiDate);
		}
	}
	updateTimeSeriesCharts('#timeseries', '#timeseriesbrush', currentTimeSeriesData);
}*/



function resize() { 
  	//console.log("RESIZE w", window.innerWidth, ' x h', window.innerHeight);
  	if (window.innerWidth < 768) {
  		//console.log("SLIMLINE");
  		if (!($('#btnPlayPause').hasClass('slimline'))) {$('#btnPlayPause').addClass('slimline'); };
    	if (!($('#btnStop').hasClass('slimline'))) {$('#btnStop').addClass('slimline'); };
    	if (!($('#playMode_text').hasClass('slimline'))) {$('#playMode_text').addClass('slimline');  };
  	} else {
  		$('#btnPlayPause').removeClass('slimline'); 
    	$('#btnStop').removeClass('slimline'); 
    	$('#playMode_text').removeClass('slimline');  
  	}
    svg1.remove();
    svg2.remove();
    createTimeSeriesCharts('#timeseries', '#timeseriesbrush');
    updateTimeSeriesCharts('#timeseries', '#timeseriesbrush', currentTimeSeriesData);
}
window.onresize = resize;
