//////////////////////////////////////////////////////////////////////////////////////////
//Next dev steps:
// - PUC activities:
//		- create real data geojson file
// - update to d3 v5, convert xmlhttprequest calls to promise?
// - prep crossfilter to add & remove data by time
//
// Long-term dev:
// - barchart:
//    - on hover tooltip for whole height of chart, not only for bars  https://blog.webkid.io/responsive-chart-usability-d3/
//    - epiweek date on Thurs 00:00, should be Thurs 12:00 to be exactly halfway through week - use d3.timeInterval to create custom interval?
// - add print function (canvas)
// - remove dependence on jquery
// - mobile/tablet layout?
//
// Since last update:
// - added PUC activities as pie clusters with associated left-hand menu buttons
// - option to hide/unhide left-hand menu
///////////////////////////////////////////////////////////////////////////////////////////


/****************************************/
/*****  DATA - INITIAL LOAD & PREP  *****/
/****************************************/
var displayLoadDataDialog = false;   

if (displayLoadDataDialog==true) {
	var data_init = [{"cas": 0,
		"dec": 0,
		"epiwk": "2016-1",
		"mal": "NA",
	},
	{
		"cas": 0,
		"dec": 0,
		"epiwk": "2017-52",
		"mal": "NA",
	}];
} else {
	var data_init = (function() {
        var json = null;
        $.ajax({
            'async': false,
            'global': false,
            'url': "data/data.js",    //replace with axios endpoint
            'dataType': "json",
            'success': function (data) {
                json = data;
            }
        });
        return json;
    })();   
}


//Global namespace
var g = {};
//console.log(data)		//if data not loading here, check file format
//data = addEpitimeToData(data);
data = addEpitimeToData(data_init);
//console.log("data = ", data);
//console.log("data_acts = ", data_acts);
console.log("g = ", g);



/*************************/
/*****  CROSSFILTER  *****/
/*************************/
var cf = crossfilter(data);
cf.epiDateDim = cf.dimension(function(d) {return d.epidate});
cf.malDim = cf.dimension(function(d){if (d.mal!='') {return d.mal} else {return 'Non défini'}});
cf.provDim = cf.dimension(function(d) {if (d.prov_pc=='') {return '';} else {return d.prov_pc}});  
cf.provDim2 = cf.dimension(function(d) {if (d.prov_pc=='') {return '';} else {return d.prov_pc}});  //to filter on only
cf.zsDim = cf.dimension(function(d) {if (d.zs_pc=='') {return '';} else {return d.zs_pc}});
cf.zsDim2 = cf.dimension(function(d) {if (d.zs_pc=='') {return '';} else {return d.zs_pc}});  //to filter on only

cf.statsByEpiDateGroup = cf.epiDateDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);
//console.log("Stats by EpiDate: ", cf.statsByEpiDateGroup.top(Infinity));
cf.statsByZsGroup = cf.zsDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);
//console.log("Stats by Zone: ", cf.statsByZsGroup.top(Infinity));
cf.statsByProvGroup = cf.provDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);
//console.log("Stats by Province: ", cf.statsByProvGroup.top(Infinity));


function resetDashboardData() {
	console.log("site.js: resetDashboardData");

	//remove all cf filters and data
	cf.epiDateDim.filterAll();
	cf.malDim.filterAll();
	cf.provDim.filterAll();
	cf.provDim2.filterAll();
	cf.zsDim.filterAll();
	cf.zsDim2.filterAll();
	cf.remove();

	g.currentvars.currentZones = {pcodes: [], names: []};
	g.currentvars.currentProvs = {pcodes: [], names: []};

	//add new data
	cf.add(data);

	//reset epitime variables & quick filter time range 
	var defaultRange = getEpiRange(g.timerangebuttons.default_btn.range_type, g.timerangebuttons.default_btn.range_param);
	g.currentvars.currentEpiDates.min_default = defaultRange[0];
	g.currentvars.currentEpiDates.max_default = defaultRange[1];	
	g.currentvars.currentEpiDates.min = g.currentvars.currentEpiDates.min_default;
	g.currentvars.currentEpiDates.max = g.currentvars.currentEpiDates.max_default;
	//console.log(g.currentvars.currentEpiDates);
	createTimeRangeButtons();

	//recreate time series charts
		/*svg1.remove();		//NEEDS TESTING
	    svg2.remove();
	    createTimeSeriesCharts('#timeseries', '#timeseriesbrush');*/
    updateTimeSeriesCharts('#timeseries', '#timeseriesbrush');
	
    //reset disease & stat dropdowns
	createDiseaseList();
	select_disease.options.length = 0;
	for (disease in g.diseaseList) {
		if (g.diseaseList[disease]!='') {
	    	select_disease.options[select_disease.options.length] = new Option(g.diseaseList[disease], disease);
	    }
	}	
	select_stat.options.length = 0;
	for (stat in g.statList) {
		if (g.statList[stat].full!='') {
	    	select_stat.options[select_stat.options.length] = new Option(g.statList[stat].full, stat);
	    }
	}
	changeDiseaseSelection(0);
	changeStatSelection(0);

	//reset map elements
	if (!($('#btnRiv').hasClass('on'))) {btn_rivers();};
	btn_change_lyr('prov'); 
	setDefaultMapZoom();
	//if (!($('#btnAlt').hasClass('on'))) {btn_act('alerte');};
	//btn_act('none');
	//console.log("call btn_act here")
	btn_act('all');
	
	//update all remaining
	updateAll();
}


function reduceAdd(p, v) {
    p.cas += v.cas;
    p.dec += v.dec;
    p.let = p.cas!=0 ? (p.dec/p.cas) : 0;
    return p;
}
function reduceRemove(p, v) {
    p.cas -= v.cas;
    p.dec -= v.dec;
    p.let = p.cas!=0 ? (p.dec/p.cas) : 0;
    return p;
}
function reduceInitial() {
    return {
        cas: 0,
        dec: 0,
        let: 0
    };
}

/********************************/
/******  GLOBAL VARIABLES  ******/
/********************************/
//Create list of diseases in data
function createDiseaseList() {
	//console.log("site.js: createDiseaseList");
	var lookup = {};
	g.diseaseList = [];
	for (var item, i=0; item = data[i++];) {
	  if (item.mal=='') {
	  	var mal = 'Non défini';
	  } else {
	  	var mal = item.mal;
	  }
	  if (!(mal in lookup)) {
	    lookup[mal] = 1;
	    g.diseaseList.push(mal);
	  }
	}
	g.diseaseList.sort();
};


function initGlobalVariables() {
	//console.log("site.js: initGlobalVariables");
	createDiseaseList();

	//g.statList = [{abrv: 'cas', full: 'Nombre de Cas', color_scale: 'YlBr'}, {abrv: 'dec', full: 'Nombre de Décès', color_scale: 'Red'}, {abrv: 'let', full: 'Létalité', color_scale: 'Red'}];
	g.statList = [{abrv: 'cas', full: 'Nombre de Cas', color_scale: 'YlBr'}, {abrv: 'let', full: 'Létalité', color_scale: 'Red'}]; 

	//Set color variables for map
	g.mapcolors = {};
	g.mapcolors.color_scale = {};
	g.mapcolors.color_scale.YlBr = {color_min: '#ffffcc', color_max: '#800026'};
	g.mapcolors.color_scale.Red = {color_min: '#fee0d2', color_max: '#a50f15'};
	g.mapcolors.color_zero = '#d3d3d3'; //'#a8a8a8';
	g.mapcolors.color_boundary = '#2f4f4f';  //dark slate grey
	g.mapcolors.color_rivers = '#1673ae';
	g.mapcolors.color_lakes = '#1673ae';
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
	g.currentvars.currentActivities = [];

	g.timerangebuttons = [{
							id: 'btnTimeRange_4epiweek',
							range_type: 'epiweek',
							range_param: 4,
							text: '4 dernières semaines-epi'
						   },{
						   	id: 'btnTimeRange_8epiweek',
							range_type: 'epiweek',
							range_param: 8,
							text: '8 dernières semaines-epi'
						   },{
						   	id: 'btnTimeRange_52epiweek',
							range_type: 'epiweek',
							range_param: 52,
							text: '52 dernières semaines-epi'
						   },{
						   	id: 'btnTimeRange_1epimonth',
							range_type: 'epimonth',
							range_param: 1,
							text: 'Dernier mois-epi complet'
						   },{
						   	id: 'btnTimeRange_3epimonth',
							range_type: 'epimonth',
							range_param: 3,
							text: 'Derniers 3 mois-epi complet'
						   }];
	g.timerangebuttons.default_btn = g.timerangebuttons[4];

	var defaultRange = getEpiRange(g.timerangebuttons.default_btn.range_type, g.timerangebuttons.default_btn.range_param);
	g.currentvars.currentEpiDates.min_default = defaultRange[0];
	g.currentvars.currentEpiDates.max_default = defaultRange[1];
	g.currentvars.currentEpiDates.min = g.currentvars.currentEpiDates.min_default;
	g.currentvars.currentEpiDates.max = g.currentvars.currentEpiDates.max_default;
	g.currentvars.currentEpiDates.all = []; 
	g.currentvars.currentEpiWeek = {};
	g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
	g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);
	g.currentvars.currentTimeSeries = [];
	g.currentvars.currentAnimation = {};
	g.currentvars.currentAnimation.playMode = 'stop'; //'play', 'pause', or 'stop'
	g.currentvars.currentAnimation.currentEpiDate;
	g.currentvars.currentAnimation.maxLegendVal;


	g.activities = {}
	g.activities.fields = {};
	g.activities.fields.categoryField = 'act_type'; //fieldname for marker category (used in pie)
	//g.activities.fields.iconField = 'act_type'; //fieldame for marker icon
	//g.activities.fields.popupFields = ['act_code','act_type', 'loc', 'typ', 'path', 'date_sit', 'date_det', 'date_part', 'date_ferm' ]; //fields displayed in popup window, 'loc'='zs,prov'
	g.activities.labels = {code_alt: 'Code d\'alerte',
						code_eval: 'Code d\'évaluation',
	                    act_type:'Type d\'activité',
	                    loc: 'Location',
	                    sent: 'Sentinelle',
	                    typ: 'Typologie',
	                    path: 'Pathologie',
	                    comm: 'Commentaires',
	                    /*date_sit: 'Date de la situation',
	                    date_det: 'Date de détection',
	                    date_part: 'Date de départ', 
	                    date_ferm: 'Date de fermeture',
	                    date_dep: 'Date de départ',*/
	                    date_deb: 'Date de début',
	                    date_fin: 'Date de fin',
	                    //date_ret_equipe: 'Date de retour de l\'équipement'
	                    typ_detec: 'Type de détection',
	                    src_detec: 'Source de détection',
	                    cum_cas: 'Cas cumulatifs',
	                    cum_dec: 'Décès cumulatifs',
	                    opd: 'OPD',
	                    ipd:'IPD',
	                    tbi: 'Total des bénéficiaires'
	                    };

	g.activities.all = [
					{
						act_name: 'alerte',
						act_type: 'alerte',
						btn_name: '#btnAlt',
					    btn_text: 'Toutes les Alertes',
					    popup_text: 'Alertes'
					}, {
						act_name: 'alerte_alarme',
						act_type: 'alerte',
						btn_name: '#btnAltAlarme',
					    btn_text: 'Alarme',
					    popup_text: 'Alerte Alarme'
					}, {
						act_name: 'alerte_focus',
						act_type: 'alerte',
						btn_name: '#btnAltFocus',
					    btn_text: 'Focus',
					    popup_text: 'Alerte Focus'
					}, {
						act_name: 'alerte_suivi_actif',
						act_type: 'alerte',
						btn_name: '#btnAltSuiviActif',
					    btn_text: 'Suivi Actif',
					    popup_text: 'Alerte Suivi Actif'
					}, {
						act_name: 'alerte_ferme',
						act_type: 'alerte',
						btn_name: '#btnAltFerme',
					    btn_text: 'Fermé',
					    popup_text: 'Alerte Fermé'
					}, {
						act_name: 'alerte_NA',
						act_type: 'alerte',
						btn_name: '',
					    btn_text: 'Type non disponible',
					    popup_text: 'Alerte (type non disponible)'
					}, {
						act_name: 'evaluation',
						act_type: 'evaluation',
						btn_name: '#btnEval',
					    btn_text: 'Evaluation',
					    popup_text: 'Evaluation'
					}, {
						act_name: 'intervention',
						act_type: 'intervention',
						btn_name: '#btnInt',
					    btn_text: 'Intervention',
					    popup_text: 'Intervention'                     
					/*}, {
						act_name: 'none',
						btn_name: '',
					    btn_text: '',
					    popup_text: '',
					    sub_alt: false   */                          
					}];
	g.activities.pies = {};

}
initGlobalVariables();

/***************/
/****  MAP  ****/
/***************/

function getCurrentPolyVars() {
	//console.log("site.js: getCurrentPolyVars");
	var currentValues = [];

	cf.epiDateDim.filterAll();
    if (g.currentvars.currentAnimation.playMode=='play') {
    	cf.epiDateDim.filterExact(g.currentvars.currentAnimation.currentEpiDate);
    } else if (sameDay(g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)) {
    	cf.epiDateDim.filterExact(g.currentvars.currentEpiDates.min);
	} else {  //filter from min date to max date + 1 (+1 is so that it includes max date)
    	cf.epiDateDim.filterRange([g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 1)]); 
    };
	
	
	if (g.currentvars.currentMapLyr=='zone') {
		currentValues = cf.statsByZsGroup.top(Infinity);
	} else if (g.currentvars.currentMapLyr=='prov') {
		currentValues = cf.statsByProvGroup.top(Infinity);
	};
	
	g.currentvars.currentMinVal = 0;
	g.currentvars.currentMaxVal = 0;
	g.currentvars.currentTotals = {'cas': 0, 'dec': 0, 'let': 0};
	if (g.currentvars.currentAnimation.playMode=='play') {
		g.currentvars.currentMaxVal = g.currentvars.currentAnimation.maxLegendVal;
		for (var i=0; i<=currentValues.length-1; i++) {
			if (currentValues[i].key != '') {
					g.currentvars.currentTotals.cas += currentValues[i].value.cas;
					g.currentvars.currentTotals.dec += currentValues[i].value.dec;
					g.currentvars.currentTotals.let = (g.currentvars.currentTotals.cas!=0)? g.currentvars.currentTotals.dec/g.currentvars.currentTotals.cas : 0;
			}
		}
	} else {
		for (var i=0; i<=currentValues.length-1; i++) {
			if (currentValues[i].key != '') {
				if (g.currentvars.currentMaxVal < currentValues[i].value[g.currentvars.currentStat.abrv]) {g.currentvars.currentMaxVal = currentValues[i].value[g.currentvars.currentStat.abrv]};
				g.currentvars.currentTotals.cas += currentValues[i].value.cas;
				g.currentvars.currentTotals.dec += currentValues[i].value.dec;
				g.currentvars.currentTotals.let = (g.currentvars.currentTotals.cas!=0)? g.currentvars.currentTotals.dec/g.currentvars.currentTotals.cas : 0;
			}
		}
	}
	
	var color = d3.scaleLinear().domain([0,g.currentvars.currentMaxVal])
    	.interpolate(d3.interpolateHcl)
    	.range([d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_min), d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_max)]);
	
	var currentPolyVars = {};
	for (var i=0; i<=currentValues.length-1; i++) {
		currentPolyVars[currentValues[i].key] = {};
		currentPolyVars[currentValues[i].key]['value'] = currentValues[i].value[g.currentvars.currentStat.abrv];
		currentValues[i].value[g.currentvars.currentStat.abrv]==0? currentPolyVars[currentValues[i].key]['color'] = g.mapcolors.color_zero : currentPolyVars[currentValues[i].key]['color'] = color(currentValues[i].value[g.currentvars.currentStat.abrv]); 
	}
	//console.log("Current epidates: ", g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)
	//console.log("Current poly vars: ", currentPolyVars);
    return currentPolyVars;
}


function getMaxLegendVal() {  
	//console.log("site.js: getMaxLegendVal");
	var maxValue = 0;
	var values = [];

	for (var i=0; i<=g.currentvars.currentEpiDates.all.length-1; i++) {
		cf.epiDateDim.filterAll();
		cf.epiDateDim.filterExact(g.currentvars.currentEpiDates.all[i]).top(Infinity);

		if (g.currentvars.currentMapLyr=='zone') {
			values = cf.statsByZsGroup.top(Infinity);
		} else if (g.currentvars.currentMapLyr=='prov') {
			values = cf.statsByProvGroup.top(Infinity);
		};

		//console.log("values, ", g.currentvars.currentEpiDates.all[i], values);
		for (var j=0; j<=values.length-1; j++) {
			if (values[j].key != '') {
				if (maxValue < values[j].value[g.currentvars.currentStat.abrv]) {
					maxValue = values[j].value[g.currentvars.currentStat.abrv]
				};
			}
		}

	}

	//filter dates from min to max+1 (+1 in order to include max date itself)
	cf.epiDateDim.filterRange([g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 1)]);
	return maxValue;
}


function colorMap() {
	//console.log("site.js: colorMap");
	currentMapData = getCurrentPolyVars();
    //console.log("currentMapData: ", currentMapData);
    //console.log(geoprov)
    if (g.currentvars.currentMapLyr=='zone') {
    	var features = geozs.features;
    } else if (g.currentvars.currentMapLyr=='prov') {
    	var features = geoprov.features;
    };

	features.forEach(function(d,i) {
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
	//console.log("site.js: updateMapInfo");
	//console.log("currentMapData: ", currentMapData)
	if (g.currentvars.currentMapLyr=='prov') {
		try {
			if ((g.currentvars.currentProvs.pcodes.length!=0) && (g.currentvars.currentProvs.pcodes.indexOf(prov_pcode)==-1)) {
				var val = 'Non séléctionné';
			} else {
				if (g.currentvars.currentStat.abrv=='cas') {
					var val = "Cas: " + d3.format(",.0f")(currentMapData[prov_pcode].value);
				} else if (g.currentvars.currentStat.abrv=='dec') {
					var val = "Décès: " + d3.format(",.0f")(currentMapData[prov_pcode].value);
				} else if (g.currentvars.currentStat.abrv=='let') {
					var val = "Létalité: " + d3.format(",.2%")(currentMapData[prov_pcode].value);
				};
			}	
		} catch(e) {
			var val = "<i>Indisponible</i>";
		}
		infoUpdate = (prov_name && prov_pcode) ? "<h4>"+prov_name+ "</h4>" + val : "Survolez une région";
	} else if (g.currentvars.currentMapLyr=='zone') {
		try {
			if ((g.currentvars.currentZones.pcodes.length!=0) && (g.currentvars.currentZones.pcodes.indexOf(zs_pcode)==-1)) {
				var val = 'Non séléctionné';
			} else {
				if (g.currentvars.currentStat.abrv=='cas') {
					var val = "Cas: " + d3.format(",.0f")(currentMapData[zs_pcode].value);
				} else if (g.currentvars.currentStat.abrv=='dec') {
					var val = "Décès: " + d3.format(",.0f")(currentMapData[zs_pcode].value);
				} else if (g.currentvars.currentStat.abrv=='let') {
					var val = "Létalité: " + d3.format(",.2%")(currentMapData[zs_pcode].value);
				};
			};
		} catch(e) {
			var val = "<i>Indisponible</i>";
		}
		infoUpdate = (zs_name && zs_pcode && prov_name) ? "<h4>"+zs_name+", "+prov_name+ "</h4>" +  val : "Survolez une région";
	}
	$('.mapinfo').html(infoUpdate);	
}; 


function updateMapLegend(min, max) {
	//console.log("site.js: in updateMapLegend ")
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


function createMap(id, data, responseText_zs, responseText_prov, responseText_provbound, responseText_riv, responseText_lakes, responseText_acts) { 		
//function createMap(id, data, geozs, geoprov, geoprovbound, georiv, geolak, responseText_acts) { 		
	//console.log("site.js: in createMap");

	currentMapData = getCurrentPolyVars();
    //console.log("currentMapData: ", currentMapData);
    //currentActData = []; //getCurrentActData();
	
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

    function style_lak(feat, i){
        return {fillOpacity: 1,
                weight: 1,
                color: g.mapcolors.color_lakes, 
            	className: 'dashgeom lakes'
            	}
    }

    function style_act(feat, i){
        return {fillOpacity: 1,
                weight: 1,
                color: 'yellow', 
            	className: 'dashgeom acts'
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
		geojson_zone = L.geoJson(geozs, {style:style, onEachFeature: onEachFeature});
		//geojson_zone.addTo(map);
    }
    catch(e){
        geojson_zone = {};
        console.log(e)
    }

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

	try {
	    topoob5 = JSON.parse(responseText_lakes)
	    geolak = topojson.feature(topoob5, topoob5.objects.rdc_lakes)
	    geojson_lak = L.geoJson(geolak, {style:style_lak});
		geojson_lak.addTo(map);
		//L.geoJson(geolak, {style:style_lak}).addTo(map);
	}
	catch(e){
	    geojson_lak = {};
	    console.log(e)
	}  

	/*geojson_zone = L.geoJson(geozs, {style:style, onEachFeature: onEachFeature});
	//geojson_zone.addTo(map);
	geojson_prov = L.geoJson(geoprov, {style:style, onEachFeature: onEachFeature});
	geojson_prov.addTo(map);
	geojson_prov_bound = L.geoJson(geoprovbound, {style:style_prov_bound});
	//geojson_prov_bound.addTo(map);
	geojson_riv = L.geoJson(georiv, {style:style_riv});
	geojson_riv.addTo(map);
	L.geoJson(geolak, {style:style_lak}).addTo(map);*/

    addActivityClusters();


    var mapInfo = L.control({position: 'topright'});
    mapInfo.onAdd = function(map) {
    	var infoDiv = L.DomUtil.create('infoDiv', 'mapinfo');
		return infoDiv;
    }
    mapInfo.addTo(map);


	var mapLegend = L.control({position: 'bottomleft'});			
	mapLegend.onAdd = function (map) {	
		svg = L.DomUtil.create('svg', 'maplegend');
		return svg;
	};
	mapLegend.addTo(map);


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
		try {
        	var coco = currentMapData[layer.feature.properties.pcode].color;
        } catch(e) {
        	var coco = g.mapcolors.color_zero;
        }

		layer.setStyle({
			weight: 0.8,			//boundary weight
			//opacity: 1,			//boundary opacity
		    color: g.mapcolors.color_boundary, //'#665',   	//boundary color
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
					g.currentvars.currentZones.names.push(getName('zone', pcode));
					cf.zsDim2.filterAll();
					cf.zsDim2.filterFunction(function (d) {
						return (g.currentvars.currentZones.pcodes.indexOf(d)!=-1);
					});
				} else {	//if already selected them remove it
					g.currentvars.currentZones.pcodes.splice(g.currentvars.currentZones.pcodes.indexOf(pcode), 1);  //find pcode and remove it
					g.currentvars.currentZones.names.splice(g.currentvars.currentZones.names.indexOf(getName('zone', pcode)), 1); 
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
					g.currentvars.currentProvs.names.push(getName('prov', pcode));
					cf.provDim2.filterAll();
					cf.provDim2.filterFunction(function (d) {
						return (g.currentvars.currentProvs.pcodes.indexOf(d)!=-1);
					});
				} else {	//if already selected them remove it
					g.currentvars.currentProvs.pcodes.splice(g.currentvars.currentProvs.pcodes.indexOf(pcode), 1);  //find pcode and remove it
					g.currentvars.currentProvs.names.splice(g.currentvars.currentProvs.names.indexOf(getName('prov', pcode)), 1); 
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
	//console.log("site.js: btn_rivers");
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
	//console.log("site.js: btn_change_lyr");
	if ((lyr=='prov') && ($('#btnZone').hasClass('on'))) {   //switch from zone to province
		$('#btnZone').removeClass('on');
		$('#btnProv').addClass('on');
		g.currentvars.currentMapLyr = 'prov'; 
		map.removeLayer(geojson_zone);	
		map.removeLayer(geojson_prov_bound);
		geojson_prov.addTo(map);
		geojson_prov.bringToBack();
		switchLayerPolys('prov');		
	} else if ((lyr=='zone') && ($('#btnProv').hasClass('on'))) {	//switch from province to zone
		$('#btnProv').removeClass('on');
		$('#btnZone').addClass('on');
		g.currentvars.currentMapLyr = 'zone'; 
		map.removeLayer(geojson_prov);	
		geojson_zone.addTo(map);
		geojson_zone.bringToBack();
		geojson_prov_bound.addTo(map);
		geojson_prov_bound.bringToFront();
		switchLayerPolys('zone');		
	}
	updateAll();
}

function switchLayerPolys(lyr) {		//amends polygon selection when switching between layers
	//console.log("site.js: switchLayerPolys");
	if (lyr=='zone') {		//switch from prov to zone
		g.currentvars.currentZones.pcodes = [];  //reset zone selection to null
		g.currentvars.currentZones.names = []
		
		/*for (var i=0; i<=g.currentvars.currentProvs.pcodes.length-1; i++) {		//for each poly selected in prov layer
			for (var j=0; j<= geonames.length-1; j++) {
				if (g.currentvars.currentProvs.pcodes[i]==geonames[j].prov_pcode) {  //add all zones for that poly into zone list
					g.currentvars.currentZones.pcodes.push(geonames[j].zs_pcode);
					g.currentvars.currentZones.names.push(getName('zone', geonames[j].zs_pcode));
				}
			}
		}
		console.log(g.currentvars.currentZones)*/

		function filterByProvPcode(geoname) {
				if (g.currentvars.currentProvs.pcodes.indexOf(geoname['prov_pcode']) != -1) {
			    	return true;
			    } else {
			    	return false;
			    }
		}

		var result = geonames.filter(filterByProvPcode);
		//console.log(result);
		for (var i=0; i<=result.length-1; i++) {
		    g.currentvars.currentZones.pcodes.push(result[i].zs_pcode);
		    g.currentvars.currentZones.names.push(getName('zone', result[i].zs_pcode));
		}
		



		g.currentvars.currentProvs.pcodes = [];  //reset prov selection to null
		g.currentvars.currentProvs.names = []; 
		selectManyFeatures('zone');
	} else if (lyr=='prov') {	//switch from zone to prov
		g.currentvars.currentProvs.pcodes = [];  //reset prov selection to null
		g.currentvars.currentProvs.names = []; 
		/*for (var i=0; i<=g.currentvars.currentZones.pcodes.length-1; i++) {		//for each poly selected in zone layer
			for (var j=0; j<= geonames.length-1; j++) {
				if (g.currentvars.currentZones.pcodes[i]==geonames[j].zs_pcode) {
					if (g.currentvars.currentProvs.pcodes.indexOf(geonames[j].prov_pcode) == -1) {		//if prov poly not already in list, then add it (if in list, do nothing)
						g.currentvars.currentProvs.pcodes.push(geonames[j].prov_pcode);
						g.currentvars.currentProvs.names.push(getName('prov', geonames[j].prov_pcode));
					};
					break;
				}
			}
		}*/

		function filterByZonePcode(geoname) {
				if (g.currentvars.currentZones.pcodes.indexOf(geoname['zs_pcode']) != -1) {
			    	return true;
			    } else {
			    	return false;
			    }
		}
		/*function onlyUnique(value, index, self) { 
		    return self.indexOf(value) === index;
		}*/
		var result = geonames.filter(filterByZonePcode)

		//console.log(result);
		for (var i=0; i<=result.length-1; i++) {
			if (g.currentvars.currentProvs.pcodes.indexOf(result[i].prov_pcode) == -1) {		//if prov poly not already in list, then add it (if in list, do nothing)
			    g.currentvars.currentProvs.pcodes.push(result[i].prov_pcode);
			    g.currentvars.currentProvs.names.push(getName('prov', result[i].prov_pcode));
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
	//console.log("site.js: selectManyFeatures");
	if (lyr=='zone') {
		cf.zsDim2.filterAll();
		cf.provDim2.filterAll();
		if (g.currentvars.currentZones.pcodes.length!=0) {  //if list is not empty then filter it
			cf.zsDim2.filterFunction(function (d) {
				return (g.currentvars.currentZones.pcodes.indexOf(d)!=-1);
			});
		}
	} else if (lyr=='prov') {
		cf.zsDim2.filterAll();
		cf.provDim2.filterAll();
		if (g.currentvars.currentProvs.pcodes.length!=0) {  //if list is not empty then filter it
			cf.provDim2.filterFunction(function (d) {
				return (g.currentvars.currentProvs.pcodes.indexOf(d)!=-1);
			});
		};

	};
}

function getName(lyr, pcode) {
	//console.log("site.js: getName");
	if (lyr=='prov'){
		var found = geonames.find(function(loc) {
		    return loc.prov_pcode == pcode;
		});
		return found.prov;
	} else {   //lyr=='zone'
		var found = geonames.find(function(loc) {
		    return loc.zs_pcode == pcode;
		});
		return found.zs + ', ' + found.prov;
	}
}

function setDefaultMapZoom() {
	//console.log("site.js: setDefaultMapZoom");
    map.setView(["-4.0", "22.0"], 5, {animation: true});
}




/*******************************/
/****  CREATE OTHER CHARTS  ****/
/*******************************/

function updateCurrentTimeSeriesData() {
	//console.log("site.js: updateCurrentTimeSeriesData");
	var timeSeries = [];		
	var datesInSeries = [];
	statsInTime = cf.statsByEpiDateGroup.top(Infinity);
	//console.log("statsInTime: ", statsInTime);
	//console.log("epitime all: ", g.epitime.all)

	//add all epidate stats from data
	for (var i=0; i<=statsInTime.length-1; i++) {
		timeSeries.push({'key': statsInTime[i].key, 'value': statsInTime[i].value});
		datesInSeries.push(statsInTime[i].key.getTime());
	}
	//add epidate stats for weeks without data (to 'complete' timeSeries)
	for (var i=0; i<=g.epitime.all.length-1; i++) {
		if ((datesInSeries.indexOf(g.epitime.all[i].epiDate.getTime())) == -1) {
			timeSeries.push({'key': g.epitime.all[i].epiDate, 'value': {cas: 0, dec: 0, let: 0}});
			datesInSeries.push(g.epitime.all[i].epiDate.getTime());
		}
	}

	//sort into date order
	timeSeries.sort(function(a,b){
		return b.key - a.key;
	});
	//console.log("timeSeries: ", timeSeries);
	g.currentvars.currentTimeSeries = timeSeries;
	//return timeSeries;
}


function createTimeSeriesCharts(id1, id2) {
	//console.log("site.js: createTimeSeriesCharts");
	updateCurrentTimeSeriesData();
	var time_data = g.currentvars.currentTimeSeries;

	var margin = {top: 10, right: 60, bottom: 20, left: 70},		//margins of actual x- and y-axes within svg  
	    margin2 = {top: 10, right: 60, bottom: 20, left: 70}, 
	    width = $(id1).width() - margin.left - margin.right,		//width of main svg
	    width2 = $(id2).width() - margin2.left - margin2.right,
	    height = $(id1).height() - margin.top - margin.bottom,		//height of main svg
	    height2 = $(id2).height() - margin2.top - margin2.bottom;

	//console.log("timeseries container width: ", $('#timeseries-container').width());
	//console.log("timeseries width: ", width);

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
	    y2 = d3.scaleLinear().range([height2, 0]),
	    ylet = d3.scaleLinear().range([height, 0]),
	    ylet2 = d3.scaleLinear().range([height2, 0]);

	var xAxis = d3.axisBottom(x),
	    xAxis2 = d3.axisBottom(x2),
	    yAxis = d3.axisLeft(y).ticks(5).tickFormat(function(d) {return d3.format(",.0f")(d)}),
	    //yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) { return d3.format(",.1%")(d)});
		yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) {
			if (d3.max(g.currentvars.currentTimeSeries, function(d) { return d.value.let; }) <= 0.003) {
				return d3.format(",.2%")(d);
			} else {
				return d3.format(",.1%")(d);
			}
		});
			

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

	x.domain([g.epitime.date_extent[0], d3.timeDay.offset(g.epitime.date_extent[1], 7)]);
	y.domain([0, d3.max(time_data, function(d) { return d.value.cas; })]);
	ylet.domain([0, d3.max(time_data, function(d) { return d.value.let; })]);
	x2.domain(x.domain());
	y2.domain(y.domain());
	ylet2.domain(ylet.domain());

	var orig_bar_width = (width/time_data.length);
	//console.log("orig_bar_width = ", orig_bar_width, " = ", width, "/",time_data.length);
	var bar_width = (width/time_data.length)-0.5;		//changing bar width only for focus chart  //0.5 for bar spacing
	//console.log("bar_width = ", bar_width, " = ", width, "/",time_data.length, "-0.5");
	g.currentvars.currentEpiDates.bar_width = bar_width;
	g.currentvars.currentEpiDates.bar_width_x2 = orig_bar_width;
	g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
	g.currentvars.currentEpiDates.tick_freq_x2 = getTickFrequencyX2(orig_bar_width);

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
	      .attr("class", "axis axis--x2")
	      .attr("transform", "translate(0," + height2 + ")")
	      .call(xAxis2);

	//to add lethality line to context chart:
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
		.attr("transform", "translate(-55," + (87) + ") rotate(-90)")
		.text(" ");
	focus
		.append("text")
		.attr("class", "ylet-axis-title")
		//.attr("transform", "translate(-15," +  (height+margin.bottom)/2 + ") rotate(-90)")
		.attr("transform", "translate(" + (width+55) + "," + (66) + ") rotate(-90)")
		.text(" ");


	//Render vertical line overlapping current bar in play mode
	svg1.append("line")
		.attr("class", "playBar_line");

}

	
function getTickFrequency(bar_width) {
	//console.log("site.js: getTickFrequency");
	if (bar_width > 55) {return 1}
	else if (bar_width > 35) {return 2}
	else if (bar_width > 20) {return 3}
	else {
		var freq = 97.405*Math.pow(bar_width, -1.133);    //power eqn fit for this purpose
		return freq;
	}
}

function getTickFrequencyX2(bar_width) {
	//console.log("site.js: getTickFrequencyX2")
	if (bar_width > 11) {return 1}
	else if (bar_width > 10) {return 2}
	else if (bar_width > 9) {return 3}
	else if (bar_width > 7) {return 4}
	else if (bar_width > 4.5) {return 6}
	else if (bar_width > 3) {return 12}
}


function updateTimeSeriesCharts(id1, id2) {
	//console.log("site.js: updateTimeSeriesCharts");
	updateCurrentTimeSeriesData();
	var time_data = g.currentvars.currentTimeSeries;
	
	var margin = {top: 10, right: 60, bottom: 20, left: 70},		//margins of actual x- and y-axes within svg  
	    margin2 = {top: 10, right: 60, bottom: 20, left: 70}, 
	    width = $(id1).width() - margin.left - margin.right,		//width of main svg
	    width2 = $(id2).width() - margin2.left - margin2.right,
	    height = $(id1).height() - margin.top - margin.bottom,		//height of main svg
	    height2 = $(id2).height() - margin2.top - margin2.bottom;

	//console.log("timeseries container width: ", $('#timeseries-container').width());
	//console.log("timeseries width: ", width);

	//Resize main SVGs
	svg1.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom);

	svg2.attr("width", width2 + margin2.left + margin2.right)
		.attr("height", height2 + margin2.top + margin2.bottom);

	svg1.select("defs").select("clipPath").select("rect")
	    .attr("width", width)
	    .attr("height", height);

	//set ranges
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
	x2.domain([g.epitime.date_extent[0], d3.timeDay.offset(g.epitime.date_extent[1], 7)]);
	y2.domain(y.domain());
	ylet2.domain(ylet.domain());

	//get width of each bar
	var orig_bar_width = (width/time_data.length);
	//console.log("orig_bar_width = ", orig_bar_width, " = ", width, "/",time_data.length);
	var bar_width = (width/time_data.length) - 0.5;		//0.5 for bar spacing
	//console.log("bar_width = ", bar_width, " = ", width, "/",time_data.length, "-0.5");
	g.currentvars.currentEpiDates.bar_width = bar_width;
	g.currentvars.currentEpiDates.bar_width_x2 = orig_bar_width;
	g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
	g.currentvars.currentEpiDates.tick_freq_x2 = getTickFrequencyX2(orig_bar_width);
	

	//FIX TICK ALIGNMENT HERE
	var xAxis = d3.axisBottom(x)
		.ticks(d3.timeThursday, g.currentvars.currentEpiDates.tick_freq) 
		//.ticks(function(d) {return d3.timeThursday})
		//.ticks(function(d) {console.log(d); return (d3.timeMonday, tick_frequency)})
		.tickFormat(function(d) {
				//d3.timeDay.offset(d3.timeMonday, 3.5)
				//console.log("Updating xAxis, tick: ", dateFormat(d)); 
				var newdate = new Date(d); 
				return getEpiWeek(d3.timeDay.offset(d, -3));
		}),
	    xAxis2 = d3.axisBottom(x2),
		yAxis = d3.axisLeft(y).ticks(5).tickFormat(function(d) {return d3.format(",.0f")(d)}),
		yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) {
			if (d3.max(g.currentvars.currentTimeSeries, function(d) { return d.value.let; }) <= 0.003) {
				return d3.format(",.2%")(d);
			} else {
				return d3.format(",.1%")(d);
			}
		});

	//get variable margin for y-axis title
	function getTitleMarg() {
    	if (y.domain()[1] < 1000) {return -40;}
    	else if (y.domain()[1] < 10000) {return -45;}
    	else if (y.domain()[1] < 100000) {return -50;}
    	else if (y.domain()[1] < 1000000) {return -55;}
    	else {return -60;}
    }
    var y_title_marg = getTitleMarg();

	
	//select all bars, remove them, and exit previous data set
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
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis)

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
					//.data([g.currentvars.currentTimeSeries]);

	letline.enter().append('path')
				.attr("class", "line")
				.attr("clip-path", "url(#clip)")
    			.attr("d", valueline);

	svg1.select('.axis--ylet')
      .attr("transform", "translate( " + width + ", 0 )")
      .call(yletAxis);


	svg1.select(".y-axis-title")
		.attr("transform", "translate(" + y_title_marg + ",87) rotate(-90)")
		.text(g.statList[0].full);

	svg1.select(".ylet-axis-title")
		.attr("transform", "translate(" + (width+55) + "," + (66) + ") rotate(-90)")
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

	var zoom = d3.zoom()
	    .scaleExtent([1, Infinity])
	    //.scaleExtent([1, width])
	    .translateExtent([[0, 0], [width, height]])
	    .extent([[0, 0], [width, height]])
	    .on("zoom", zoomed);

	var brush = d3.brushX()
	    .extent([[0, 0], [width2, height2]])
	    .on("brush", brushmoved)
	    .on("end", brushend);

	if (svg2.selectAll('g.brush').empty()) {
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
		gBrush.call(brush.move, [g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7)].map(x)); 
	} else {
		var gBrush = svg2.select('g.brush');
		var handle = gBrush.selectAll(".handle--custom");
		brushupdate();
	}


	function brushmoved() {
		//console.log("IN brushmoved");

		//get the width of each bar 
		var orig_bar_width = (width/time_data.length);
		//console.log("orig_bar_width = ", orig_bar_width, " = ", width, "/",time_data.length);
		var bar_width = (width/time_data.length) - 0.5;		//0.5 for bar spacing
		//console.log("bar_width = ", bar_width, " = ", width, "/",time_data.length, "-0.5");
		g.currentvars.currentEpiDates.bar_width = bar_width;
		g.currentvars.currentEpiDates.bar_width_x2 = orig_bar_width;
		g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
		g.currentvars.currentEpiDates.tick_freq_x2 = getTickFrequencyX2(orig_bar_width);


		//FIX TICK ALIGNMENT HERE
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
		    xAxis2 = d3.axisBottom(x2)
		    	.ticks(d3.timeMonth) //, g.currentvars.currentEpiDates.tick_freq_x2)
		    	.tickFormat(function(d) {
		    		//console.log(d.getMonth())
		    		if (d.getMonth()==0) {
		    			return d3.timeFormat("%Y")(d);
		    		} else if ((d.getMonth()%g.currentvars.currentEpiDates.tick_freq_x2)==0) {
		    			return getFrenchMonthName(d3.timeFormat("%B")(d));
		    		} else {
		    			return '';
		    		};
	    	}),
			yAxis = d3.axisLeft(y).ticks(5).tickFormat(function(d) {return d3.format(",.0f")(d)}),
			//yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) {return d3.format(",.1%")(d)});
			yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) {
				if (d3.max(g.currentvars.currentTimeSeries, function(d) { return d.value.let; }) <= 0.003) {
					return d3.format(",.2%")(d);
				} else {
					return d3.format(",.1%")(d);
				}
			});

	   
		//left axis
		svg1.select('.axis--y')
			.call(yAxis)
		//bottom axis
		svg1.select('.axis--x')
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis)

		var valueline = d3.line()
		    .x(function(d) { 		//add 3.5days here so data point drawn in middle of epiweek bar
		    	var newdate = new Date(d.key); 
		    	return x(newdate.setDate(newdate.getDate() + 3.5)); 
		    })  
		    .y(function(d) { return ylet(d.value.let); });

		svg1.select('g').selectAll(".line")
			.attr("d", valueline);


		svg1.select('.axis--ylet')
	      .attr("transform", "translate( " + width + ", 0 )")
	      .call(yletAxis);

		//bottom axis for timeseriesbrush chart
		svg2.select('.axis--x2')
			.attr("transform", "translate(0," + height2 + ")")
			.call(xAxis2);

		svg1.select(".y-axis-title")
			.attr("transform", "translate(" + y_title_marg + ",87) rotate(-90)")
			.text(g.statList[0].full);

		svg1.select(".ylet-axis-title")
			.attr("transform", "translate(" + (width+55) + "," + (66) + ") rotate(-90)")
			.text(g.statList[1].full);

		/*var bar2 = svg2.select('g').selectAll(".bar2")
						.remove()
						.exit()
						.data(time_data)

		bar2.enter()
			.append("rect")
			.attr("class", "bar2")
		    .attr("x", function(d) { return x2(d.key); })
		    .attr("y", function(d) { return y2(d.value.cas); })
		    .attr("width", orig_bar_width)
		    .attr("height", function(d) { return height2 - y2(d.value.cas); });*/

		svg2.select('.brush')
					    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")")
				        .call(brush);



		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
		var s = d3.event.selection || x2.range();   //range selected or entire range
		
		if (s[0]==s[1]) {		//if both handles at either min or max of range
			bar_width = 0;   	//set bar width to 0 to avoid 'Infinity' error
    	} else {
    		bar_width = ((g.currentvars.currentEpiDates.bar_width_x2) * ((x2.range()[1]-x2.range()[0])/(s[1]-s[0]))) - 0.5;   //0.5 for bar spacing
	    
    	}
    	//console.log("BAR WIDTH: ", bar_width, s, d3.event.selection, x2.range())

	    //console.log("bar_width = ", bar_width, " = ", g.currentvars.currentEpiDates.bar_width_x2, " or ", orig_bar_width, "*",(x2.range()[1]-x2.range()[0])/(s[1]-s[0]), "-0.5");
	    g.currentvars.currentEpiDates.bar_width = bar_width;
	    g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
	    //console.log(orig_bar_width, g.currentvars.currentEpiDates.bar_width, g.currentvars.currentEpiDates.tick_freq);
	    
		//FIX TICK ALIGNMENT HERE
		var xAxis = d3.axisBottom(x)
			.ticks(d3.timeThursday, g.currentvars.currentEpiDates.tick_freq)
			.tickFormat(function(d) {
					return getEpiWeek(d3.timeDay.offset(d, -3));
			})

	    g.currentvars.currentEpiDates.all = [];
	    g.currentvars.currentEpiDates.s = s;

	    //class 'active' bars and push to global variable
	    if ((s[0]==x2.range()[0]) && (s[1]==x2.range()[1])) {  //if full extent
	        svg2.selectAll(".bar2").classed("active", true);
	        for (var i=0; i<=g.epitime.all.length-1; i++) {
				g.currentvars.currentEpiDates.all.push(g.epitime.all[i].epiDate);
			}

	    } else {	//if not full extent   

	    	var sx = s.map(x2.invert);
	        svg2.selectAll(".bar2").classed("active", function(d) {
	        	if (sx[0] <= d.key && d.key < sx[1]) {  	
	        		g.currentvars.currentEpiDates.all.push(d.key);
	        	};
	        	return sx[0] <= d.key && d.key < sx[1]; 
	        });
	        handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4); */return "translate(" + [ s[i], 14] + ")"; });
	        
	        //console.log(g.currentvars.currentEpiDates.bar_width, bar_width)
			x.domain(s.map(x2.invert, x2));

	    	svg1.select("g").selectAll(".bar")
	    		.attr("x", function(d) { return x(d.key); })
	    		.attr("width", bar_width);

		    svg1.select('g').select('.axis--x').call(xAxis);

			svg1.select("g").selectAll(".line")
			    .attr("d", valueline);

		    svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
		        .scale(width / (s[1] - s[0]))
		        .translate(-s[0], 0));

	    }

	    g.currentvars.currentEpiDates.min = new Date(Math.min.apply(null,g.currentvars.currentEpiDates.all));
	    g.currentvars.currentEpiDates.max = new Date(Math.max.apply(null,g.currentvars.currentEpiDates.all));
	    g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
		g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);


		//TO ADD LETHALITY LINE TO CONTEXT CHART:
		/* active_data = [];
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

	}

	function brushupdate() {  //called when updating through code, not on mousemove
		//console.log("IN brushupdate");
		
		gBrush.call(brush.move, [g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7)].map(x));	

		if ((g.currentvars.currentEpiDates.s[0]==x2.range()[0]) && (g.currentvars.currentEpiDates.s[1]==x2.range()[1])) {  //full extent
			svg2.selectAll(".bar2").classed("active", true);
		} else {
			svg2.selectAll(".bar2").classed("active", function(d) {				
	        	return g.currentvars.currentEpiDates.all.indexOf(d.key) != -1;
	        });
	    }
        
		x.domain([g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7)]);
        var s = [x2(g.currentvars.currentEpiDates.min), x2(d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7))];
        bar_width = ((g.currentvars.currentEpiDates.bar_width_x2) * (x2.range()[1]-x2.range()[0])/(s[1]-s[0])) - 0.5;   //0.5 for bar spacing
        //console.log("bar_width = ", bar_width, " = ", g.currentvars.currentEpiDates.bar_width_x2, " or ", orig_bar_width, "*",(x2.range()[1]-x2.range()[0])/(s[1]-s[0]), "-0.5");
        g.currentvars.currentEpiDates.bar_width = bar_width;
        g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
        handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4); */return "translate(" + [g.currentvars.currentEpiDates.s[i], 14] + ")"; });
	
    	
        //TO ADD LETHALITY LINE TO CONTEXT CHART:
	    /* active_data = [];
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

		svg1.select("g").selectAll(".bar")
    		.attr("x", function(d) { return x(d.key); })
    		.attr("width", bar_width);

		//ylet.domain([0, d3.max(time_data, function(d) { return d.value.let; })]);
		//ylet2.domain([0, d3.max(time_data, function(d) { return d.value.let; })]);
		ylet.domain([0, d3.max(g.currentvars.currentTimeSeries, function(d) { return d.value.let; })]);
		ylet2.domain([0, d3.max(g.currentvars.currentTimeSeries, function(d) { return d.value.let; })]);

		svg1.select("g").selectAll(".line")
    		.data([g.currentvars.currentTimeSeries])
		    .attr("class", "line")
		    .attr("d", valueline);

	    svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
	        .scale(width / (s[1] - s[0]))
		        .translate(-s[0], 0));

	}

	function brushend() {
		//console.log("IN brushend");

		//get the width of each bar 
		var orig_bar_width = (width/time_data.length);
		//console.log("orig_bar_width = ", orig_bar_width, " = ", width, "/",time_data.length);
		var bar_width = (width/time_data.length) - 0.5;		//0.5 for bar spacing
		//console.log("bar_width = ", bar_width, " = ", width, "/",time_data.length, "-0.5");
		g.currentvars.currentEpiDates.bar_width = bar_width;
		g.currentvars.currentEpiDates.bar_width_x2 = orig_bar_width;
		g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
		g.currentvars.currentEpiDates.tick_freq_x2 = getTickFrequencyX2(orig_bar_width);

		//FIX TICK ALIGNMENT HERE
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
		    xAxis2 = d3.axisBottom(x2)
		    	.ticks(d3.timeMonth) //, g.currentvars.currentEpiDates.tick_freq_x2)
		    	.tickFormat(function(d) {
		    		//console.log(d.getMonth())
		    		if (d.getMonth()==0) {
		    			return d3.timeFormat("%Y")(d);
		    		} else if ((d.getMonth()%g.currentvars.currentEpiDates.tick_freq_x2)==0) {
		    			return getFrenchMonthName(d3.timeFormat("%B")(d));
		    		} else {
		    			return '';
		    		};
	    	}),
			yAxis = d3.axisLeft(y).ticks(5).tickFormat(function(d) {return d3.format(",.0f")(d)}),
			//yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) {return d3.format(",.1%")(d)});
			yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) {
				if (d3.max(g.currentvars.currentTimeSeries, function(d) { return d.value.let; }) <= 0.003) {
					return d3.format(",.2%")(d);
				} else {
					return d3.format(",.1%")(d);
				}
			});


		//bottom axis for timeseriesbrush chart
		svg2.select('.axis--x2')
			.attr("transform", "translate(0," + height2 + ")")
			.call(xAxis2)
		
		
		if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
	    var s = d3.event.selection || x2.range();   //range selected or entire range

	    if ((s[0]==s[1]) && ((s[0]==x2.range()[0]) || (s[0]==x2.range()[1]))) {  //if both handles either at min or max of range, reset to entire range
			//console.log(s, d3.event.selection, x2.range());
			s = x2.range();
		}

	    //determines whether to hide bar handles or not (in full extent)
	    if (d3.event.sourceEvent) {    	
	    	var path2 = [d3.event.sourceEvent.target]; //technique to get propagation path in both Chrome & Firefox
	    	var i = 0; 
	    	while ((varx = path2[i++].parentElement) != null) path2.push(varx);
	    	var clicked_on = path2[0].tagName;
	    	//var clicked_on = d3.event.sourceEvent.path[0].tagName;  //gets propagation path in Chrome only
	    } else {
	    	var clicked_on = 'NA';
	    }
	    //console.log(s, d3.event.sourceEvent, clicked_on)

	    if (d3.event.sourceEvent==null) {  //brush change in program
	    	handle.attr("display", null).attr("transform", function(d, i) {return "translate(" + [g.currentvars.currentEpiDates.s[i], 14] + ")"; });
		} else if ((s[0]==x2.range()[0]) && (s[1]==x2.range()[1])){  //full extent selected - manually by user
	    	g.currentvars.currentEpiDates.min = g.epitime.date_extent[0];
			g.currentvars.currentEpiDates.max = g.epitime.date_extent[1];
			g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
			g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);
			g.currentvars.currentEpiDates.all = [];

			for (var i=0; i<=g.epitime.all.length-1; i++) {
				g.currentvars.currentEpiDates.all.push(g.epitime.all[i].epiDate);
			}

	        svg2.selectAll(".bar2").classed("active", true);


	        //TO ADD LETHALITY LINE TO CONTEXT CHART:
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
			
			x.domain([g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7)]);
	        var s = [x2(g.currentvars.currentEpiDates.min), x2(d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7))];
	        bar_width = ((g.currentvars.currentEpiDates.bar_width_x2) * (x2.range()[1]-x2.range()[0])/(s[1]-s[0])) - 0.5;   //0.5 for bar spacing
	        //console.log("bar_width = ", bar_width, " = ", g.currentvars.currentEpiDates.bar_width_x2, " or ", orig_bar_width, "*",(x2.range()[1]-x2.range()[0])/(s[1]-s[0]), "-0.5");
	        g.currentvars.currentEpiDates.bar_width = bar_width;
	        g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
	        //g.currentvars.currentEpiDates.tick_freq_x2 = getTickFrequencyX2(orig_bar_width);

	        /*if ((clicked_on=='rect') || (clicked_on=='svg')) {  
	        	if (clicked_on=='svg') {
		        	console.log(s)
		        }
	        	if (!((g.currentvars.currentEpiDates.s[0]==x2.range()[0]) && (g.currentvars.currentEpiDates.s[1]==x2.range()[1]))){ 
	        		handle.attr("display", "none");
	        	} 
	    	} else {
	        	handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4); return "translate(" + [g.currentvars.currentEpiDates.s[i], 14] + ")"; });
	        	//handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4); return "translate(" + [ s[i], - height / 4] + ")"; });
	        }*/

	        if (!((g.currentvars.currentEpiDates.s[0]==x2.range()[0]) && (g.currentvars.currentEpiDates.s[1]==x2.range()[1]))){ 
	        		handle.attr("display", "none");
	        	} else {
	        		handle.attr("display", null).attr("transform", function(d, i) {/*console.log(s[i], - height / 4);*/ return "translate(" + [g.currentvars.currentEpiDates.s[i], 14] + ")"; });
	        	
	        	}

			svg1.select("g").selectAll(".bar")
	    		.attr("x", function(d) { return x(d.key); })
	    		.attr("width", bar_width);

		    svg1.select("g").select(".axis--x").call(xAxis);

			var valueline = d3.line()
			    .x(function(d) { 		//add 3.5days here so data point drawn in middle of epiweek bar
			    	var newdate = new Date(d.key); 
			    	return x(newdate.setDate(newdate.getDate() + 3.5)); 
			    })  
			    .y(function(d) { return ylet(d.value.let); });
			    
			svg1.select('g').selectAll(".line")
				//.data([g.currentvars.currentTimeSeries])
    			.attr("d", valueline);

		    svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
		        .scale(width / (s[1] - s[0]))
		        .translate(-s[0], 0));
			
	    } else {
	    	//console.log("BRUSH CHANGED MANUALLY BUT NOT TO FULL EXTENT / SNAP");
	    	//svg1.select("g").select(".axis--x").call(xAxis);

	    	var d0 = d3.event.selection.map(x2.invert),
			    d1 = d0.map(d3.timeMonday.round);

			  // If empty when rounded, use floor & ceil instead.
			  if (d1[0] >= d1[1]) {
			    d1[0] = d3.timeMonday.floor(d0[0]);
			    d1[1] = d3.timeMonday.offset(d1[0]);
			  }
			  d3.select(this).transition().call(d3.event.target.move, d1.map(x2));
	    }

		//compare button start & end dates to current start & end dates to turn buttons on & off appropriately as user brushes
	    g.timerangebuttons.forEach(function(btn) {
	    	
	    	var dates_match = sameDay(btn.date_min, g.currentvars.currentEpiDates.min) && sameDay(btn.date_max, g.currentvars.currentEpiDates.max);
	        //console.log(btn, g.currentvars.currentEpiDates, dates_match)
	        if ((dates_match) && (!($('.'+btn.id).hasClass('on')))) {
	        	$('.btn-timerange').removeClass('on');
	    		$('#'+btn.id).addClass('on');
	    	} else if ((!(dates_match)) && ($('#'+btn.id).hasClass('on'))) {
	            $('#'+btn.id).removeClass('on');
	        }
	    });

    	updateMap();
	}

	function zoomed() {
		//console.log("IN zoomed");
	    if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
	    var t = d3.event.transform;
	    x.domain(t.rescaleX(x2).domain());
	    svg1.select("g").selectAll(".bar").attr("x", function(d) { return x(d.key); });
	    svg2.select("g").select(".brush").call(brush.move, x.range().map(t.invertX, t));
	}	

};


function getFrenchMonthName(eng_month) {
	//console.log("site.js: getFrenchMonthName");
	var month_translations = {'January': "Janvier", 'February': "Février", 'March': "Mars", 'April': "Avril", 'May': "Mai", 'June': "Juin", 'July': "Juillet", 'August': "Août", 'September': "Septembre", 'October': "Octobre", 'November': "Novembre", 'December': "Décembre"};
 	return month_translations[eng_month];
}


/************************************/
/******  PLAY/PAUSE ANIMATION  ******/
/************************************/	

var playInterval;
var slideDuration = 1200; //in milliseconds
var autoRewind = false;   //automatically repeat from beginning
var currentDate = new Date (g.currentvars.currentEpiDates.min);
g.currentvars.currentAnimation.currentEpiDate = currentDate;

$(function() {
	//console.log("site.js: play/pause function");
    $("#btnPlayPause").on("click", function() {	   
    	if (g.currentvars.currentAnimation.playMode =='stop') {
    		currentDate = new Date (g.currentvars.currentEpiDates.min);
    	} ;
    	$('#btnStop').css('display','block');   //display Stop button
    	$('#playMode_text').css('display','inline-block');   //display play mode text under stop button
		if (playInterval != undefined) {    //in Pause mode (playInterval defined when button is playing)
            clearInterval(playInterval);
            playInterval = undefined;
            $("#btnPlayPause").removeClass('pause'); 
            togglePlayMode('pause');
            return;
        }
		$("#btnPlayPause").addClass('pause');  //in Play mode 
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
						//console.log("in btnPlayPause");
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
	//console.log("site.js: addPlayLine");
	var id1 = '#timeseries';
	var margin = {top: 10, right: 60, bottom: 20, left: 70},		//margins of actual x- and y-axes within svg  
	    width = $(id1).width() - margin.left - margin.right,		//width of main svg
	    height = $(id1).height() - margin.top - margin.bottom;		//height of main svg

	var x = d3.scaleTime().range([0, width])  		//x-axis width, accounting for specified margins
						  .domain([g.currentvars.currentEpiDates.min, d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7)]);

	//FIX TICK ALIGNMENT HERE
	//var week_width = x(d3.timeDay.offset(g.currentvars.currentEpiDates.min, 7)) - x(g.currentvars.currentEpiDates.min);
	var week_width = width/g.currentvars.currentEpiDates.all.length;
	//console.log(width,'/', g.currentvars.currentEpiDates.all.length,'=', week_width);

	svg1.selectAll('.playBar_line')
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
	//console.log("site.js: togglePlayMode");
	if (mode =='play') {
		g.currentvars.currentAnimation.playMode ='play';
		g.currentvars.currentAnimation.maxLegendVal = getMaxLegendVal();

		//disable features in play mode
		$('#btnZone').addClass('no-point');
		$('#btnProv').addClass('no-point');
		$('#btnProv').addClass('disable');
		$('#btnZone').addClass('disable');
		$('#stat-select').addClass('no-point');
		$('#disease-select').addClass('no-point');
		$('.styledSelect').addClass('no-point');
		$('.select').addClass('no-point');
		//$('.btn_acts').addClass('no-point');
		//$('.btn_alt').addClass('no-point');
		$('#btn_reset').addClass('no-point');
		$('#btn_reload_data').addClass('no-point');
		$('.btn-timerange').addClass('no-point');

		svg2.selectAll(".bar2.active").style('fill', '#7f7f7f');
		svg2.select('g.brush').remove();

	} else if (mode =='pause') {
		g.currentvars.currentAnimation.playMode ='pause';

	} else if (mode =='stop') {
		g.currentvars.currentAnimation.playMode ='stop';
		g.currentvars.currentAnimation.currentEpiDate = 'NA';	
		
		//re-enable features in stop mode
		$('#btnZone').removeClass('no-point');
		$('#btnProv').removeClass('no-point');
		$('#btnProv').removeClass('disable');
		$('#btnZone').removeClass('disable');
		$('#stat-select').removeClass('no-point');
		$('#disease-select').removeClass('no-point');
		$('.styledSelect').removeClass('no-point');
		$('.select').removeClass('no-point');
		//$('.btn_acts').removeClass('no-point');
		//$('.btn_alt').removeClass('no-point');
		$('#btn_reset').removeClass('no-point');
		$('#btn_reload_data').removeClass('no-point');
		$('.btn-timerange').removeClass('no-point');

		svg1.selectAll(".bar").classed("playBar", function(d) {return false;})
		svg1.selectAll(".playBar_line").attr('display', 'none');

		updateAll();
		
	};
}



/***********************************/
/****  UPDATE DATA & DASHBOARD  ****/
/***********************************/	

function updateMap() {
	//console.log("site.js: updateMap");
	colorMap();
	updateActivityClusters();
	updateHeadline();
	updateFiltSum();
}

function updateAll() {
	//console.log("site.js: updateAll");
	//console.log("in updateAll(), ", data)
	//updateMap();
	//currentTimeSeriesData = getCurrentTimeSeriesData();
	//updateCurrentTimeSeriesData();
	updateTimeSeriesCharts('#timeseries', '#timeseriesbrush');
}


/*********************************************/
/****  GLOBAL VARIABLES & INITIALISATION  ****/
/*********************************************/

var map;
/*var geojson_zone;
var geojson_prov;
var geojson_prov_bound;
var geojson_riv;*/
var geoprov;
var geozs;
var geoprovbound;
var georiv;
var geolak;
//var geojson_lak;
//var geojson_act_markers;
//var markerClusters;
var geojsonClusterPath = 'data/act_data.geojson';
//var currentActData;
var currentMapData;
//var currentTimeSeriesData;
var legendSvg;
var svg1, svg2;
var dateFormat = d3.timeFormat("%d %b %y");

window.onload = function () {
	//console.log("site.js: window.onload");
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

    //var lak_geoms;
	var req5 = new XMLHttpRequest();
    var url_lak = 'data/rdc_lakes.json'   
        req5.open('GET', url_lak, true);
        req5.onreadystatechange = handler;
        req5.send();
    var topoob5 = {};
    geolak = {};

    //var act_geoms;
	/*var req6 = new XMLHttpRequest();
    //var url_act = 'data/rdc_prov_cntr.json'   
        req6.open('GET', url_act, true);
        req6.onreadystatechange = handler;
        req6.send();
    var topoob6 = {};
    geoact = {};*/

    /*function loadTopos(callback) {
	    //var geozs;
		d3.json('data/rdc_zs.json', function(error, topology) {
		  if (error) throw error;
		  geozs = topojson.feature(topology, topology.objects.rdc_zs);
		  //console.log("geojson", geolak)
		});
		console.log("geozs", geozs)

		//var geoprov;
		d3.json('data/rdc_prov.json', function(error, topology) {
		  if (error) throw error;
		  geoprov = topojson.feature(topology, topology.objects.rdc_prov);
		  console.log("geoprov", geoprov)
		});
		console.log("geoprov", geoprov)

		//var geoprovbound;
		d3.json('data/rdc_prov_bound.json', function(error, topology) {
		  if (error) throw error;
		  geoprovbound = topojson.feature(topology, topology.objects.rdc_prov_bound);
		  //console.log("geojson", geolak)
		});

	    //var georiv;
		d3.json('data/rdc_rivers.json', function(error, topology) {
		  if (error) throw error;
		  georiv = topojson.feature(topology, topology.objects.rdc_rivers);
		  //console.log("geojson", geolak)
		});

	    //var geolak;
		d3.json('data/rdc_lakes.json', function(error, topology) {
		  if (error) throw error;
		  geolak = topojson.feature(topology, topology.objects.rdc_lakes);
		  console.log("geolak", geolak)
		  //handler();
		});

		callback();
	}*/

    function handler(){
    	//console.log("site.js: in handler");
        if ((req.readyState === XMLHttpRequest.DONE) && (req2.readyState === XMLHttpRequest.DONE) && (req3.readyState === XMLHttpRequest.DONE) && (req4.readyState === XMLHttpRequest.DONE)) {// && (req5.readyState === XMLHttpRequest.DONE))  {
        	//console.log("site.js: in handler, xmlhttprequests done");
        	map = createMap('#map', [], req.responseText, req2.responseText, req3.responseText, req4.responseText, req5.responseText);
			//map = createMap('#map', [], geozs, geoprov, geoprovbound, georiv, geolak); //, req5.responseText);
			createTimeRangeButtons();
			createTimeSeriesCharts('#timeseries', '#timeseriesbrush');
			updateMapInfo('', '', '', '');
			initDiseaseDropDown();
			initStatsDropDown();
			changeDiseaseSelection(0);
			changeStatSelection(0);
			addMenuToggle();
			//console.log("g = ", g);
			//resize();
			if (displayLoadDataDialog == true) {
				displayDataDialog();
			} else {
				/*data = (function() {
			        var json = null;
			        $.ajax({
			            'async': false,
			            'global': false,
			            'url': "data/data.js",    //replace with axios endpoint
			            'dataType': "json",
			            'success': function (data) {
			                json = data;
			            }
			        });
			        return json;
			    })();
			    data = addEpitimeToData(data);
			    resetDashboardData();*/
			}
			btn_act('all');
        }

    }

    //loadTopos(handler);

}


function addMenuToggle() {
	//console.log("site.js: addMenuToggle");
	document.getElementById('sideMenu_btn').addEventListener("click", function() {
	    //console.log("clicked on sideMenu_btn");
	    document.getElementById('sideMenu').classList.toggle('hide');
	    document.getElementById('sideMenu_btn').classList.toggle('show');
	    document.getElementById('main-container').classList.toggle('nomenu');
	    setTimeout(function(){ resize(); }, 300);
	});
	document.getElementById('closeMenu_btn').addEventListener("click", function() {
	    //console.log("clicked on closeMenu_btn");
	    document.getElementById('sideMenu').classList.toggle('hide');
	    document.getElementById('sideMenu_btn').classList.toggle('show');
	    document.getElementById('main-container').classList.toggle('nomenu');
	    setTimeout(function(){ resize(); }, 300);
	});
};

function sameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}


var select_disease = document.getElementById("disease-select");
function initDiseaseDropDown() {
	for (disease in g.diseaseList) {
		if (g.diseaseList[disease]!=null) {
			//console.log('Disease: ', disease, g.diseaseList[disease])
	    	select_disease.options[select_disease.options.length] = new Option(g.diseaseList[disease], disease);
	    }
	}
}
	
var select_stat = document.getElementById("stat-select");
function initStatsDropDown() {
	for (stat in g.statList) {
		if (g.statList[stat].full!=null) {
	    	select_stat.options[select_stat.options.length] = new Option(g.statList[stat].full, stat);
	    }
	}
}

function changeDiseaseSelection(opt) {
	//console.log("site.js: changeDiseaseSelection");
	if (opt!=null) {
		select_disease.selectedIndex = opt;
	}
	g.currentvars.currentDisease = select_disease.options[select_disease.selectedIndex].text;
	var element = document.getElementById('map_title');
	element.innerHTML = g.currentvars.currentDisease + ' - ' + g.currentvars.currentStat.full;	//Could amend/correct/re-write disease names here
	cf.malDim.filterAll();
	cf.malDim.filter(g.currentvars.currentDisease);
	updateAll();
}

function changeStatSelection(opt) {
	//console.log("site.js: changeStatSelection");
	if (opt!=null) {
		select_stat.selectedIndex = opt;
	}
	var element = document.getElementById('map_title');
	for (i=0; i<=g.statList.length-1; i++) {
		if (g.statList[i].full == select_stat.options[select_stat.selectedIndex].text) {
			g.currentvars.currentStat = g.statList[i];
			break;
		}
	}
	element.innerHTML = g.currentvars.currentDisease + ' - ' + g.currentvars.currentStat.full;
	updateAll();
}


function updateHeadline() {
	//console.log("site.js: updateHeadline");
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

function btn_act(type) {
	//console.log("site.js: btn_act");
	//console.log("btn_act: ", type)
	if (type=='none') {  //turn off all activity/alert buttons
		$('.btn_acts').removeClass('on'); //turn all activity btns off
		$('.btn_alt').removeClass('on'); //turn all alert btns off
		g.currentvars.currentActivities = [];

	} else if (type=='all'){  //turn on all activity/alert buttons
		for (var i=0; i<= g.activities.all.length-1; i++) {
			var btn = g.activities.all[i];
			if (btn.btn_name!='') {
				if (!($(btn.btn_name).hasClass('on'))) {   //switch on
					$(btn.btn_name).addClass('on');
					g.currentvars.currentActivities.push(btn.act_name);
				}
			}
			
		}


	} else {   //toggle btn as expected

		for (var i=0; i<= g.activities.all.length-1; i++) {
			if (g.activities.all[i].act_name == type) {
				var btn = g.activities.all[i];
			}
		}
		if ($(btn.btn_name).hasClass('on')) {   //switch off
			$(btn.btn_name).removeClass('on');
			var index = g.currentvars.currentActivities.indexOf(type);
			if (index > -1) {
			    g.currentvars.currentActivities.splice(index, 1);
			}
		} else {							 //switch on
			$(btn.btn_name).addClass('on');
			g.currentvars.currentActivities.push(type);
		}

		
		if ((type=='alerte') && ($('#btnAlt').hasClass('on'))) {		//if main alert button turned on 
			//console.log("main alert button turned ON, turn on all sub-alerts")		//turn on all sub-alert btns
			for (var i=0; i<= g.activities.all.length-1; i++) {
				if ((g.activities.all[i].act_type=='alerte') && (g.activities.all[i].btn_name!='')) {
					if (!($(g.activities.all[i].btn_name)).hasClass('on')) {
						$(g.activities.all[i].btn_name).addClass('on'); 
						g.currentvars.currentActivities.push(g.activities.all[i].act_name);
					}
				}
			}


		} else if ((type=='alerte') && (!($('#btnAlt').hasClass('on')))) {	//if main alert button turned off
			//console.log("main alert button turned OFF, turn off all sub-alert btns")  //turn off all sub-alert btns
			$('.btn_alt').removeClass('on');			//then turn off all sub-alert btns 
			for (var i=0; i<= g.activities.all.length-1; i++) {
				if ((g.activities.all[i].act_type=='alerte') && (g.activities.all[i].btn_name!='')) {
					var index = g.currentvars.currentActivities.indexOf(g.activities.all[i].act_name);
					if (index > -1) {
					    g.currentvars.currentActivities.splice(index, 1);
					}
				}
			}
		};

		function getNumAlertsOn() {
			var allOn = true;
			for (var i=0; i<= g.activities.all.length-1; i++) {
				if ((g.activities.all[i].act_type=='alerte') && (g.activities.all[i].act_name!='alerte') && (g.activities.all[i].btn_name!='')) {
					if (!($(g.activities.all[i].btn_name).hasClass('on'))) {
						allOn = false;
						break;
					}
				}
			}
			return allOn;
		}
		var allAlertsOn = getNumAlertsOn();

		if ((btn.act_type=='alerte') && allAlertsOn) {	//if all sub-alert buttons turned on
			if (!($('#btnAlt').hasClass('on'))) {			//turn on main alert btn (if not already on)
				$('#btnAlt').addClass('on');
				g.currentvars.currentActivities.push('alerte');
			}
		} else if (btn.act_type=='alerte') {			//if not all sub-alert buttons turned on
			$('#btnAlt').removeClass('on');					//turn off main alert btn
			var index = g.currentvars.currentActivities.indexOf('alerte');
			if (index > -1) {
			    g.currentvars.currentActivities.splice(index, 1);
			}
		}

	};

	updateActivityClusters();
	updateFiltSum();
}

function updateFiltSum() {
	//console.log("site.js: updateFiltSum");
	var filtSum = document.getElementById("win_filt-sum");
	var sem_html, dat_html, act_html, loc_html;

	if (g.currentvars.currentAnimation.playMode!='stop') {
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

	if (g.currentvars.currentActivities.length == 0) {
		act_html = 'Aucune choisie';
	} else {
		if (g.currentvars.currentActivities.indexOf('alerte') != -1) {
			act_html = 'Toutes les Alertes';
		} else {
			var sub_act_html = '';
			for (var i=0; i<= g.activities.all.length-1; i++) {
				if ((g.activities.all[i].act_type=='alerte') && (g.activities.all[i].btn_name!='')) {
					if (g.currentvars.currentActivities.indexOf(g.activities.all[i].act_name) != -1) {
						sub_act_html += g.activities.all[i].btn_text + ', ';
					}
				}
			}
			if (sub_act_html.length > 0) {
				act_html = 'Alertes <i>(' + sub_act_html.slice(0, -2) + ')</i>';
			} else {
				act_html = '';
			}
			
		};
		if (g.currentvars.currentActivities.indexOf('evaluation') != -1) {
			if (act_html.length!=0) {act_html += ', '}
			act_html += 'Evaluations';
		};
		if (g.currentvars.currentActivities.indexOf('intervention') != -1) {
			if (act_html.length!=0) {act_html += ', '}
			act_html += 'Interventions';
		};
	}

	filtSum.innerHTML='<p class="filt-sum-title">Resumé des options choisies:</p><i>Pathologie: </i><b>' + g.currentvars.currentDisease + '</b><br/>' + 
	'<i>Statistique: </i><b>' + g.currentvars.currentStat.full + '</b><br/>' + 
	'<i>Semaines epi: </i><b>' + sem_html + ' </b><br/><i>(Dates: ' + dat_html + ')</i><br/>'+ 
	'<i>Activités: </i><b>' + act_html + ' </b><br/>' + loc_html;
}

function btn_filt_sum() {
	//console.log("site.js: btn_filt_sum");
	var filtSum = document.getElementById("win_filt-sum");
	if ($('#btnFiltSum').hasClass('on')) {   //switch off
		$('#btnFiltSum').removeClass('on');
		filtSum.style.display = 'none';
	} else {								 //switch on
		$('#btnFiltSum').addClass('on');
		filtSum.style.display = 'block';
	}
}

function btn_reload_data() {   
	//console.log("site.js: btn_reload_data");
	if (displayLoadDataDialog==true) {
		displayDataDialog();
	} else {
		console.log("Data dialog turned off");
	}
}  

function btn_reset() {
	//console.log("site.js: btn_reset");
	cf.zsDim.filterAll();
	cf.zsDim2.filterAll();
	cf.provDim.filterAll();
	cf.provDim2.filterAll();
	g.currentvars.currentZones = {pcodes: [], names: []};
	g.currentvars.currentProvs = {pcodes: [], names: []};
	cf.epiDateDim.filterAll();
	g.currentvars.currentEpiDates.min = g.currentvars.currentEpiDates.min_default; 
	g.currentvars.currentEpiDates.max = g.currentvars.currentEpiDates.max_default; 
	$('.btn-timerange').removeClass('on');
	$('#'+g.timerangebuttons.default_btn.id).addClass('on');
	changeDiseaseSelection(0);
	changeStatSelection(0);
	if (!($('#btnRiv').hasClass('on'))) {btn_rivers();};
	btn_change_lyr('prov'); 
	setDefaultMapZoom();
	//if (!($('#btnAlt').hasClass('on'))) {btn_act('alerte');};
	//btn_act('none');   
	btn_act('all');
	updateAll();
}

$('#btnIntro').click(function(){
 	helpTour();
});


function createTimeRangeButtons() {
	//console.log("site.js: createTimeRangeButtons");
	var tr_btns_html = '';

	g.timerangebuttons.forEach(function(btn) {
		var dates = getEpiRange(btn.range_type, btn.range_param);
		btn.date_min = dates[0];
		btn.date_max = dates[1];
		btn.epiweek_min = getEpiWeek(btn.date_min);
		btn.epiweek_max = getEpiWeek(btn.date_max);

		tr_btns_html += "<button id='btnTimeRange_" + btn.range_param + btn.range_type + "' class='btn-timerange button' onclick='btn_selectTimeRange(&quot;" + btn.range_type + "&quot;," + btn.range_param + ");'>" + btn.text + "</button>";
	
	});
	$('#timerange_buttons').html(tr_btns_html);
}

function btn_selectTimeRange(rng_type, param) {
	//console.log("site.js: btn_selectTimeRange");
	var dates = getEpiRange(rng_type, param);
	g.currentvars.currentEpiDates.min = dates[0];
	g.currentvars.currentEpiDates.max = dates[1];
	g.currentvars.currentEpiWeek.min = getEpiWeek(g.currentvars.currentEpiDates.min);
	g.currentvars.currentEpiWeek.max = getEpiWeek(g.currentvars.currentEpiDates.max);
	g.currentvars.currentEpiDates.all = [];

	//populate g.currentvars.currentEpiDates.all with all weeks from min to max
	for (var i=0; i<=g.epitime.all.length-1; i++) {
		if ((g.currentvars.currentEpiDates.min <= g.epitime.all[i].epiDate) && (g.epitime.all[i].epiDate < g.currentvars.currentEpiDates.max)) {
			g.currentvars.currentEpiDates.all.push(g.epitime.all[i].epiDate);
		}
	}
	//currentTimeSeriesData = getCurrentTimeSeriesData();
	updateTimeSeriesCharts('#timeseries', '#timeseriesbrush');

	$('.btn-timerange').removeClass('on');
	$('#btnTimeRange_' + param + rng_type).addClass('on');

}


function resize() { 
	//console.log("site.js: resize");
  	//console.log("WINDOW RESIZED to w", window.innerWidth, ' x h', window.innerHeight);
  	if (window.innerWidth < 768) {
  		if (!($('#btnPlayPause').hasClass('slimline'))) {$('#btnPlayPause').addClass('slimline');};
    	if (!($('#btnStop').hasClass('slimline'))) {$('#btnStop').addClass('slimline');};
    	if (!($('#playMode_text').hasClass('slimline'))) {$('#playMode_text').addClass('slimline');};
    	$('#btnZone').removeClass('slimline');
    	$('#btnProv').removeClass('slimline');
    	$('#title-container').removeClass('slimline');
    	$('#timerange_buttons').removeClass('slimline');
    	if (!($('#timerange_buttons').hasClass('slimline'))) {$('#timerange_buttons').addClass('slimline2');}; 
    	$('.btn-timerange').removeClass('slimline');
  	} else if (window.innerWidth < 1041) {
  		$('#btnPlayPause').removeClass('slimline'); 
    	$('#btnStop').removeClass('slimline'); 
    	$('#playMode_text').removeClass('slimline');  
  		if (!($('#btnZone').hasClass('slimline'))) {$('#btnZone').addClass('slimline');};
  		if (!($('#btnProv').hasClass('slimline'))) {$('#btnProv').addClass('slimline');};   
  		if (!($('#title-container').hasClass('slimline'))) {$('#title-container').addClass('slimline');}; 
  		if (!($('#timerange_buttons').hasClass('slimline'))) {$('#timerange_buttons').addClass('slimline');}; 
  		$('#timerange_buttons').removeClass('slimline2');
  		if (!($('.btn-timerange').hasClass('slimline'))) {$('.btn-timerange').addClass('slimline');}; 
  	} else {
  		$('#btnPlayPause').removeClass('slimline'); 
    	$('#btnStop').removeClass('slimline'); 
    	$('#playMode_text').removeClass('slimline');  
    	$('#btnZone').removeClass('slimline');
    	$('#btnProv').removeClass('slimline');
    	$('#title-container').removeClass('slimline');
    	$('#timerange_buttons').removeClass('slimline2');
    	$('.btn-timerange').removeClass('slimline');
  	}
    //svg1.remove();
    //svg2.remove();
    //createTimeSeriesCharts('#timeseries', '#timeseriesbrush');
    updateTimeSeriesCharts('#timeseries', '#timeseriesbrush');

}
window.onresize = resize;
