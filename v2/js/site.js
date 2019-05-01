//////////////////////////////////////////////////////////////////////////////////////////
//
// Next dev steps:
// - Barchart:
//     - epiweek date on Thurs 00:00, should be Thurs 12:00 to be exactly halfway through week - use d3.timeInterval to create custom interval?
//     - bars for no data could state 'no data' on mouseover instead of not existing?
// - Map:
//     - sometimes map zooms to feature when attempting to select feature - annoying
//     - full screen toggle - add to context menu
//     - leaflet side panel could be put into map? - e.g. see hotosm    https://github.com/Turbo87/leaflet-sidebar/   https://codepen.io/leemark/pen/vOrXWE
// - User interface:
//   - Improve side panel UI?
//   - Restore contact link ***Q - who should it be?
// - responsive design
// - Update Help tour
// - Code clean-up/ES6 - remove all vars & for loops
//
// - Check d3 modularity - include only as needed
// - Normalize CSS - to remove browser inconsistencies
// - Add logger tool
// - Catch errors if icon images not available
// - Loader - add progress bar e.g. https://github.com/samundrak/fetch-progress/ ?
//
//
// Recently completed updates:
// - removed 2nd crossfilter dimension for provinces & zones
// - created color distinction between zero & non-selected regions on map
// - re-factored all date/time parsing to moment.js, using timestamps (except d3 time-based axes)
// - replaced all epitime calculations with moment-isocalendar
// - removed all number formats using d3.format()
// - added loading spinner to original page
// - added icon for nestor link in activity popup
// - removed dependence on geonames.js file - instead now reads this data from zone geojson layer -> reads object properties name, pcode, lvl3_name, lvl3_pcode (as zs, zs_pcode, prov, prov_pcode)
// - reset buttons - reset all button - added user confirm alert
//                 - added reset map button - resets to full province layer (all selected), zooms to full DRC
// - Barchart:
//   - highlight bars on hover for whole height of chart (not only height of bars)
//   - fixed bar spacing issue
// - Map:
//   - activity clusters (evaluations & interventions) - added diagonal pattern to svgs to distinguish from focus & alarm alerts
//   - applied 'conscious' additive selection for locations - i.e. clicking selects one at a time, click plus shift selects many
//   - added zoom box control
//   - changed map scale behaviour (both are still linear scale):
//      - when selecting 1 location, color of that location is maintained relative to all other locations (despite them not being selected)
//      - when selecting >1 location, scale is the extent of only the selected locations (this makes it easier to see relative differences)
//   - added contextual menu when right-clicking on map 
//   - added fractional zooms to interpolate between zoom layers
//   - added button to toggle map view to full screen
// - Location search/Selectivity:
//   - added dropdown of locations to search/select provinces/zones
//   - applied 'conscious' additive selection - clicking/pressing enter selects one at a time, adding shift selects many
// - Exports - to zipped folder, with spinner loader:
//   - TXTs - i. current dashboard summary with selected activities, ii. alert sitrep summary (alarme, focus, suivi actif only) for all locations and all diseases
//   - CSVs - i. location-based (what is on map), ii. time series (what is on chart)
//   - KMLs - prov, zone, prov boundaries, rivers, lakes, activities; with simplified geometries for prov/zone/river geojsons; with appropriate names, descriptions & activity icons in KML
//   - PDF - filter summary, map png, map legend, time series charts as SVG
//   - PNGs - i. current map, ii. sitrep - i.e. map with only alerts on it (except alertes ferme, as it clutters it) as colored stripes filling polygons, not with activity icons
//
// Notes: 
// - postgres must include key 'epitimestamp' (as well as key 'epiweek' which is integer number)
// - prior to sending, postgres must validate disease names, pcodes for both prov & zone (no empty, no misspellings)
// - activity data should have alertes named alerte_ferme (no accent on the e), but its ok its been accounted for in program
//
// Long-term dev:
// - remove dependence on jquery
// - add linting tool
// - convert to PWA (for offline & mobile)
// - brainstorm for next version (aire de sante level, logistics, kobo, elasticsearch/diggr)
// - monitor usage
// - documentation
//
///////////////////////////////////////////////////////////////////////////////////////////


moment.locale('fr');

window.onresize = resize;

//const publish_github = true;
/*********************/
/****  LOAD DATA  ****/
/*********************/


/*if (!publish_github) {      //DATA LOAD FOR APP:

    let fetchedData = []

    //0 IDS DATA
    let apiRequest1 = fetch('getIDS').then(function(response) {
        return response.json()
    });
    fetchedData.push(apiRequest1)

    // 1 2 3 4 5 = GIS DATA
    GISLayers.forEach(lyr => {
        fetchedData.push(
            fetch('getGISData/' + lyr.fname).then(function(response)
            {
                return response.text()
            })
        )
    })

    console.log("Loading....")

    //loading spinner
    document.getElementById("load_text").innerHTML = 'Chargement en cours...';
    document.getElementById("spinner_container").style.display = 'inline-block';
    document.getElementById("spinner").classList.add('epLoader');


    Promise.all(fetchedData).then(function(apiData) {

        console.log("Loaded data");
        let [mdata, ...geoData] = apiData;
        //console.log(mdata)
        //console.time('ADD EPITIME')
        data = addEpitimeToData(mdata);  //temporary function - date to be sent from database as timestamp
        //createEpitime(mdata)           //Note: will need this after function above removed - needs testing
        //console.timeEnd('ADD EPITIME');


        //add crossfilter dimensions & groups
        cf = crossfilter(data);
        //console.log('data: ', data)
        //console.time('ADD CROSSFILTER DIMS ALL')
        cf.epiDateDim = cf.dimension(function(d) {    
            return d.epitimestamp
        });
        cf.malDim = cf.dimension(function(d) { 
            return d.mal
        });
        cf.provDim = cf.dimension(function(d) {
            return d.prov_pc
        });
        cf.zsDim = cf.dimension(function(d) {
            return d.zs_pc
        });
        //console.timeEnd('ADD CROSSFILTER DIMS ALL')
        cf.statsByEpiDateGroup = cf.epiDateDim.group().reduce(reduceAdd, reduceRemove, reduceInitial); 
        cf.statsByZsGroup = cf.zsDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);
        cf.statsByProvGroup = cf.provDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);

        createDiseaseList();
        initCurrentVars();

        map = createMap('#map', [], ...geoData);
        geonames = geozs.features.map(a => ({'prov': a.properties.lvl3_name, 'prov_pcode': a.properties.lvl3_pcode, 'zs': a.properties.name, 'zs_pcode': a.properties.pcode}))

        createTimeRangeButtons();
        createTimeSeriesCharts(); 
        updateMapInfo();

        initSelectivity();
        initDiseaseDropDown();
        initStatsDropDown();
        changeDiseaseSelection(0);
        changeStatSelection(0);
        addMenuToggle();

        btn_act('all');
        console.log("ready");
        document.getElementById("loader").innerHTML = '';
    });


} else { */       //DATA LOAD FOR GITHUB:

    //loading spinner
    document.getElementById("load_text").innerHTML = 'Chargement en cours...';
    document.getElementById("spinner_container").style.display = 'inline-block';
    document.getElementById("spinner").classList.add('epLoader');



    var mdata = (function() {
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

    data = addEpitimeToData(mdata); 

    //add crossfilter dimensions & groups
    cf = crossfilter(data);
    //console.log('data: ', data)
    //console.time('ADD CROSSFILTER DIMS ALL')
    cf.epiDateDim = cf.dimension(function(d) {    
        return d.epitimestamp
    });
    cf.malDim = cf.dimension(function(d) { 
        return d.mal
    });
    cf.provDim = cf.dimension(function(d) {
        return d.prov_pc
    });
    cf.zsDim = cf.dimension(function(d) {
        return d.zs_pc
    });
    //console.timeEnd('ADD CROSSFILTER DIMS ALL')
    cf.statsByEpiDateGroup = cf.epiDateDim.group().reduce(reduceAdd, reduceRemove, reduceInitial); 
    cf.statsByZsGroup = cf.zsDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);
    cf.statsByProvGroup = cf.provDim.group().reduce(reduceAdd, reduceRemove, reduceInitial);



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


        function handler(){
            //console.log("site.js: in handler");
            if ((req.readyState === XMLHttpRequest.DONE) && (req2.readyState === XMLHttpRequest.DONE) && (req3.readyState === XMLHttpRequest.DONE) && (req4.readyState === XMLHttpRequest.DONE)) {// && (req5.readyState === XMLHttpRequest.DONE))  {
                //console.log("site.js: in handler, xmlhttprequests done");

                createDiseaseList();
                initCurrentVars();

                let geoData = [req.responseText, req2.responseText, req3.responseText, req4.responseText, req5.responseText];

                map = createMap('#map', [], ...geoData);
                geonames = geozs.features.map(a => ({'prov': a.properties.lvl3_name, 'prov_pcode': a.properties.lvl3_pcode, 'zs': a.properties.name, 'zs_pcode': a.properties.pcode}))

                createTimeRangeButtons();
                createTimeSeriesCharts(); 
                updateMapInfo();

                initSelectivity();
                initDiseaseDropDown();
                initStatsDropDown();
                changeDiseaseSelection(0);
                changeStatSelection(0);
                addMenuToggle();

                btn_act('all');
                console.log("ready");
                document.getElementById("loader").innerHTML = '';
            }

        }

    }

//}




//////////////////////////// END OF DATA LOAD

function reduceAdd(p, v) {
    p.cas += v.cas;
    p.dec += v.dec;
    p.let = p.cas != 0 ? (p.dec / p.cas) : 0;
    return p;
}

function reduceRemove(p, v) {
    p.cas -= v.cas;
    p.dec -= v.dec;
    p.let = p.cas != 0 ? (p.dec / p.cas) : 0;
    return p;
}

function reduceInitial() {
    return {
        cas: 0,
        dec: 0,
        let: 0
    };
}



//Create list of diseases from data - lookup speeds up array search
function createDiseaseList() {
    let lookup = {};
    g.diseaseList = [];
    for (let item, i = 0; item = data[i++];) {
        let mal = item.mal;
        if (!(mal in lookup)) {
            lookup[mal] = 1;
            g.diseaseList.push(mal);
        }
    }
    g.diseaseList.sort();   
};


function initCurrentVars()
{
    g.currentvars = {};
    g.currentvars.currentDisease;
    g.currentvars.currentStat = g.statList[0];
    g.currentvars.currentMinVal;
    g.currentvars.currentMaxVal;
    g.currentvars.currentMapLyr = 'prov'; //prov/zone
    g.currentvars.currentTotals = {};
    g.currentvars.currentZones = {
        pcodes: [],
        names: []
    };
    g.currentvars.currentProvs = {
        pcodes: [],
        names: []
    };
    g.currentvars.currentEpiDates = {};
    g.currentvars.currentActivities = [];
    g.currentvars.currentActivities.currentList = [];
    g.currentvars.currentActivities.sitRepAlertes = [];
    g.currentvars.currentFiltSum = {};

    defaultEpiRange = getEpiRange(g.timerangebuttons.default_btn.range_type, g.timerangebuttons.default_btn.range_param);
    g.currentvars.currentEpiDates.min_default = defaultEpiRange[0];
    g.currentvars.currentEpiDates.max_default = defaultEpiRange[1];
    g.currentvars.currentEpiDates.min = g.currentvars.currentEpiDates.min_default;
    g.currentvars.currentEpiDates.max = g.currentvars.currentEpiDates.max_default;
    g.currentvars.currentEpiDates.all = [];
    g.currentvars.currentEpiWeek = {};
    g.currentvars.currentEpiWeek.min = getEpiWeeks('timestamp', [g.currentvars.currentEpiDates.min])[0];
    g.currentvars.currentEpiWeek.max = getEpiWeeks('timestamp', [g.currentvars.currentEpiDates.max])[0];
    g.currentvars.currentTimeSeries = [];
    g.currentvars.currentPolyVars = {};
    g.currentvars.currentAnimation = {};
    g.currentvars.currentAnimation.playMode = 'stop'; //play/pause/stop
    g.currentvars.currentAnimation.currentEpiDate;
    g.currentvars.currentAnimation.maxLegendVal;
    g.currentvars.currentAnimation.currentEpiDate = g.currentvars.currentEpiDates.min;
}


/***************/
/****  MAP  ****/
/***************/

function componentToHex(c) {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function getHex(rgb) {
    const regExp = /\(([^)]+)\)/;
    let rgbSplit = regExp.exec(rgb)[1].split(', ');
    return rgbToHex(...rgbSplit.map(a => parseInt(a)));
}

function getCurrentPolyVars() {
    let currentValues = [];

    cf.epiDateDim.filterAll();
    if (g.currentvars.currentAnimation.playMode == 'play') {
        cf.epiDateDim.filterExact(g.currentvars.currentAnimation.currentEpiDate);
    } else if (sameDay(g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)) {
        cf.epiDateDim.filterExact(g.currentvars.currentEpiDates.min);
    }
    else { 
        cf.epiDateDim.filterRange([g.currentvars.currentEpiDates.min, getNextDay(g.currentvars.currentEpiDates.max)]);     
    };

    let oneSelected = false;
    if (g.currentvars.currentMapLyr == 'zone') {
        currentValues = cf.statsByZsGroup.top(Infinity);
        if (g.currentvars.currentZones.pcodes.length==1) oneSelected = true;
    }
    else if (g.currentvars.currentMapLyr == 'prov') {
        currentValues = cf.statsByProvGroup.top(Infinity);
        if (g.currentvars.currentProvs.pcodes.length==1) oneSelected = true;
    };

    g.currentvars.currentMinVal = 0;
    g.currentvars.currentMaxVal = 0;
    g.currentvars.currentTotals = {
        'cas': 0,
        'dec': 0,
        'let': 0
    };

    if (g.currentvars.currentAnimation.playMode == 'play') {
        
        g.currentvars.currentMaxVal = g.currentvars.currentAnimation.maxLegendVal;
        
        currentValues.forEach(currVal => {       
            if (isFeatureSelected(currVal.key, g.currentvars.currentMapLyr)) //if currVal.key (i.e. pcode) is currently selected
            {
                g.currentvars.currentTotals.cas += currVal.value.cas;
                g.currentvars.currentTotals.dec += currVal.value.dec;
                g.currentvars.currentTotals.let = (g.currentvars.currentTotals.cas != 0) ? g.currentvars.currentTotals.dec / g.currentvars.currentTotals.cas : 0;
            }
        })
    }
    else if (oneSelected) { // only 1 location selected

        currentValues.forEach(currVal => {  
            if (g.currentvars.currentMaxVal < currVal.value[g.currentvars.currentStat.abrv]) {
                g.currentvars.currentMaxVal = currVal.value[g.currentvars.currentStat.abrv]
            };
            if (isFeatureSelected(currVal.key, g.currentvars.currentMapLyr)) {//if currentValue[i].key (i.e. pcode) is currently selected 
                g.currentvars.currentTotals.cas += currVal.value.cas;
                g.currentvars.currentTotals.dec += currVal.value.dec;
                g.currentvars.currentTotals.let = (g.currentvars.currentTotals.cas != 0) ? g.currentvars.currentTotals.dec / g.currentvars.currentTotals.cas : 0;
            }        
        })
    } 
    else 
    {
        currentValues.forEach(currVal => {  
            if (isFeatureSelected(currVal.key, g.currentvars.currentMapLyr)) //if currentValue[i].key (i.e. pcode) is currently selected
            {
                if (g.currentvars.currentMaxVal < currVal.value[g.currentvars.currentStat.abrv])
                {
                    g.currentvars.currentMaxVal = currVal.value[g.currentvars.currentStat.abrv]
                };
                g.currentvars.currentTotals.cas += currVal.value.cas;
                g.currentvars.currentTotals.dec += currVal.value.dec;
                g.currentvars.currentTotals.let = (g.currentvars.currentTotals.cas != 0) ? g.currentvars.currentTotals.dec / g.currentvars.currentTotals.cas : 0;
            }
        })
    }

    let color = d3.scaleLinear().domain([0, g.currentvars.currentMaxVal])
        .interpolate(d3.interpolateHcl)
        .range([d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_min), d3.rgb(g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_max)]);

    let currentPolyVars = {};
    let currentColorScale = g.currentvars.currentStat.color_scale;

    currentValues.forEach(currVal => {  
        currentPolyVars[currVal.key] = {};
        currentPolyVars[currVal.key]['value'] = currVal.value[g.currentvars.currentStat.abrv];
        if (!(isFeatureSelected(currVal.key, g.currentvars.currentMapLyr))) {  
            currentPolyVars[currVal.key]['color'] = g.mapcolors.color_not_selected;
        } else if (currVal.value[g.currentvars.currentStat.abrv] == 0) {
            currentPolyVars[currVal.key]['color'] = g.mapcolors.color_scale[currentColorScale].color_zero;
        } else {
            currentPolyVars[currVal.key]['color'] = getHex(color(currVal.value[g.currentvars.currentStat.abrv]));
        }
    })

    g.currentvars.currentPolyVars = currentPolyVars;
    return currentPolyVars;
}


function isFeatureSelected(pcode, lyr) {
    let featureSelected = false;
    if (lyr=='prov') {
        if ((g.currentvars.currentProvs.pcodes.length==0) || (g.currentvars.currentProvs.pcodes.indexOf(pcode) != -1)) { 
            featureSelected = true;
        } 
    } else {
        if ((g.currentvars.currentZones.pcodes.length==0) || (g.currentvars.currentZones.pcodes.indexOf(pcode) != -1)) { 
            featureSelected = true;
        } 
    }
    return featureSelected;
}



function getMaxLegendVal() {
    let maxValue = 0;
    let values = [];

    g.currentvars.currentEpiDates.all.forEach(currEpiDate => {
        cf.epiDateDim.filterAll();
        cf.epiDateDim.filterExact(currEpiDate);
        
        if (g.currentvars.currentMapLyr == 'zone') {
            values = cf.statsByZsGroup.top(Infinity);
        } else if (g.currentvars.currentMapLyr == 'prov') {
            values = cf.statsByProvGroup.top(Infinity);
        };

        values.forEach(val => {
            if (val.key != '') {
                if (isFeatureSelected(val.key,g.currentvars.currentMapLyr)) { //only use features in current selection
                    if (maxValue < val.value[g.currentvars.currentStat.abrv]) {
                        maxValue = val.value[g.currentvars.currentStat.abrv]
                    };
                }
            }
        })

    })

    //filter dates from min to max+1 (+1 to include max date itself)
    cf.epiDateDim.filterRange([g.currentvars.currentEpiDates.min, parseInt(moment.unix(g.currentvars.currentEpiDates.max).add(1,'day').format('X')) ]);

    return maxValue;
}


function colorMap() {

    let features;
    let coco;

    currentMapData = getCurrentPolyVars();

    if (g.currentvars.currentMapLyr == 'zone') {
        features = geozs.features;
    }
    else if (g.currentvars.currentMapLyr == 'prov') {
        features = geoprov.features;
    };

    features.forEach(function(d, i) {
        try {
            coco = currentMapData[d.properties.pcode].color;
        }
        catch (e) {
            coco = g.mapcolors.color_not_selected;
        }
        d3.selectAll('.dashgeom' + d.properties.pcode) 
            .attr('fill', coco);
    });

    updateMapLegend(g.currentvars.currentMinVal, g.currentvars.currentMaxVal);
}



function colorSitRepMap(actPolys) {
   
    function makePatterns(polyActs) {

        let colorStripe = {
                alerte_alarme: '#db0000',
                alerte_focus: '#ffa500',
                alerte_suivi_actif: '#76D42C',
                alerte_ferme: '#969696',
                alerte_NA: '#5a5a5a'
            }

        let patternActs = Object.keys(polyActs).map(item => polyActs[item].sort());
        let patternSet  = new Set(patternActs.map(JSON.stringify));
        patternActs = Array.from(patternSet).map(JSON.parse);   
        let patterns = patternActs.map(a => ({name: 'diag_' + a.length + '_' + a.join('-'), acts: a}));

        for (let i=0; i<=patterns.length-1; i++) {

            let dim = (patterns[i]['acts'].length<=4)? 8 : 10;
            let trans = [0,4,2,6,8]

            var patternTemp = defs.append("pattern")    //draw diagonal stripe pattern for sitrep
                .attr('id', patterns[i].name)
                .attr('width', dim)
                .attr('height', dim)
                .attr('patternUnits', 'userSpaceOnUse')
                .attr('patternTransform', 'rotate(45)')

            let j=0;
            while (j <= patterns[i]['acts'].length-1) {
                patternTemp.append("rect")
                    .attr('width', 2)
                    .attr('height', dim)
                    .attr('transform', 'translate(' + trans[j] + ',0)')
                    .attr('fill', function() {return colorStripe[patterns[i]['acts'][j]]})
                j++;
            }
                
        }

    };


    let polyActs = {};
    if (g.currentvars.currentMapLyr == 'zone')
    {
        var features = geozs.features;

        polyActs = actPolys.reduce((obj, item) => {
            if (obj.hasOwnProperty(item['zs_pc'])) {
                if (obj[item['zs_pc']].indexOf(item['act_type'])==-1) {
                    obj[item['zs_pc']].push(item['act_type']) 
                }       
            } else {
                obj[item['zs_pc']] = [item['act_type']];
            } 
    
            return obj
        }, {})

    }
    else if (g.currentvars.currentMapLyr == 'prov')
    {
        var features = geoprov.features;

        polyActs = actPolys.reduce((obj, item) => {
            if (obj.hasOwnProperty(item['prov_pc'])) {
                if (obj[item['prov_pc']].indexOf(item['act_type'])==-1) {
                    obj[item['prov_pc']].push(item['act_type']) 
                }     
            } else {
                obj[item['prov_pc']] = [item['act_type']];
            } 
    
            return obj
        }, {})

    };

    makePatterns(polyActs);

    features.forEach(function(d, i)
    {
        //try
        if (polyActs.hasOwnProperty(d.properties.pcode))
        {
            let numStripes = polyActs[d.properties.pcode].length;
            let actString = polyActs[d.properties.pcode].join('-');
            let patternName = "url(#diag_" + numStripes + "_" + actString + ")";
            var coco = patternName;

        }
        //catch (e)
        else 
        {
            var coco = g.mapcolors.color_not_selected;
        }

        d3.selectAll('.dashgeom' + d.properties.pcode)
            .attr('fill', coco);
    });

    updateMapLegend(g.currentvars.currentMinVal, g.currentvars.currentMaxVal);
}



function formatNumber(num) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}


function updateMapInfo(zs_name='', zs_pcode='', prov_name='', prov_pcode='') {
    let val;

    if (g.currentvars.currentMapLyr == 'prov') {
        try {
            if ((g.currentvars.currentProvs.pcodes.length != 0) && (g.currentvars.currentProvs.pcodes.indexOf(prov_pcode) == -1)) {
                val = `Non séléctionné`;
            } else {
                if (g.currentvars.currentStat.abrv == 'cas') {
                    val = `Cas: ${formatNumber(currentMapData[prov_pcode].value.toFixed(0))}`;
                } else if (g.currentvars.currentStat.abrv == 'dec') {
                    val = `Décès: ${formatNumber(currentMapData[prov_pcode].value.toFixed(0))}`;
                } else if (g.currentvars.currentStat.abrv == 'let') {
                    val = `Létalité: ${formatNumber((currentMapData[prov_pcode].value*100).toFixed(2))}%`;
                };
            }
        } catch (e) {
            val = `<i>Indisponible</i>`;
        }
        infoUpdate = (prov_name && prov_pcode) ? `<h4> ${prov_name} </h4> ${val}` : `Survolez une région`;
    }
    else if (g.currentvars.currentMapLyr == 'zone') {
        try {
            if ((g.currentvars.currentZones.pcodes.length != 0) && (g.currentvars.currentZones.pcodes.indexOf(zs_pcode) == -1)) {
                val = `Non séléctionné`;
            } else {
                if (g.currentvars.currentStat.abrv == 'cas') {
                    val = `Cas: ${formatNumber(currentMapData[zs_pcode].value.toFixed(0))}`;
                } else if (g.currentvars.currentStat.abrv == 'dec') {
                    val = `Décès: ${formatNumber(currentMapData[zs_pcode].value.toFixed(0))}`;
                } else if (g.currentvars.currentStat.abrv == 'let') {
                    val = `Létalité: ${formatNumber((currentMapData[zs_pcode].value*100).toFixed(2))}%`;
                };
            };
        } catch (e) {
            val = `<i>Indisponible</i>`; 
        }
        infoUpdate = (zs_name && zs_pcode && prov_name) ? `<h4>${zs_name}, ${prov_name}</h4>${val}` : `Survolez une région`;
    }
    $('.mapinfo').html(infoUpdate);
};


function updateMapLegend(min, max)
{
    let id='#maplegend';
    if ((g.currentvars.currentStat.abrv == 'cas') || (g.currentvars.currentStat.abrv == 'dec'))
    {
        max = Math.max(1, max);
    }
    d3.select(".maplegend").select("svg").remove();

    //Create gradient for legend 
    const width = 200;
    const height = 50;

    function getTicks() {
        return (g.currentvars.currentStat.abrv == 'let') ? 3 : 
            (max == 1) ? 1 : 
            (max == 2) ? 2 : 
            (max == 3) ? 3 : 
            (max == 4) ? 4 : 
            (max >= 5000) ? 3 : 5;
    }
    var numTicks = getTicks();

    //SVG container
    var svg = d3.select(".maplegend")
        .append("svg")
        .attr("width", width + margin[id].shift_right + margin[id].left + margin[id].right)
        .attr("height", height + margin[id].top + margin[id].bottom)
        .append("g")
        .attr("transform", "translate(" + (margin[id].left + width / 2) + "," + (margin[id].top + height / 2) + ")");

    var colorScale = d3.scaleLinear()
        .domain([0, g.currentvars.currentMaxVal])
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
    for (let i = 0; i < numStops; i++) {
        tempPoint.push(i * tempRange[2] / (numStops - 1) + tempRange[0]);
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
        .attr("offset", function(d, i)
        {
            return tempScale(tempPoint[i]) / width;
        })
        .attr("stop-color", function(d, i)
        {
            return colorScale(tempPoint[i]);
        });

    //Draw legend...
    var legendWidth = width;

    //Color legend container
    var legendsvg = svg.append("g")
        .attr("class", "legendWrapper")
        .attr("transform", "translate(" + 0 + "," + 0 + ")");

    //Draw zero rectangle                          
    legendsvg.append("rect")
        .attr("x", -legendWidth / 2)
        .attr("y", 0)
        .attr("rx", 8 / 2)
        .attr("width", 20)
        .attr("height", 8)
        .style("fill", g.mapcolors.color_scale[g.currentvars.currentStat.color_scale].color_zero); 

    //Draw colour scale rectangle
    legendsvg.append("rect")
        .attr("class", "legendRect")
        .attr("x", margin[id].shift_right - legendWidth / 2)
        .attr("y", 0)
        .attr("rx", 8 / 2)
        .attr("width", legendWidth)
        .attr("height", 8)
        .style("fill", "url(#legend-vals)");

    let legendTitle = g.currentvars.currentStat.full;
    if (g.currentvars.currentAnimation.playMode=='play') legendTitle = legendTitle + " (par semaine)";
    //Append title
    legendsvg.append("text")
        .attr("class", "legend-title")
        .attr("x", -legendWidth / 2)
        .attr("y", -5)
        .style("text-anchor", "left")
        .text(legendTitle);

    //Set scale for x-axis
    var xScale = d3.scaleLinear()
        .range([-legendWidth / 2, legendWidth / 2])
        .domain([0, max]);

    //Define x-axis
    let xAxis = d3.axisBottom()
        //.orient("bottom")
        .ticks(numTicks)
        .tickFormat(function(d)
        {
            if (d == 0)
            {
                return '';
            }
            else
            {
                if ((g.currentvars.currentStat.abrv == 'cas') || (g.currentvars.currentStat.abrv == 'dec'))
                {
                    return formatNumber(d.toFixed(0));
                }
                else if (g.currentvars.currentStat.abrv == 'let')
                {
                    return formatNumber((d*100).toFixed(1))+'%';
                }
            }
        })
        .scale(xScale);

    //Set up x-axis
    legendsvg.append("g")
        .attr("class", "legend-axis")
        .attr("transform", "translate(" + margin[id].shift_right + "," + (5) + ")")
        .call(xAxis);

    //Append 0 tick
    legendsvg.append("text")
        .attr("class", "legend-axis")
        .attr("x", (-legendWidth + 14) / 2)
        .attr("y", 22)
        .style("text-anchor", "left")
        .text("0");

}



function createMap(id, data, ...responseTexts) {	

    currentMapData = getCurrentPolyVars();

    function style(feat, i)
    {
        try
        {
            var coco = currentMapData[feat.properties.pcode].color;
        }
        catch (e)
        {
            var coco = g.mapcolors.color_not_selected;
        }
        return {
            fillColor: coco,
            fillOpacity: 0.8,
            weight: 0.8,
            color: g.mapcolors.color_boundary,
            className: 'dashgeom dashgeom' + feat.properties.pcode
        }
    }

    function style_prov_bound(feat, i)
    { //polyline layer
        return {
            color: 'black', //g.mapcolors.color_boundary,
            weight: 2,
            opacity: 1
            //className: 'dashgeom boundgeom'+feat.properties.pcode
        }
    }

    function style_riv(feat, i)
    {
        return {
            fillOpacity: 0,
            weight: 1,
            color: g.mapcolors.color_rivers,
            className: 'dashgeom rivers'
        }
    }

    function style_lak(feat, i)
    {
        return {
            fillOpacity: 1,
            weight: 1,
            color: g.mapcolors.color_lakes,
            className: 'dashgeom lakes'
        }
    }

    function style_act(feat, i)
    {
        return {
            fillOpacity: 1,
            weight: 1,
            color: 'yellow',
            className: 'dashgeom acts'
        }
    }

    //var baselayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png',
    var baselayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        attribution: "<img class='logo' src='images/msf-logo.png'/>"
    });

    //console.log('PUBLISH_GITHUB? ', publish_github)
    map = L.map('map',
    {
        center: defaultMapCenter, 
        zoom: defaultZoomLevel, 
        minZoom: 2,
        maxZoom: 15,
        layers: [baselayer],
        zoomDelta: 0.5,
        zoomSnap: 0.25,
        contextmenu: true,
        contextmenuWidth: 220,
        contextmenuItems: [{
            text: 'Afficher les coordonnées',
            callback: showCoordinates
        }, {
            text: 'Centrer la carte ici',
            callback: centerMap
        }, '-', {
            text: 'Zoomer',
            icon: 'images/zoom_in.png',
            callback: zoomIn
        }, {
            text: 'Zoom arrière',
            icon: 'images/zoom_out.png',
            callback: zoomOut
        }, {
            text: 'Zoom sur tout le RDC',
            icon: 'images/drc.png',
            callback: fullExtent
        },/* {
            text: 'Dessiner une zone de zoom',
            icon: 'images/select_area.png',
            callback: toggleDrawZoom
        }, {
            text: 'Desactiver la dessine d\'une zone de zoom', 
            icon: 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjMDAwMDAwIiBoZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gICAgPHBhdGggZD0iTTAgMGgyNHYyNEgweiIgZmlsbD0ibm9uZSIvPiAgICA8cGF0aCBkPSJNMyA1djRoMlY1aDRWM0g1Yy0xLjEgMC0yIC45LTIgMnptMiAxMEgzdjRjMCAxLjEuOSAyIDIgMmg0di0ySDV2LTR6bTE0IDRoLTR2Mmg0YzEuMSAwIDItLjkgMi0ydi00aC0ydjR6bTAtMTZoLTR2Mmg0djRoMlY1YzAtMS4xLS45LTItMi0yeiIvPjwvc3ZnPg==',
            //callback: exitDrawZoom
            callback: toggleDrawZoom
        },*/ {
            text: 'Full screen', 
            //icon: '../images/fullscreen.png',  //for local server //check if also for github - below doesn't work
            //icon: 'images/fullscreen.png',
            icon: publish_github? 'images/fullscreen.png' : '../images/fullscreen.png',
            callback: fullScreen
        }, {
            text: 'Exit full screen', 
            //icon: '../images/exit_fullscreen.png',    //for local server  //check if also for github - below doesn't work
            //icon: 'images/exit_fullscreen.png',
            icon: publish_github? 'images/exit_fullscreen.png' : '../images/exit_fullscreen.png',
            callback: fullScreen
        }]
    });

    map.on('mouseover', function() {
        selectLocs.close();
        selectLocs.options.showDropdown = false;
    })
    map.on('mouseout', function() {
        selectLocs.options.showDropdown = true;
    })


    let idxFull, idxExit, idxDrawZoom, idxExitDrawZoom;
    function findFullScreen(item) {
      return item.text=='Full screen';
    }
    function findExitFullScreen(item) {
      return item.text=='Exit full screen';
    }
    idxFull = map.options.contextmenuItems.findIndex(findFullScreen);
    idxExit = map.options.contextmenuItems.findIndex(findExitFullScreen);
    map.contextmenu.removeItem(idxExit);

    var drawZoomBox = L.control.zoomBox({
        modal: true,
        title: "Dessiner une zone de zoom"
    })
    drawZoomBox.addTo(map);

    /*function findDrawZoom(item) {
      return item.text=='Dessiner une zone de zoom';
    }
    function findExitDrawZoom(item) {
      return item.text=='Desactiver la dessine d\'une zone de zoom';
    }
    idxDrawZoom = map.options.contextmenuItems.findIndex(findDrawZoom);
    idxExitDrawZoom = map.options.contextmenuItems.findIndex(findExitDrawZoom);
    console.log('index of draw zoom element, exit draw zoom element: ', idxDrawZoom, idxExitDrawZoom)
    map.contextmenu.removeItem(idxExitDrawZoom);
   */


    var extentDefault = L.control.defaultExtent({
            title: 'Zoom sur tout le RDC'
    })
    extentDefault.addTo(map);

    map.addControl(new L.Control.Fullscreen());

    function showCoordinates (e) {
        alert(e.latlng);
    }

    function centerMap (e) {
        map.panTo(e.latlng);
    }

    function zoomIn (e) {
        map.zoomIn();
    }

    function zoomOut (e) {
        map.zoomOut();
    }

    function fullExtent(e) {      
        extentDefault._zoomToDefault();
    }

    /*function toggleDrawZoom (e) {
        if (!(drawZoomBox._active)) {
            drawZoomBox._active = true;
            drawZoomBox.activate();
            
            map.contextmenu.insertItem({           
                text: 'Desactiver la dessine d\'une zone de zoom', 
                icon: 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjMDAwMDAwIiBoZWlnaHQ9IjI0IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gICAgPHBhdGggZD0iTTAgMGgyNHYyNEgweiIgZmlsbD0ibm9uZSIvPiAgICA8cGF0aCBkPSJNMyA1djRoMlY1aDRWM0g1Yy0xLjEgMC0yIC45LTIgMnptMiAxMEgzdjRjMCAxLjEuOSAyIDIgMmg0di0ySDV2LTR6bTE0IDRoLTR2Mmg0YzEuMSAwIDItLjkgMi0ydi00aC0ydjR6bTAtMTZoLTR2Mmg0djRoMlY1YzAtMS4xLS45LTItMi0yeiIvPjwvc3ZnPg==',
                //callback: exitDrawZoom
                callback: toggleDrawZoom
            }, idxExitDrawZoom);
            map.contextmenu.removeItem(idxDrawZoom);

        } else if (drawZoomBox._active) {
            drawZoomBox._active = false;
            drawZoomBox.deactivate();
          
            map.contextmenu.insertItem({
                text: 'Dessiner une zone de zoom',
                icon: 'images/select_area.png',
                callback: toggleDrawZoom
            }, idxDrawZoom);
            map.contextmenu.removeItem(idxExitDrawZoom);
        }
    }*/



    function fullScreen (e) {
        map.toggleFullscreen();
    }

    map.on('fullscreenchange', function () {
        
        if (map.isFullscreen()) {
            map.contextmenu.removeItem(idxFull);
            map.contextmenu.insertItem({
                text: 'Exit full screen', 
                icon: '../images/exit_fullscreen.png',
                callback: fullScreen
            }, idxExit);
        } else {
            map.contextmenu.removeItem(idxExit-1);
            map.contextmenu.insertItem({
                text: 'Full screen', 
                icon: '../images/fullscreen.png',
                callback: fullScreen
            }, idxFull);
        }
    });


    printer = L.easyPrint({
            tileLayer: baselayer,
            tileWait: 5000,
            sizeModes: ['A4Landscape'], 
            exportOnly: true,
            customSpinnerClass: 'epLoader',
            hideControlContainer: false, //hides specified classes
            hidden: true,
            hideClasses: ['leaflet-left', 'mapinfo'],
        }).addTo(map);


    responseTexts.forEach(function(rT, i) {
        try
        {
            topoob = JSON.parse(rT);
            this[GISLayers[i].varname] = topojson.feature(topoob, topoob.objects[GISLayers[i].fname])
            if (GISLayers[i].highlight) {
                this[GISLayers[i].gjname] = L.geoJson(this[GISLayers[i].varname],
                {
                    style: eval(GISLayers[i].stylename),
                    onEachFeature: onEachFeature
                });
            } else {
                this[GISLayers[i].gjname] = L.geoJson(this[GISLayers[i].varname],
                {
                    style: eval(GISLayers[i].stylename)
                });
            }
            if (GISLayers[i].onload) {
                this[GISLayers[i].gjname].addTo(map);
            }
            
        }
        catch (e)
        {
            this[GISLayers[i].gjname] = {};
            console.log(e)
        }

    });

    GISLayers.forEach(function(lyr,i) {
        if (lyr.bringToFront) {
            this[GISLayers[i].gjname].bringToFront();
        }
    })
    

    map.addLayer(markerClusters);   //NOTE: will need to amend to add data incrememntally
    d3.json(geojsonClusterPath).then(function(data, error) { //d3.js v5
            if (!error)
            {
                geoacts = data
                let gfl = geoacts.features.length - 1
                for (let i = 0; i <= gfl; i++)
                {
                    for (let prop in geoacts.features[i].properties)
                    {
                        if (prop.substring(0, 5) == 'date_')
                        {
                            let newDate = moment(geoacts.features[i].properties[prop], 'MM/DD/YY').toDate();
                            geoacts.features[i].properties[prop] = newDate;
                        }
                    }
                }

                markers = L.geoJson(geoacts,
                {
                    pointToLayer: defineMarkerFeature, //defines class & icon
                    onEachFeature: defineMarkerFeaturePopup //defines popup html
                });
                markerClusters.addLayer(markers);
            }
            else
            {
                console.error('Could not load activity clusters data...'); 
            }
        })
        .catch(function(error)
        {
            console.log('There has been a problem loading activity clusters data: ', error.message);
        });



    var mapInfo = L.control(
    {
        position: 'topright'
    });
    mapInfo.onAdd = function(map)
    {
        var infoDiv = L.DomUtil.create('infoDiv', 'mapinfo');
        return infoDiv;
    }
    mapInfo.addTo(map);


    var mapLegend = L.control(
    {
        position: 'bottomleft'
    });
    mapLegend.onAdd = function(map)
    {
        svg = L.DomUtil.create('svg', 'maplegend');
        return svg;
    };
    mapLegend.addTo(map);


    function highlightFeature(e)
    {
        var layer = e.target;
        try
        {
            var coco = currentMapData[layer.feature.properties.pcode].color;
        }
        catch (e)
        {
            var coco = g.mapcolors.color_not_selected;
        }
        layer.setStyle(
        {
            weight: 5, //boundary weight
            //opacity: 1,		//boundary opacity
            color: '#665', //boundary color 
            dashArray: '', //boundary - length of dashes
            fillColor: coco, //polygon fill color
            fillOpacity: 0.8 //polygon fill opacity
        })
        /*if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }*/
        if (g.currentvars.currentMapLyr == 'prov')
        {
            updateMapInfo('', '', layer.feature.properties.name, layer.feature.properties.pcode);
        }
        else if (g.currentvars.currentMapLyr == 'zone')
        {
            updateMapInfo(layer.feature.properties.name, layer.feature.properties.pcode, layer.feature.properties.lvl3_name, '');
        }
    }

    function resetHighlight(e)
    {
        var layer = e.target;
        try
        {
            var coco = currentMapData[layer.feature.properties.pcode].color;
        }
        catch (e)
        {
            var coco = g.mapcolors.color_not_selected;
        }

        layer.setStyle(
        {
            weight: 0.8, //boundary weight
            //opacity: 1,			//boundary opacity
            color: g.mapcolors.color_boundary, //'#665',   	//boundary color
            fillColor: coco, //polygon fill color
            fillOpacity: 0.8 //polygon fill opacity
        })
        updateMapInfo();
    }


    function zoomToFeature(e)
    {
        map.fitBounds(e.target.getBounds());
    }


    function selectFeature(e)
    {
        var mapClicked, pcode, isShift;

        if (e.hasOwnProperty('originalEvent')) {       
            mapClicked = true;
            pcode = e.target.feature.properties.pcode;
            isShift = e.originalEvent.shiftKey ? true : false;
        } else {
            mapClicked = false;
            pcode = e.target._leaflet_id;
            isShift = ''
        }

        if (g.currentvars.currentAnimation.playMode == 'stop') {
            
            if (g.currentvars.currentMapLyr == 'zone') {

                if ((mapClicked && isShift) || (!mapClicked)) {  //additive selection on map || in final select list

                    if (g.currentvars.currentZones.pcodes.indexOf(pcode) == -1) { //if not selected in map
                        
                        if (!mapClicked) {  //temporary highlight if selected in dropdown
                            d3.selectAll('.dashgeom' + pcode) 
                                .attr('fill', 'yellow');
                        }
                        g.currentvars.currentZones.pcodes.push(pcode);
                        g.currentvars.currentZones.names.push(getName('zone', pcode));
                        cf.zsDim.filterFunction(function(d) {
                            return (g.currentvars.currentZones.pcodes.indexOf(d) != -1);
                        });
                        selectLocs.add(pcode);
                    } else { //if already selected them remove it
                        g.currentvars.currentZones.pcodes.splice(g.currentvars.currentZones.pcodes.indexOf(pcode), 1); //find pcode and remove it
                        g.currentvars.currentZones.names.splice(g.currentvars.currentZones.names.indexOf(getName('zone', pcode)), 1);
                        if (g.currentvars.currentZones.pcodes.length == 0) { //if it had been the only zone
                            cf.zsDim.filterAll();
                        } else {
                            cf.zsDim.filterFunction(function(d) {
                                return (g.currentvars.currentZones.pcodes.indexOf(d) != -1);
                            });
                        }
                        selectLocs.remove(pcode);
                    };
                } else if (mapClicked && !isShift) {  //singluar selection on map

                    if ((g.currentvars.currentZones.pcodes.indexOf(pcode) == -1) || ((g.currentvars.currentZones.pcodes.indexOf(pcode) != -1) && (g.currentvars.currentZones.pcodes.length>1))) { //if not selected in map or is already selected but not the only one, then select only this one
                        g.currentvars.currentZones.pcodes = [pcode];
                        g.currentvars.currentZones.names = [getName('zone', pcode)];
                        cf.zsDim.filterFunction(function(d) {
                            return (g.currentvars.currentZones.pcodes.indexOf(d) != -1);
                        });
                        selectLocs.clear();
                        selectLocs.add(pcode);
                    } else { //if its the only one selected then remove it - i.e. none are then selected
                        g.currentvars.currentZones.pcodes = [];
                        g.currentvars.currentZones.names = [];
                        cf.zsDim.filterAll();
                        selectLocs.remove(pcode);
                    };

                }

            } else if (g.currentvars.currentMapLyr == 'prov') {

                if ((mapClicked && isShift) || (!mapClicked)) {  //additive selection on map || in final select list

                    if (g.currentvars.currentProvs.pcodes.indexOf(pcode) == -1)  { //if not currently selected then add it
                        
                        if (!mapClicked) {   //temporary highlight if selected in dropdown
                            d3.selectAll('.dashgeom' + pcode) 
                                .attr('fill', 'yellow');
                        }
                        g.currentvars.currentProvs.pcodes.push(pcode);
                        g.currentvars.currentProvs.names.push(getName('prov', pcode));
                        cf.provDim.filterFunction(function(d)
                        {
                            return (g.currentvars.currentProvs.pcodes.indexOf(d) != -1);
                        });
                        selectLocs.add(pcode);
                    }
                    else { //if already selected then remove it
                        g.currentvars.currentProvs.pcodes.splice(g.currentvars.currentProvs.pcodes.indexOf(pcode), 1); //find pcode and remove it
                        g.currentvars.currentProvs.names.splice(g.currentvars.currentProvs.names.indexOf(getName('prov', pcode)), 1);
                        if (g.currentvars.currentProvs.pcodes.length == 0) { //if it had been the only province
                            cf.provDim.filterAll();
                        }
                        else {  //if there are other provs still selected
                            cf.provDim.filterFunction(function(d) {
                                return (g.currentvars.currentProvs.pcodes.indexOf(d) != -1);
                            });
                        }
                        selectLocs.remove(pcode);
                    };

                } else if (mapClicked && !isShift) {  //singluar selection on map

                    if ((g.currentvars.currentProvs.pcodes.indexOf(pcode) == -1) || ((g.currentvars.currentProvs.pcodes.indexOf(pcode) != -1) && (g.currentvars.currentProvs.pcodes.length>1))) {  //if not selected in map or is already selected but not the only one, then select only this one
                        g.currentvars.currentProvs.pcodes = [pcode];
                        g.currentvars.currentProvs.names = [getName('prov', pcode)];
                        cf.provDim.filterFunction(function(d) {
                            return (g.currentvars.currentProvs.pcodes.indexOf(d) != -1);
                        });
                        selectLocs.clear();
                        selectLocs.add(pcode);
                    } else { //if its the only one selected then remove it - i.e. none are then selected
                        g.currentvars.currentProvs.pcodes = [];
                        g.currentvars.currentProvs.names = [];
                        cf.provDim.filterAll();
                        selectLocs.remove(pcode);
                    };

                } 
            };

            dbUpdateTimeSeriesCharts();  //debounced fn

        }
        
    }
    var dbUpdateTimeSeriesCharts = debounce(function() {
      updateTimeSeriesCharts(); 
    }, 100);


    function onEachFeature(feature, layer)
    {
        layer.on(
        {
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: selectFeature,
            dblclick: zoomToFeature
        })
        layer._leaflet_id = feature.properties.pcode; 

    }

    return map;
}


function updateActivityClusters() {
    markerClusters.clearLayers();
    markers = L.geoJson(geoacts,
    {
        pointToLayer: defineMarkerFeature, //defines class & icon
        onEachFeature: defineMarkerFeaturePopup //defines popup html
    });
    markerClusters.addLayer(markers);

    g.currentvars.currentActivities.currentList = [];
    Object.keys(markers._layers).forEach(function(key) {
        g.currentvars.currentActivities.currentList.push({
            prov: markers._layers[key].feature.properties.prov, 
            zs: markers._layers[key].feature.properties.zs, 
            act_type: markers._layers[key].feature.properties.act_type, 
            code: markers._layers[key].feature.properties.code_alt || markers._layers[key].feature.properties.code_eval || 'Code indisponible', 
            path: markers._layers[key].feature.properties.path,
            date_deb: markers._layers[key].feature.properties.date_deb,
            date_fin: markers._layers[key].feature.properties.date_fin
        })
    });
}


function updateSitRepActivities(callback) {
    markerClusters.clearLayers();
    markers = L.geoJson(geoacts,
    {
        pointToLayer: defineSitRepMarkerFeature, //defines class & icon
        //onEachFeature: defineMarkerFeaturePopup //defines popup html
    });
    //markerClusters.addLayer(markers);  //add clusters to sitrep map for export

    g.currentvars.currentActivities.sitRepAlertes = [];
    Object.keys(markers._layers).forEach(function(key) {
        g.currentvars.currentActivities.sitRepAlertes.push({
            prov: markers._layers[key].feature.properties.prov, 
            zs: markers._layers[key].feature.properties.zs, 
            act_type: markers._layers[key].feature.properties.act_type, 
            code: markers._layers[key].feature.properties.code_alt || markers._layers[key].feature.properties.code_eval || 'Code indisponible', 
            path: markers._layers[key].feature.properties.path, 
            date_deb: markers._layers[key].feature.properties.date_deb, 
            date_fin: markers._layers[key].feature.properties.date_fin
        })
    })

    let actPolys = []
    Object.keys(markers._layers).forEach(function(key) {
        actPolys.push({prov_pc: markers._layers[key].feature.properties.prov_pc, zs_pc: markers._layers[key].feature.properties.zs_pc, act_type: markers._layers[key].feature.properties.act_type})
    });
    
    callback(actPolys);
}


//when user selects location in selectivity dropdown, click it to select on map
function selectMapItems(itemIds) {   
    var layersToAdd = [],       //lyrs in select item list but not on map
        layersToRemove = [],    //lyrs on map but not in select list
        layersToToggle = [];

    if (g.currentvars.currentMapLyr=='prov') {
        layersToAdd = itemIds.filter(item => !g.currentvars.currentProvs.pcodes.includes(item));
        layersToRemove = g.currentvars.currentProvs.pcodes.filter(item => !itemIds.includes(item));
    } else if (g.currentvars.currentMapLyr=='zone') {
        layersToAdd = itemIds.filter(item => !g.currentvars.currentZones.pcodes.includes(item));
        layersToRemove = g.currentvars.currentZones.pcodes.filter(item => !itemIds.includes(item));
    }     
    layersToToggle = layersToAdd.concat(layersToRemove);
    
    for (var lyr in layersToToggle) {
        if (g.currentvars.currentMapLyr=='prov') {
            var lyrItem = geojson_prov.getLayer(layersToToggle[lyr]);  
            lyrItem.fireEvent('click');  //fire click event on target layer 
        } else if (g.currentvars.currentMapLyr=='zone') {
            var lyrItem = geojson_zone.getLayer(layersToToggle[lyr]);  
            lyrItem.fireEvent('click');  //fire click event on target layer 
        }
    }

}


function btn_rivers() {
    if ($('#btnRiv').hasClass('on')) { //turn rivers off
        map.removeLayer(geojson_riv);
        $('#btnRiv').removeClass('on');
    } else { //turn rivers on
        geojson_riv.addTo(map);
        geojson_riv.bringToFront();
        $('#btnRiv').addClass('on');
    }
};


function filterByZonePcode(geoname) {
    return (g.currentvars.currentZones.pcodes.indexOf(geoname['zs_pcode']) != -1) ? true : false;
}

function filterByProvPcode(geoname){
    return (g.currentvars.currentProvs.pcodes.indexOf(geoname['prov_pcode']) != -1) ? true : false;
}

function unique(arr) {
    return arr.filter(function(item,pos) {
        return arr.indexOf(item)==pos;
    })
}

function btn_change_lyr(lyr) {

    if ((lyr == 'prov') && ($('#btnZone').hasClass('on'))) { //switch from zone to province
        $('#btnZone').removeClass('on');
        $('#btnProv').addClass('on');
        g.currentvars.currentMapLyr = 'prov';

        //derive provs from selected zones
        let result = getLocTreeNames(geonames.filter(filterByZonePcode))[0];
        g.currentvars.currentProvs.pcodes = unique(result.map(a => a.id));
        g.currentvars.currentProvs.names = unique(result.map(a => a.text));
        
        //deal with select feature dropdown
        selectLocs.close();
        selectLocs.clear();
        g.currentvars.currentZones.pcodes = []; //reset zone selection to null
        g.currentvars.currentZones.names = []
        selectLocs.items = selectProvs;
        
        //deal with map display
        map.removeLayer(geojson_zone);
        map.removeLayer(geojson_prov_bound);
        geojson_prov.addTo(map);
        geojson_prov.bringToBack();

        //remove zone filter
        cf.zsDim.filterAll();

        //add derived provs to select feature dropdown (this selects them in map) 
        g.currentvars.currentProvs.pcodes.map((val) => {
          return selectLocs.add(val);
        });

        //filter data to derived provs only
        if (g.currentvars.currentProvs.pcodes.length != 0 ) {
            cf.provDim.filterFunction(function(d) {return (g.currentvars.currentProvs.pcodes.indexOf(d) != -1)});
        }
    
    }
    else if ((lyr == 'zone') && ($('#btnProv').hasClass('on'))) { //switch from province to zone
        $('#btnProv').removeClass('on');
        $('#btnZone').addClass('on');
        g.currentvars.currentMapLyr = 'zone';

        //derive all zones from selected provs
        let result = getLocTreeNames(geonames.filter(filterByProvPcode))[1];
        g.currentvars.currentZones.pcodes = result.map(a => (a.children.map(b => (b.id)))).flat();
        g.currentvars.currentZones.names = result.map(a => (a.children.map(b => (b.text)))).flat();
        
        //deal with select feature dropdown
        selectLocs.close();
        selectLocs.clear();
        g.currentvars.currentProvs.pcodes = []; //reset prov selection to null
        g.currentvars.currentProvs.names = [];
        selectLocs.items = selectZones;

        //deal with map display
        map.removeLayer(geojson_prov);
        geojson_zone.addTo(map);
        geojson_zone.bringToBack();
        geojson_prov_bound.addTo(map);
        geojson_prov_bound.bringToFront();
  
        //remove prov filter
        cf.provDim.filterAll();

        //add derived zones to select feature dropdown (this selects them in map) 
        g.currentvars.currentZones.pcodes.map((val) => {
          return selectLocs.add(val);
        });

        //filter data to derived zones only
        if (g.currentvars.currentZones.pcodes.length != 0 ) {
            cf.zsDim.filterFunction(function(d) { return (g.currentvars.currentZones.pcodes.indexOf(d) != -1) });
        };
        
    }
    updateTimeSeriesCharts();
}


function uniqueByKey(array, keyName) {
   return array.filter((e, i) => array.findIndex(a => a[keyName] === e[keyName]) === i);
}


//input array of location objects ({zs, zs_pcode, prov, prov_pcode})
//output array of prov objects, and array of prov objects with zs children
function getLocTreeNames(locs) {
    //console.log('in getLocTreeNames: ', locs)

    const treeProvs = uniqueByKey(locs.map(loc => ({ id: loc.prov_pcode, text: loc.prov })), 'id')
        .sort(function(a, b)
        {
            if (a.text < b.text ){ return -1; }
            if (a.text > b.text) { return 1; }
            return 0;
        });

    let tempProvs = treeProvs.reduce((obj, item) => (obj[item.id] = {'text': item.text,'temp':[], 'children': []}, obj) ,{});
    locs.forEach(function(loc) {
        if (tempProvs[loc['prov_pcode']]['temp'].indexOf(loc['zs_pcode'])==-1) {
            tempProvs[loc['prov_pcode']]['temp'].push(loc['zs_pcode']);
            tempProvs[loc['prov_pcode']]['children'].push({id: loc['zs_pcode'], text: loc['zs']});
        }
    });

    const treeZones = [];
    Object.keys(tempProvs).forEach(function(key) {
      let childArray = tempProvs[key]['children'].sort(function(a, b)
        {
            if (a.text < b.text) { return -1; }
            if (a.text > b.text) { return 1; }
            return 0;
        });
      treeZones.push({text: tempProvs[key]['text'], children: childArray})
    });

    //console.log('treeProvs: ', treeProvs);
    //console.log('treeZones: ', treeZones);
    return [treeProvs, treeZones];  
}


//Select locations via dropdown
var selectLocs = new Selectivity.Inputs.Multiple({
    allowClear: false,
    element: document.querySelector('#btnSelect'),
    items: [], //selectProvs, 
    multiple: true,
    closeOnSelect: false,
    placeholder: 'Sélectionnez région(s)',
    triggerChange: true,
    showDropdown: true
});



function debounce(func, wait, immediate) {
  var timeout;
  return function executedFunction() {
    var context = this;
    var args = arguments;
        
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    var callNow = immediate && !timeout;    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(context, args);
  };
};



var dbSelectMapItems = debounce(function() {
      selectMapItems(selectLocs._value)
    }, 250);

$('#btnSelect').on('change', function(e) { 
    dbSelectMapItems();   
});

let shiftOn = false;
function checkShift(e) {
    if (e.keyCode==16) shiftOn==false? shiftOn=true : shiftOn=false;
}

$('#btnSelect').on('selectivity-open', function(e) {
        document.addEventListener('keydown', checkShift);
        document.addEventListener('keyup', checkShift);
})
$('#btnSelect').on('selectivity-close', function(e) {
    document.removeEventListener('keydown', checkShift)
    document.removeEventListener('keyup', checkShift)
})

$('#btnSelect').on('selectivity-selecting', function(e) {
    if (!(shiftOn)) {
        selectLocs.clear();  
    } 
});



function getName(lyr, pcode) {
    if (lyr == 'prov') {
        let found = geonames.find(function(loc) {
            return loc.prov_pcode == pcode;
        });
        return found.prov;
    } else { 
        let found = geonames.find(function(loc) {
            return loc.zs_pcode == pcode;
        });
        return found.zs + ', ' + found.prov;
    }
}


function setDefaultMapZoom() {
    map.setView(defaultMapCenter, defaultZoomLevel, {
        animation: true
    });
}

let throttledUpdateMap = throttle(updateMap, 500);



/*******************************/
/****  CREATE OTHER CHARTS  ****/
/*******************************/

function updateCurrentTimeSeriesData(){

    statsInTime = cf.statsByEpiDateGroup.top(Infinity);

    //add all epidate stats from data
    let timeSeries = statsInTime.map(a => ({
        'timestamp': a.key,
        'key': moment.unix(a.key).toDate(),
        'value': a.value
    }));

    //add epidate stats for weeks without data (to 'complete' timeSeries)? 
    //Note: not necessary, might imply that there are stats which are zero for those weeks as opposed to no data
    /*for (let i = 0; i <= g.epitime.all.length - 1; i++) {
        if ((datesInSeries.indexOf(g.epitime.all[i].epiTimestamp)) == -1) {
            timeSeries.push({
                'timestamp': g.epitime.all[i].epiTimestamp,
                'key': moment.unix(g.epitime.all[i].epiTimestamp).toDate(),
                'value': {
                    cas: 0,
                    dec: 0,
                    let: 0
                }
            });
            datesInSeries.push(g.epitime.all[i].epiTimestamp);
        }
    }*/

    //sort into date order (necessary because letline drawn in series order)
    timeSeries.sort(function(a, b){
        return b.key - a.key;
    });
    g.currentvars.currentTimeSeries = timeSeries;
}


function createTimeSeriesCharts() {
    const id1 = '#timeseries';
    const id2 = '#timeseriesbrush';
    updateCurrentTimeSeriesData();
    let time_data = g.currentvars.currentTimeSeries;

    const width = $(id1).width() - margin[id1].left - margin[id1].right, //width of main svg
        width2 = $(id2).width() - margin[id2].left - margin[id2].right,
        height = $(id1).height() - margin[id1].top - margin[id1].bottom, //height of main svg
        height2 = $(id2).height() - margin[id2].top - margin[id2].bottom;

    //Render main SVGs
    svg1 = d3.select(id1)
        .append("svg")
        .attr("width", width + margin[id1].left + margin[id1].right)
        .attr("height", height + margin[id1].top + margin[id1].bottom);

    svg2 = d3.select(id2)
        .append("svg")
        .attr("width", width2 + margin[id2].left + margin[id2].right)
        .attr("height", height2 + margin[id2].top + margin[id2].bottom);

    var x = d3.scaleTime().range([0, width]), //x-axis width, accounting for specified margins
        x2 = d3.scaleTime().range([0, width2]),
        y = d3.scaleLinear().range([height, 0]),
        y2 = d3.scaleLinear().range([height2, 0]),
        ylet = d3.scaleLinear().range([height, 0]),
        ylet2 = d3.scaleLinear().range([height2, 0]);

    let xAxis = d3.axisBottom(x),
        xAxis2 = d3.axisBottom(x2),
        yAxis = d3.axisLeft(y).ticks(5).tickFormat(function(d) {
            return formatNumber(d.toFixed(0));
        }),
        yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) {
            if (d3.max(g.currentvars.currentTimeSeries, function(d) { return d.value.let; }) <= 0.003) {
                return formatNumber((d*100).toFixed(2))+'%';
            }
            else {
                return formatNumber((d*100).toFixed(1))+'%';
            }
        });


    svg1.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    var focus = svg1.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin[id1].left + "," + margin[id1].top + ")");

    var context = svg2.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin[id2].left + "," + margin[id2].top + ")");

    x.domain([moment(g.epitime.date_extent[0]*1000).toDate(), moment(g.epitime.date_extent[1]*1000).add(7, 'days').toDate()]);
    
    y.domain([0, d3.max(time_data, function(d) {
        return d.value.cas;
    })]);
    ylet.domain([0, d3.max(time_data, function(d) {
        return d.value.let;
    })]);
    x2.domain(x.domain());
    y2.domain(y.domain());
    ylet2.domain(ylet.domain());

    let orig_bar_width = (width / time_data.length);
    let bar_width = (width / time_data.length) - getBarSpacing(width / time_data.length); //changing bar width only for focus chart
    
    g.currentvars.currentEpiDates.bar_width = bar_width;
    g.currentvars.currentEpiDates.bar_width_x2 = orig_bar_width;
    g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
    g.currentvars.currentEpiDates.tick_freq_x2 = getTickFrequencyX2(orig_bar_width);

    focus.selectAll(".bar")
        .data(time_data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("clip-path", "url(#clip)")
        .attr("x", function(d) {
            return x(d.key);
        })
        .attr("y", function(d) {
            return y(d.value.cas);
        })
        .attr("width", bar_width)
        .attr("height", function(d) {
            return height - y(d.value.cas);
        });

    focus.selectAll(".bar_overlay")
        .data(time_data)
        .enter().append("rect")
        .attr("class", "bar_overlay")
        .attr("clip-path", "url(#clip)")
        .attr("x", function(d) {
            return x(d.key);
        })
        .attr("y", function(d) {
            return 0;
        })
        .attr("width", bar_width)
        .attr("height", function(d) {
            return height;
        });

    focus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    focus.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);


    var valueline = d3.line()
        .x(function(d) { //add 3.5days here so data point drawn in middle of epiweek bar
            var newdate = new Date(d.key);
            let newdatems = newdate.getTime()+(3.5*24*60*1000)
            return x(newdatems)
        })
        .y(function(d) {
            return ylet(d.value.let);
        });

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
        .attr("x", function(d) {
            return x2(d.key);
        })
        .attr("y", function(d) {
            return y2(d.value.cas);
        })
        .attr("width", orig_bar_width)
        .attr("height", function(d) {
            return height2 - y2(d.value.cas);
        });

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
        .attr("transform", "translate(-55," + (87) + ") rotate(-90)")
        .text(" ");
    focus
        .append("text")
        .attr("class", "ylet-axis-title")
        .attr("transform", "translate(" + (width + 55) + "," + (66) + ") rotate(-90)")
        .text(" ");

    //Render vertical line overlapping current bar in play mode
    svg1.append("line")
        .attr("class", "playBar_line");

}


function getTickFrequency(bar_width) {
    return (bar_width < 0.23) ? 520 : 
        (bar_width < 0.35) ? 312 : 
        (bar_width < 0.41) ? 264 : 
        (bar_width < 0.5) ? 208 : 
        (bar_width < 1) ? 104 : 
        (bar_width < 2) ? 52 : 
        (bar_width < 3) ? 26 : 
        (bar_width < 5) ? 16 : 
        (bar_width < 9) ? 12 : 
        (bar_width < 12) ? 8 : 
        (bar_width < 17) ? 6 :
        (bar_width < 22) ? 4 :
        (bar_width < 32) ? 3 :
        (bar_width < 55) ? 2 : 1;
}


function getTickFrequencyX2(bar_width) {
    return (bar_width < 0.12) ? 120 : 
        (bar_width < 0.3) ? 60 : 
        (bar_width < 0.4) ? 48 : 
        (bar_width < 0.5) ? 24 : 
        (bar_width < 1.2) ? 12 : 
        (bar_width < 3) ? 6 : 
        (bar_width < 4.5) ? 4 : 
        (bar_width < 7) ? 3 : 
        (bar_width < 9) ? 2 : 1;
};


function getNumYTicks(ydomainmax) {
    return (ydomainmax < 2) ? 1 :
        (ydomainmax < 3) ? 2 :
        (ydomainmax < 4) ? 3 : 5;
};


function getBarSpacing(bar_width) {
    return (bar_width < 1)? 0 : (bar_width/100)+0.1;
}


function updateTimeSeriesCharts() {
    const id1 = '#timeseries';
    const id2 = '#timeseriesbrush';

    updateCurrentTimeSeriesData(); 
    let time_data = g.currentvars.currentTimeSeries;

    const width = $(id1).width() - margin[id1].left - margin[id1].right, //width of main svg
        width2 = $(id2).width() - margin[id2].left - margin[id2].right,
        height = $(id1).height() - margin[id1].top - margin[id1].bottom, //height of main svg
        height2 = $(id2).height() - margin[id2].top - margin[id2].bottom;

    //Resize main SVGs
    svg1.attr("width", width + margin[id1].left + margin[id1].right)
        .attr("height", height + margin[id1].top + margin[id1].bottom);

    svg2.attr("width", width2 + margin[id2].left + margin[id2].right)
        .attr("height", height2 + margin[id2].top + margin[id2].bottom);

    svg1.select("defs").select("clipPath").select("rect")
        .attr("width", width)
        .attr("height", height);

    //set ranges
    const x = d3.scaleTime().range([0, width]);    //x-axis width, accounting for specified margins
        x2 = d3.scaleTime().range([0, width2]),
        y = d3.scaleLinear().range([height, 0]),
        y2 = d3.scaleLinear().range([height2, 0]),
        ylet = d3.scaleLinear().range([height, 0]),
        ylet2 = d3.scaleLinear().range([height2, 0]);

    //set domains
    x.domain([moment(g.epitime.date_extent[0]*1000).toDate(), moment(g.epitime.date_extent[1]*1000).add(7, 'days').toDate()]);

    y.domain([0, d3.max(time_data, function(d) {
        return d.value.cas;
    })]);
    ylet.domain([0, d3.max(time_data, function(d) {
        return d.value.let;
    })]);
    x2.domain([moment(g.epitime.date_extent[0]*1000).toDate(), moment(g.epitime.date_extent[1]*1000).add(7, 'days').toDate()]); 
    y2.domain(y.domain());
    ylet2.domain(ylet.domain());

    //get width of each bar
    let orig_bar_width = (width / time_data.length);
    let bar_width = (width / time_data.length) - getBarSpacing(width / time_data.length);  
    if (bar_width<0) {console.log('!Warning: bar_width = ', bar_width)}
    g.currentvars.currentEpiDates.bar_width = bar_width;
    g.currentvars.currentEpiDates.bar_width_x2 = orig_bar_width;
    g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
    g.currentvars.currentEpiDates.tick_freq_x2 = getTickFrequencyX2(orig_bar_width);


    //FIX TICK ALIGNMENT HERE
    const xAxis = d3.axisBottom(x),
        xAxis2 = d3.axisBottom(x2),
        yAxis = d3.axisLeft(y),
        yletAxis = d3.axisRight(ylet)

    //get variable margin for y-axis title
    function getTitleMarg() {
        return (y.domain()[1] < 1000) ? -40 : 
               (y.domain()[1] < 10000) ? -45 :
               (y.domain()[1] < 100000) ? -50 :
               (y.domain()[1] < 1000000) ? -55 : -60;
    }
    let y_title_marg = getTitleMarg();

    //select all bars, remove them, and exit previous data set
    //then add/enter new data set
    let bar = svg1.select('g').selectAll(".bar")
        .remove()
        .exit()
        .data(time_data)

    let tooltip = d3.select("body").append("div").attr("class", "toolTip");

    let bar_overlay = svg1.select('g').selectAll(".bar_overlay")
        .remove()
        .exit()
        .data(time_data)

    let tooltipback = d3.select("body").append("div").attr("class", "toolTip");

    //now give each rectangle corresponding data
    bar.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("clip-path", "url(#clip)")
        .attr("x", function(d) {
            return x(d.key);
        })
        .attr("y", function(d) {
            return y(d.value.cas);
        })
        .attr("width", bar_width)
        .attr("height", function(d) {
            return height - y(d.value.cas);
        })
        .on("mousemove", function(d) {
            tooltip
                .style("left", d3.event.pageX + 15 + "px")
                .style("top", d3.event.pageY - 2+ "px")
                .style("display", "inline-block")
                .html("Semaine epi: <b>" + getEpiWeeks('date', [d.key]) + "</b><br>Semaine du: <b>" + moment(d.key).format('D MMM YYYY') + "</b><br>" + g.statList[0].full + ": <b>" + formatNumber(d.value.cas.toFixed(0)) + "</b><br>" + g.statList[1].full + ": <b>" + formatNumber((d.value.let*100).toFixed(2))+'%' +  "</b>")
        })
        .on("mouseout", function(d) {
            tooltip.style("display", "none");
        });

    bar_overlay.enter()
        .append("rect")
        .attr("class", "bar_overlay")
        .attr("clip-path", "url(#clip)")
        .attr("x", function(d) {
            return x(d.key);
        })
        .attr("y", function(d) {
            return 0;
        })
        .attr("width", bar_width)
        .attr("height", function(d) {
            return height;
        })
        .on("mousemove", function(d) {
            tooltipback
                .style("left", d3.event.pageX + 15 + "px")
                .style("top", d3.event.pageY - 2+ "px")
                .style("display", "inline-block")
                .html("Semaine epi: <b>" + getEpiWeeks('date', [d.key]) + "</b><br>Semaine du: <b>" + moment(d.key).format('D MMM YYYY') + "</b><br>" + g.statList[0].full + ": <b>" + formatNumber(d.value.cas.toFixed(0)) + "</b><br>" + g.statList[1].full + ": <b>" + formatNumber((d.value.let*100).toFixed(2))+'%' +  "</b>")
        
        })
        .on("mouseout", function(d) {
            tooltipback.style("display", "none");
        });



    //left axis
    svg1.select('.axis--y')
        .call(yAxis)
    //bottom axis
    svg1.select('.axis--x')
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)

    let valueline = d3.line()
        .x(function(d) { //add 3.5days here so data point drawn in middle of epiweek bar
            var newdate = new Date(d.key);
            return x(newdate.setDate(newdate.getDate() + 3.5));
        })
        .y(function(d) {
            return ylet(d.value.let);
        });

    let letline = svg1.select('g').selectAll(".line")
        .remove()
        .exit()
        .data([time_data]);

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
        .attr("transform", "translate(" + (width + 55) + "," + (66) + ") rotate(-90)")
        .text(g.statList[1].full);

    let bar2 = svg2.select('g').selectAll(".bar2")
        .remove()
        .exit()
        .data(time_data)

    bar2.enter()
        .append("rect")
        .attr("class", "bar2")
        .attr("x", function(d) {
            return x2(d.key);
        })
        .attr("y", function(d) {
            return y2(d.value.cas);
        })
        .attr("width", orig_bar_width)
        .attr("height", function(d) {
            return height2 - y2(d.value.cas);
        });

    let zoom = d3.zoom()
        .scaleExtent([1, Infinity])
        //.scaleExtent([1, width])
        .translateExtent([
            [0, 0],
            [width, height]
        ])
        .extent([
            [0, 0],
            [width, height]
        ])
        .on("zoom", zoomed);

    let brush = d3.brushX()
        .extent([
            [0, 0],
            [width2, height2]
        ])
        .on("brush", brushmoved)
        .on("end", brushend);

    if (svg2.selectAll('g.brush').empty()) {
        var gBrush = svg2.append("g")
            .attr("class", "brush")
            .attr("transform", "translate(" + margin[id2].left + "," + margin[id2].top + ")")
            .call(brush);

        var handle = gBrush.selectAll(".handle--custom")
            .data([ {
                type: "w"
            }, {
                type: "e"
            }])
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
                .endAngle(function(d, i) {
                    return i ? Math.PI : -Math.PI;
                }));
        gBrush.call(brush.move, [g.currentvars.currentEpiDates.min*1000, parseInt(moment(g.currentvars.currentEpiDates.max*1000).add(7, 'days').format("x"))].map(x));
    
    } else {
        var gBrush = svg2.select('g.brush');
        var handle = gBrush.selectAll(".handle--custom");
        brushupdate();
    }


    function brushmoved() {
        //get the width of each bar 
        var orig_bar_width = (width / time_data.length);
        var bar_width = (width / time_data.length) - getBarSpacing(width / time_data.length);
        g.currentvars.currentEpiDates.bar_width = bar_width;
        g.currentvars.currentEpiDates.bar_width_x2 = orig_bar_width;
        g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
        g.currentvars.currentEpiDates.tick_freq_x2 = getTickFrequencyX2(orig_bar_width);
        
        let numYTicks = getNumYTicks(y.domain()[1]);

        let xAxis = d3.axisBottom(x)
                .ticks(d3.timeThursday, g.currentvars.currentEpiDates.tick_freq)
                .tickFormat(function(d) {
                    return getEpiWeeks('timestamp', [moment(d).add(-3,'day').format('X')])[0];
                }),
            xAxis2 = d3.axisBottom(x2)
                .ticks(d3.timeMonth, g.currentvars.currentEpiDates.tick_freq_x2)  
                .tickFormat(function(d) {
                    if (g.currentvars.currentEpiDates.tick_freq_x2 < 12) {
                        if (d.getMonth() == 0) {
                            return moment(d).format('YYYY');
                        } else {
                            return ''; //moment(d).format('MMM');
                        }   

                    } else if (g.currentvars.currentEpiDates.tick_freq_x2==12) {
                        return moment(d).format('YYYY');
                    
                    } else if (g.currentvars.currentEpiDates.tick_freq_x2 > 12) {
                        if ((d.getMonth() == 0) && (d.getYear()%parseInt(g.currentvars.currentEpiDates.tick_freq_x2/12)==0)) {
                            return moment(d).format('YYYY');
                        } else {
                            return ''
                        }

                    } else {
                        return '';
                    };
                }),
            yAxis = d3.axisLeft(y).ticks(numYTicks).tickFormat(function(d) {
                    return formatNumber(d.toFixed(0));
                }),
            yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) {
                    if (d3.max(g.currentvars.currentTimeSeries, function(d) { return d.value.let; }) <= 0.003) {
                        return formatNumber((d*100).toFixed(2))+'%';
                    } else {
                        return formatNumber((d*100).toFixed(1))+'%';
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
            .x(function(d) { //add 3.5days here so data point drawn in middle of epiweek bar
                var newdate = new Date(d.key);
                return x(newdate.setDate(newdate.getDate() + 3.5));
            })
            .y(function(d) {
                return ylet(d.value.let);
            });

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
            .attr("transform", "translate(" + (width + 55) + "," + (66) + ") rotate(-90)")
            .text(g.statList[1].full);

        svg2.select('.brush')
            .attr("transform", "translate(" + margin[id2].left + "," + margin[id2].top + ")")
            .call(brush);

        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        var s = d3.event.selection || x2.range(); //range selected or entire range
        
        if (s[0] == s[1]) { //if both handles at either min or max of range
            bar_width = 0; //set bar width to 0 to avoid 'Infinity' error
        
        } else {
            bar_width = ((g.currentvars.currentEpiDates.bar_width_x2) * ((x2.range()[1] - x2.range()[0]) / (s[1] - s[0]))) - getBarSpacing((g.currentvars.currentEpiDates.bar_width_x2) * ((x2.range()[1] - x2.range()[0]) / (s[1] - s[0]))); 
        }
        g.currentvars.currentEpiDates.bar_width = bar_width;
        g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
        
        //fix tick alignment here
        xAxis
            .ticks(d3.timeThursday, g.currentvars.currentEpiDates.tick_freq)
            .tickFormat(function(d) { 
                return getEpiWeeks('timestamp', [moment(d).add(-3,'day').format('X')])[0];
            })

        g.currentvars.currentEpiDates.all = [];
        g.currentvars.currentEpiDates.s = s;

        //class 'active' bars and push to global variable
        if ((s[0] == x2.range()[0]) && (s[1] == x2.range()[1])) { //if full extent
            svg2.selectAll(".bar2").classed("active", true);
            for (var i = 0; i <= g.epitime.all.length - 1; i++) {
                g.currentvars.currentEpiDates.all.push(g.epitime.all[i].epiTimestamp);
            }

        }
        else { //if not full extent   

            var sx = s.map(x2.invert);
            svg2.selectAll(".bar2").classed("active", function(d) {
                if (sx[0] <= d.key && d.key < sx[1]) {
                    g.currentvars.currentEpiDates.all.push(parseInt(moment(d.key).format('X')));
                };
                return sx[0] <= d.key && d.key < sx[1];
            });
            handle.attr("display", null).attr("transform", function(d, i) { 
                return "translate(" + [s[i], 14] + ")";
            });

            x.domain(s.map(x2.invert, x2));

            svg1.select("g").selectAll(".bar")
                .attr("x", function(d) {
                    return x(d.key);
                })
                .attr("width", bar_width);
            svg1.select("g").selectAll(".bar_overlay")
                .attr("x", function(d) {
                    return x(d.key);
                })
                .attr("width", bar_width);

            svg1.select('g').select('.axis--x').call(xAxis);

            svg1.select("g").selectAll(".line")
                .attr("d", valueline);

            svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
                .scale(width / (s[1] - s[0]))
                .translate(-s[0], 0));

        }

        if (g.currentvars.currentEpiDates.all.length==0) {
            g.currentvars.currentEpiDates.min = g.epitime.date_extent[0]; 
            g.currentvars.currentEpiDates.max = g.epitime.date_extent[1]; 
            g.currentvars.currentEpiWeek.min = getEpiWeeks('timestamp', [g.currentvars.currentEpiDates.min])[0];
            g.currentvars.currentEpiWeek.max = getEpiWeeks('timestamp', [g.currentvars.currentEpiDates.max])[0];     
        
        } else {
            g.currentvars.currentEpiDates.min = Math.min(...g.currentvars.currentEpiDates.all);
            g.currentvars.currentEpiDates.max = Math.max(...g.currentvars.currentEpiDates.all);
            g.currentvars.currentEpiWeek.min = getEpiWeeks('timestamp', [g.currentvars.currentEpiDates.min])[0];
            g.currentvars.currentEpiWeek.max = getEpiWeeks('timestamp', [g.currentvars.currentEpiDates.max])[0];     
        }

        //TO ADD LETHALITY LINE TO CONTEXT CHART:
        /* active_data = [];
		for (var i=0; i<=time_data.length-1; i++) {
			if ((d3.timeDay.offset(g.currentvars.currentEpiDates.min, -7) <= time_data[i].key) && (time_data[i].key <= d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7))) {
				active_data.push(time_data[i]);
			}
		}

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

        
        throttledUpdateMap();

    }




    function brushupdate() { //called when updating through code, not on mousemove
        
        gBrush.call(brush.move, [g.currentvars.currentEpiDates.min*1000, parseInt(moment(g.currentvars.currentEpiDates.max*1000).add(7, 'days').format("x"))].map(x));
    
        if ((g.currentvars.currentEpiDates.s[0] == x2.range()[0]) && (g.currentvars.currentEpiDates.s[1] == x2.range()[1])) { //full extent
            svg2.selectAll(".bar2").classed("active", true);
        
        } else {
            svg2.selectAll(".bar2").classed("active", function(d) {
                return g.currentvars.currentEpiDates.all.indexOf(parseInt(moment(d.key).format('X'))) != -1;
            });
        }

        x.domain([moment(g.currentvars.currentEpiDates.min*1000).toDate(), moment(g.currentvars.currentEpiDates.max*1000).add(7, 'days').toDate()]);
        var s = [x2(g.currentvars.currentEpiDates.min*1000), x2(parseInt(moment(g.currentvars.currentEpiDates.max*1000).add(7, 'days').format("x")))];
        bar_width = ((g.currentvars.currentEpiDates.bar_width_x2) * (x2.range()[1] - x2.range()[0]) / (s[1] - s[0])) - getBarSpacing((g.currentvars.currentEpiDates.bar_width_x2) * (x2.range()[1] - x2.range()[0]) / (s[1] - s[0]));
        g.currentvars.currentEpiDates.bar_width = bar_width;
        g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
        handle.attr("display", null).attr("transform", function(d, i) { 
            return "translate(" + [g.currentvars.currentEpiDates.s[i], 14] + ")";
        });


        //TO ADD LETHALITY LINE TO CONTEXT CHART:
        /* active_data = [];
		for (var i=0; i<=time_data.length-1; i++) {
			if ((d3.timeDay.offset(g.currentvars.currentEpiDates.min, -7) <= time_data[i].key) && (time_data[i].key <= d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7))) {
				active_data.push(time_data[i]);
			}
		}

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



        svg1.select("g").selectAll(".bar")
            .attr("x", function(d) {
                return x(d.key);
            })
            .attr("width", bar_width);
        svg1.select("g").selectAll(".bar_overlay")
            .attr("x", function(d) {
                return x(d.key);
            })
            .attr("width", bar_width);

        ylet.domain([0, d3.max(g.currentvars.currentTimeSeries, function(d) {
            return d.value.let;
        })]);
        ylet2.domain([0, d3.max(g.currentvars.currentTimeSeries, function(d) {
            return d.value.let;
        })]);

        svg1.select("g").selectAll(".line")
            .data([g.currentvars.currentTimeSeries])
            .attr("class", "line")
            .attr("d", valueline);

        svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
            .scale(width / (s[1] - s[0]))
            .translate(-s[0], 0));

    }

    function brushend() {

        //get the width of each bar 
        var orig_bar_width = (width / time_data.length);
        var bar_width = (width / time_data.length) - getBarSpacing(width / time_data.length); 
        g.currentvars.currentEpiDates.bar_width = bar_width;
        g.currentvars.currentEpiDates.bar_width_x2 = orig_bar_width;
        g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
        g.currentvars.currentEpiDates.tick_freq_x2 = getTickFrequencyX2(orig_bar_width);
        
        let numYTicks = getNumYTicks(y.domain()[1]);

        let xAxis = d3.axisBottom(x)
                .ticks(d3.timeThursday, g.currentvars.currentEpiDates.tick_freq)
                .tickFormat(function(d) { 
                    return getEpiWeeks('timestamp', [moment(d).add(-3,'day').format('X')])[0];
                }),
            xAxis2 = d3.axisBottom(x2)
                .ticks(d3.timeMonth, g.currentvars.currentEpiDates.tick_freq_x2) 
                .tickFormat(function(d) {
                    if (g.currentvars.currentEpiDates.tick_freq_x2 < 12) {
                        if (d.getMonth() == 0) {
                            return moment(d).format('YYYY');
                        } else {
                            return ''; //moment(d).format('MMM');
                        }                       
                    
                    } else if (g.currentvars.currentEpiDates.tick_freq_x2==12) {
                        return moment(d).format('YYYY');
                    
                    } else if (g.currentvars.currentEpiDates.tick_freq_x2 > 12) {
                        if ((d.getMonth() == 0) && (d.getYear()%parseInt(g.currentvars.currentEpiDates.tick_freq_x2/12)==0)) {
                            return moment(d).format('YYYY');
                        } else {
                            return ''
                        }

                    } else {
                        return '';
                    };
                }),
                
            yAxis = d3.axisLeft(y).ticks(numYTicks).tickFormat(function(d) {
                    return formatNumber(d.toFixed(0));
                }),
            yletAxis = d3.axisRight(ylet).ticks(5).tickFormat(function(d) {
                    if (d3.max(g.currentvars.currentTimeSeries, function(d) { return d.value.let; }) <= 0.003) {
                        return formatNumber((d*100).toFixed(2))+'%';
                    } else {
                        return formatNumber((d*100).toFixed(1))+'%';
                    }
                });

        //bottom axis for timeseriesbrush chart
        svg2.select('.axis--x2')
            .attr("transform", "translate(0," + height2 + ")")
            .call(xAxis2)


        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        var s = d3.event.selection || x2.range(); //range selected or entire range

        if ((s[0] == s[1]) && ((s[0] == x2.range()[0]) || (s[0] == x2.range()[1]))) { //if both handles either at min or max of range, reset to entire range
            s = x2.range();
        }

        //determines whether to hide bar handles or not (in full extent)
        if (d3.event.sourceEvent) {
            var path2 = [d3.event.sourceEvent.target]; //technique to get propagation path in both Chrome & Firefox
            var i = 0;
            while ((varx = path2[i++].parentElement) != null) path2.push(varx);
            var clicked_on = path2[0].tagName;
        
        } else {
            var clicked_on = 'NA';
        }
        
        if (d3.event.sourceEvent == null) { //brush change in program
            handle.attr("display", null).attr("transform", function(d, i) {
                return "translate(" + [g.currentvars.currentEpiDates.s[i], 14] + ")";
            });
        
        } else if ((s[0] == x2.range()[0]) && (s[1] == x2.range()[1])) { //full extent selected - manually by user

            g.currentvars.currentEpiDates.min = g.epitime.date_extent[0];
            g.currentvars.currentEpiDates.max = g.epitime.date_extent[1];
            g.currentvars.currentEpiWeek.min = getEpiWeeks('timestamp', [g.currentvars.currentEpiDates.min])[0];
            g.currentvars.currentEpiWeek.max = getEpiWeeks('timestamp', [g.currentvars.currentEpiDates.max])[0];
            g.currentvars.currentEpiDates.all = [];

            for (var i = 0; i <= g.epitime.all.length - 1; i++) {
                g.currentvars.currentEpiDates.all.push(g.epitime.all[i].epiTimestamp);
            }

            svg2.selectAll(".bar2").classed("active", true);


            //TO ADD LETHALITY LINE TO CONTEXT CHART:
            /*active_data = [];
			for (var i=0; i<=time_data.length-1; i++) {
				if ((d3.timeDay.offset(g.currentvars.currentEpiDates.min, -7) <= time_data[i].key) && (time_data[i].key <= d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7))) {
					active_data.push(time_data[i]);
				}
			}

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

            x.domain([moment(g.currentvars.currentEpiDates.min*1000).toDate(), moment(g.currentvars.currentEpiDates.max*1000).add(7, 'days').toDate()]);
            var s = [x2(g.currentvars.currentEpiDates.min*1000), x2(parseInt(moment(g.currentvars.currentEpiDates.max*1000).add(7, 'days').format("x")))];
            bar_width = ((g.currentvars.currentEpiDates.bar_width_x2) * (x2.range()[1] - x2.range()[0]) / (s[1] - s[0])) - getBarSpacing((g.currentvars.currentEpiDates.bar_width_x2) * (x2.range()[1] - x2.range()[0]) / (s[1] - s[0])); 
            g.currentvars.currentEpiDates.bar_width = bar_width;
            g.currentvars.currentEpiDates.tick_freq = getTickFrequency(bar_width);
            g.currentvars.currentEpiDates.tick_freq_x2 = getTickFrequencyX2(orig_bar_width);

            if (!((g.currentvars.currentEpiDates.s[0] == x2.range()[0]) && (g.currentvars.currentEpiDates.s[1] == x2.range()[1]))) {
                handle.attr("display", "none");
            
            } else {
                handle.attr("display", null).attr("transform", function(d, i) { 
                    return "translate(" + [g.currentvars.currentEpiDates.s[i], 14] + ")";
                });
            }

            svg1.select("g").selectAll(".bar")
                .attr("x", function(d) {
                    return x(d.key);
                })
                .attr("width", bar_width);
            svg1.select("g").selectAll(".bar_overlay")
                .attr("x", function(d) {
                    return x(d.key);
                })
                .attr("width", bar_width);

            svg1.select("g").select(".axis--x").call(xAxis);

            var valueline = d3.line()
                .x(function(d) { //add 3.5days here so data point drawn in middle of epiweek bar
                    var newdate = new Date(d.key);
                    return x(newdate.setDate(newdate.getDate() + 3.5));
                })
                .y(function(d) {
                    return ylet(d.value.let);
                });

            svg1.select('g').selectAll(".line")
                .attr("d", valueline);

            svg1.select(".zoom").call(zoom.transform, d3.zoomIdentity
                .scale(width / (s[1] - s[0]))
                .translate(-s[0], 0));

        } else {  //brush changed manually but not to full extent/snap

            var d0 = d3.event.selection.map(x2.invert);
            var d1 = d0.map(d3.timeMonday.round);

            //if empty when rounded, use floor & ceil instead
            if (d1[0] >= d1[1]) {
                d1[0] = d3.timeMonday.floor(d0[0]);
                d1[1] = d3.timeMonday.offset(d1[0]);
            }
            
            d3.select(this).transition().call(d3.event.target.move, d1.map(x2));
        }

        //compare button start & end dates to current start & end dates to turn buttons on & off appropriately as user brushes
        g.timerangebuttons.forEach(function(btn) {

            var dates_match = sameDay(btn.date_min, g.currentvars.currentEpiDates.min) && sameDay(btn.date_max, g.currentvars.currentEpiDates.max);
            
            if ((dates_match) && (!($('.' + btn.id).hasClass('on')))) {
                $('.btn-timerange').removeClass('on');
                $('#' + btn.id).addClass('on');
            
            } else if ((!(dates_match)) && ($('#' + btn.id).hasClass('on'))) {
                $('#' + btn.id).removeClass('on');
            }
        });

        updateMap();
    }


    function zoomed() {

        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        var t = d3.event.transform;
        x.domain(t.rescaleX(x2).domain());
        svg1.select("g").selectAll(".bar").attr("x", function(d) {
            return x(d.key);
        });
        svg1.select("g").selectAll(".bar_overlay").attr("x", function(d) {
            return x(d.key);
        });
        svg2.select("g").select(".brush").call(brush.move, x.range().map(t.invertX, t));
    }


};


/************************************/
/******  PLAY/PAUSE ANIMATION  ******/
/************************************/



$(function() {

    $("#btnPlayPause").on("click", function() {
        
        if (g.currentvars.currentAnimation.playMode == 'stop') {
            currentDate = g.currentvars.currentEpiDates.min;
        };
        $('#btnStop').css('display', 'block'); //display Stop button
        $('#playMode_text').css('display', 'inline-block'); //display play mode text under stop button
        
        if (playInterval != undefined) { //in Pause mode (playInterval defined when button is playing)
            clearInterval(playInterval);
            playInterval = undefined;
            $("#btnPlayPause").removeClass('pause');
            togglePlayMode('pause');
            return;
        }
        
        $("#btnPlayPause").addClass('pause'); //in Play mode 
        if (currentDate > g.currentvars.currentEpiDates.max) {
            currentDate = g.currentvars.currentEpiDates.min;
            g.currentvars.currentAnimation.currentEpiDate = currentDate;
        }

        togglePlayMode('play');

        playInterval = setInterval(function() {

            if (currentDate > g.currentvars.currentEpiDates.max) { //if we reach the final timestep
                
                if (autoRewind) { //if we loop (autoRewind) then go back to beginning
                    currentDate = g.currentvars.currentEpiDates.min;
                    g.currentvars.currentAnimation.currentEpiDate = currentDate;
                
                } else { //if we don't loop (autoRewind) then stop and clear 
                    currentDate = g.currentvars.currentEpiDates.min;
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

                if (sameDay(parseInt(moment(d.key).format('X')), currentDate)) {
                    updateMap();
                    addPlayLine();
                    return true;
                
                } else {
                    return false;
                }
            })

            currentDate = parseInt(moment.unix(currentDate).add(7,'day').format('X'));

        }, slideDuration);

    });

    $("#btnStop").on("click", function() {
        togglePlayMode('stop');
        clearInterval(playInterval);
        playInterval = undefined;
        $('#btnPlayPause').removeClass('pause');
        $('#btnStop').css('display', 'none');
        $('#playMode_text').css('display', 'none');
    });

});


function addPlayLine() {

    const id1 = '#timeseries';

    const width = $(id1).width() - margin[id1].left - margin[id1].right, //width of main svg
          height = $(id1).height() - margin[id1].top - margin[id1].bottom; //height of main svg

    var x = d3.scaleTime().range([0, width]) //x-axis width, accounting for specified margins
        .domain([g.currentvars.currentEpiDates.min, parseInt(moment.unix(g.currentvars.currentEpiDates.max).add(7,'day').format('X')) ]);

    var week_width = width / g.currentvars.currentEpiDates.all.length;
    
    svg1.selectAll('.playBar_line')
        .attr("class", "playBar_line")
        .attr("x1", margin[id1].left + x(g.currentvars.currentAnimation.currentEpiDate) + week_width / 2)
        .attr("y1", margin[id1].top)
        .attr("x2", margin[id1].left + x(g.currentvars.currentAnimation.currentEpiDate) + week_width / 2)
        .attr("y2", height + margin[id1].top)
        .attr('stroke', g.mapcolors.playbar_color)
        .attr("stroke-width", 2)
        .attr('display', 'block');
}


function throttle(callback, wait, context = this) {
    let timeout = null 
    let callbackArgs = null
      
    const later = () => {
        callback.apply(context, callbackArgs)
        timeout = null
    }
      
    return function() {
        if (!timeout) {
            callbackArgs = arguments
            timeout = setTimeout(later, wait)
        }
    }
}


function togglePlayMode(mode) {

    if (mode == 'play') {
        g.currentvars.currentAnimation.playMode = 'play';
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
        $('#btn_export_all').addClass('no-point');
        $('#btn_reset_map').addClass('no-point');
        $('#btn_reset_all').addClass('no-point');
        $('.btn-timerange').addClass('no-point');

        svg2.selectAll(".bar2.active").style('fill', '#7f7f7f');
        svg2.select('g.brush').remove();

    } else if (mode == 'pause') {
        g.currentvars.currentAnimation.playMode = 'pause';

    } else if (mode == 'stop') {
        g.currentvars.currentAnimation.playMode = 'stop';
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
        $('#btn_export_all').removeClass('no-point');
        $('#btn_reset_map').removeClass('no-point');
        $('#btn_reset_all').removeClass('no-point');
        $('.btn-timerange').removeClass('no-point');

        svg1.selectAll(".bar").classed("playBar", function(d) {
            return false;
        })
        svg1.selectAll(".playBar_line").attr('display', 'none');

        updateTimeSeriesCharts();

    };
}



/***********************************/
/****  UPDATE DATA & DASHBOARD  ****/
/***********************************/


function updateMap(callback) {

    colorMap();
    updateActivityClusters();
    updateHeadline();
    updateFiltSum();
    if (callback) callback();

}


function addMenuToggle() {
    document.getElementById('sideMenu_btn').addEventListener("click", function() {
        document.getElementById('sideMenu').classList.toggle('hide');
        document.getElementById('sideMenu_btn').classList.toggle('show');
        document.getElementById('main-container').classList.toggle('nomenu');
        setTimeout(function() {
            resize();
        }, 300);
    });

    document.getElementById('closeMenu_btn').addEventListener("click", function() {
        document.getElementById('sideMenu').classList.toggle('hide');
        document.getElementById('sideMenu_btn').classList.toggle('show');
        document.getElementById('main-container').classList.toggle('nomenu');
        setTimeout(function() {
            resize();
        }, 300);
    });
};


function sameDay(d1, d2) {
    var d1m = moment.unix(d1);
    var d2m = moment.unix(d2);
    return d1m.isSame(d2m, 'day');
}


function initSelectivity() {
    [selectProvs, selectZones] = getLocTreeNames(geonames);
    selectLocs.items = selectProvs;
}


function initDiseaseDropDown() {
    for (disease in g.diseaseList) {
        if (g.diseaseList[disease] != null) {
            select_disease.options[select_disease.options.length] = new Option(g.diseaseList[disease], disease);
        }
    }
}



function initStatsDropDown() {
    for (stat in g.statList) {
        if (g.statList[stat].full != null) {
            select_stat.options[select_stat.options.length] = new Option(g.statList[stat].full, stat);
        }
    }
}


function changeDiseaseSelection(opt) {

    const element = document.getElementById('map_title');

    if (opt != null) {
        select_disease.selectedIndex = opt;
    }
    g.currentvars.currentDisease = select_disease.options[select_disease.selectedIndex].text;
    
    element.innerHTML = `${g.currentvars.currentDisease} - ${g.currentvars.currentStat.full}:`;
    cf.malDim.filterAll();
    cf.malDim.filter(g.currentvars.currentDisease);
    updateTimeSeriesCharts();
}


function changeStatSelection(opt) {
    
    const element = document.getElementById('map_title');
    
    if (opt != null) {
        select_stat.selectedIndex = opt;
    }

    g.currentvars.currentStat = g.statList.find(stat => {
        return stat.full == select_stat.options[select_stat.selectedIndex].text
    })

    element.innerHTML = `${g.currentvars.currentDisease} - ${g.currentvars.currentStat.full}:`;
    updateTimeSeriesCharts();
}


function updateHeadline() {
    const headline = document.getElementById("head-val");
    const totalVal = function() {
        switch (g.currentvars.currentStat.abrv) {
            case 'cas': return formatNumber(g.currentvars.currentTotals.cas.toFixed(0));
                        break;
            case 'dec': return formatNumber(g.currentvars.currentTotals.dec.toFixed(0));
                        break;
            case 'let': return formatNumber((g.currentvars.currentTotals.let*100).toFixed(2))+'%';
                        break;
            default: return '';
        };
    }
    headline.innerHTML = ` ${totalVal()}`;
};


function btn_act(actType) {

    if (actType == 'none') { //turn off all activity & alert buttons

        $('.btn_acts').removeClass('on');  
        $('.btn_alt').removeClass('on');   
        g.currentvars.currentActivities = [];

    } else if (actType == 'all') { //turn on all activity & alert btns
        
        g.activities.all.filter(act => {
            if (act.btn_name != '') {
                if (!($(act.btn_name).hasClass('on'))) { 
                    $(act.btn_name).addClass('on');
                    g.currentvars.currentActivities.push(act.act_name);
                }
            }
        })

    } else { //toggle btn as expected

        const btn = g.activities.all.find(act => {
            return act.act_name == actType
        })

        if ($(btn.btn_name).hasClass('on')) { //switch off
            $(btn.btn_name).removeClass('on');
            let index = g.currentvars.currentActivities.indexOf(actType);
            if (index > -1) {
                g.currentvars.currentActivities.splice(index, 1);
            }
        } else { //switch on
            $(btn.btn_name).addClass('on');
            g.currentvars.currentActivities.push(actType);
        }


        if ((actType == 'alerte') && ($('#btnAlt').hasClass('on'))) {  //if main alert button turned on then turn on all sub-alert btns
            g.activities.all.forEach(act => {
                if ((act.act_type == 'alerte') && (act.btn_name != '')) {
                    if (!($(act.btn_name)).hasClass('on')) {
                        $(act.btn_name).addClass('on');
                        g.currentvars.currentActivities.push(act.act_name);
                    }
                }
            })

        } else if ((actType == 'alerte') && (!($('#btnAlt').hasClass('on')))) { //if main alert button turned off then turn off all sub-alert btns
            $('.btn_alt').removeClass('on'); 
            g.activities.all.forEach(act => {
                if ((act.act_type == 'alerte') && (act.btn_name != '')) {             
                    let index = g.currentvars.currentActivities.indexOf(act.act_name);
                    if (index > -1) {
                        g.currentvars.currentActivities.splice(index, 1);
                    }

                }
            })
        };

        let allAlertsOn = function() {  //check whether all alerts are on or not           
            let allOn = g.activities.all.filter(act => {
                return (act.act_type == 'alerte') && (act.act_name != 'alerte') && (act.btn_name != '')
            }).every(a => {
                return $(a.btn_name).hasClass('on')
            })
            return allOn;
        }();

        if ((btn.act_type == 'alerte') && allAlertsOn) { //if all sub-alert buttons turned on
            if (!($('#btnAlt').hasClass('on'))) { //turn on main alert btn (if not already on)
                $('#btnAlt').addClass('on');
                g.currentvars.currentActivities.push('alerte');
            }
        
        } else if (btn.act_type == 'alerte') { //if not all sub-alert buttons turned on
            $('#btnAlt').removeClass('on'); //turn off main alert btn
            let index = g.currentvars.currentActivities.indexOf('alerte');
            if (index > -1) {
                g.currentvars.currentActivities.splice(index, 1);
            }
        }

    };

    updateActivityClusters();
    updateFiltSum();
}


function updateFiltSum() {

    const filtSum = document.getElementById("win_filt-sum");
    let sem_html, dat_html, act_html, loc_html;

    if (g.currentvars.currentAnimation.playMode != 'stop') {
        sem_html = getEpiWeeks('timestamp', [g.currentvars.currentAnimation.currentEpiDate])
        dat_html = moment(g.currentvars.currentAnimation.currentEpiDate*1000).format('D MMM YYYY');
    
    } else {
        
        if (sameDay(g.currentvars.currentEpiDates.min, g.currentvars.currentEpiDates.max)) {
            sem_html = g.currentvars.currentEpiWeek.min;
            dat_html = moment(g.currentvars.currentEpiDates.min*1000).format('D MMM YYYY');
        
        } else if ((!(g.currentvars.currentEpiWeek.min)) || (!(g.currentvars.currentEpiWeek.max))) {
            sem_html = `Pas disponsible`;
            dat_html = `Pas disponsible`;
        
        } else {
            sem_html = `${g.currentvars.currentEpiWeek.min} - ${g.currentvars.currentEpiWeek.max}`;
            dat_html = `${moment(g.currentvars.currentEpiDates.min*1000).format('D MMM YYYY')} - ${moment(g.currentvars.currentEpiDates.max*1000).format('D MMM YYYY')}`;
        }
    };

    if (g.currentvars.currentMapLyr == 'zone') {       
        loc_html = `<i>Zones</i>`;
        if (g.currentvars.currentZones.pcodes.length == 0) {
            loc_html += `<i>: </i>Toutes les zones`
        } else {
            loc_html += `<i> (par province): </i>`;
            let selectedZoneNames = [];
            let formattedZoneNames = '';
            let result = geonames.filter(filterByZonePcode)
            let [selectedProvs, selectedZones] = getLocTreeNames(result);
            
            selectedZones.forEach(zone => {
                formattedZoneNames += `<b>${zone.text}</b>: `;
                zone.children.forEach(child => {
                    formattedZoneNames += `${child.text}, `;
                })
                formattedZoneNames = `${formattedZoneNames.slice(0, -2)}; `;
            })
            formattedZoneNames = formattedZoneNames.slice(0, -2);
            loc_html += formattedZoneNames;
        };
    
    } else if (g.currentvars.currentMapLyr == 'prov') {
        loc_html = `<i>Provinces: </i>`;
        g.currentvars.currentProvs.pcodes.length == 0 ? loc_html += `Toutes les provinces` : loc_html += g.currentvars.currentProvs.names.join(", ");
    };


    if (g.currentvars.currentActivities.length == 0) {
        act_html = `Aucune choisie`;
    
    } else {
        
        if (g.currentvars.currentActivities.indexOf('alerte') != -1) {
            act_html = `Toutes les Alertes`;
        
        } else {
            let sub_act_html = '';

            g.activities.all.filter(act => {
                return (act.act_type == 'alerte') && (act.btn_name != '') && (g.currentvars.currentActivities.indexOf(act.act_name) != -1);
            }).forEach(a => {
                sub_act_html += `${a.btn_text}, `;
            })

            if (sub_act_html.length > 0) {
                act_html = `Alertes <i>(${sub_act_html.slice(0, -2)})</i>`;        
            } else {
                act_html = ``;
            }

        };

        if (g.currentvars.currentActivities.indexOf('evaluation') != -1) {
            if (act_html.length != 0) {
                act_html += `, `;
            }
            act_html += `Evaluations`;
        };
        
        if (g.currentvars.currentActivities.indexOf('intervention') != -1) {
            if (act_html.length != 0) {
                act_html += `, `;
            }
            act_html += `Interventions`;
        };
    }

    g.currentvars.currentFiltSum['epiweeks'] = sem_html;
    g.currentvars.currentFiltSum['dates'] = dat_html;
    g.currentvars.currentFiltSum['acts'] = act_html.replace(/<(.|\n)*?>/g, '');
    g.currentvars.currentFiltSum['locs'] = loc_html.replace(/<(.|\n)*?>/g, '');
    
    filtSum.innerHTML =  `<i>Semaines epi: </i><b>${sem_html}</b> (<i>Dates: </i>${dat_html})<br/><i>Activités: </i>${act_html}<br/>${loc_html}`;
}


function btn_filt_sum() {
    const filtSum = document.getElementById("win_filt-sum");
    if ($('#btnFiltSum').hasClass('on')) { //switch off
        $('#btnFiltSum').removeClass('on');
        filtSum.style.display = 'none';
    } else {   //switch on
        $('#btnFiltSum').addClass('on');
        filtSum.style.display = 'block';
    }

}


function btn_export_all() {   

    function displayDownloadSpinner (callback) {
        let mapBounds = document.getElementById("map").getBoundingClientRect();
        document.getElementById("modal-window").style.height = mapBounds.height; //set modal bounds to same as map bounds
        document.getElementById("modal-window").style.width = mapBounds.width;
        document.getElementById("modal-window").style.marginLeft = mapBounds.left;
        document.getElementById("modal-window").style.marginTop = mapBounds.top;
        document.getElementById('modal-screen').style.display = "block";
        document.getElementById("spinner_container").style.display = 'inline-block';
        document.getElementById("spinner").classList.add('epLoader');
        callback();
    }
    
    displayDownloadSpinner(dashboardExport);

} 


function btn_reset_map() {
    cf.zsDim.filterAll();
    cf.provDim.filterAll();
    g.currentvars.currentZones = {
        pcodes: [],
        names: []
    };
    g.currentvars.currentProvs = {
        pcodes: [],
        names: []
    };
    btn_change_lyr('prov');
    setDefaultMapZoom();
}


function btn_reset_all() {

    let confirmReset = function () {
        var r = confirm("Êtes-vous sûr de vouloir réinitialiser toutes les options du dashboard?");
        return r;
    }();

    if (confirmReset) {
        cf.zsDim.filterAll();
        cf.provDim.filterAll();
        g.currentvars.currentZones = {
            pcodes: [],
            names: []
        };
        g.currentvars.currentProvs = {
            pcodes: [],
            names: []
        };
        cf.epiDateDim.filterAll();

        g.currentvars.currentEpiDates.min = g.currentvars.currentEpiDates.min_default;
        g.currentvars.currentEpiDates.max = g.currentvars.currentEpiDates.max_default;
        $('.btn-timerange').removeClass('on');
        $('#' + g.timerangebuttons.default_btn.id).addClass('on');
        
        changeDiseaseSelection(0);
        changeStatSelection(0);
        if (!($('#btnRiv').hasClass('on'))) {
            btn_rivers();
        };
        btn_change_lyr('prov');
        setDefaultMapZoom();
        btn_act('all');
    };
}


$('#btnIntro').click(function(e) {
    helpTour();
});


function createTimeRangeButtons() {
    let tr_btns_html = '';
    g.timerangebuttons.forEach(function(btn) {
        let dates = getEpiRange(btn.range_type, btn.range_param);
        btn.date_min = dates[0];
        btn.date_max = dates[1];
        btn.epiweek_min = getEpiWeeks('timestamp', [btn.date_min])[0];
        btn.epiweek_max = getEpiWeeks('timestamp', [btn.date_max])[0];
        tr_btns_html += `<button id='btnTimeRange_${btn.range_param}${btn.range_type}' class='btn-timerange button' onclick='btn_selectTimeRange("${btn.range_type}",${btn.range_param});'>${btn.text}</button>`;
    });
    $('#timerange_buttons').html(tr_btns_html);
}

function btn_selectTimeRange(rng_type, param) {
    let dates = getEpiRange(rng_type, param);
    g.currentvars.currentEpiDates.min = dates[0];
    g.currentvars.currentEpiDates.max = dates[1];
    g.currentvars.currentEpiWeek.min = getEpiWeeks('timestamp', [g.currentvars.currentEpiDates.min])[0];
    g.currentvars.currentEpiWeek.max = getEpiWeeks('timestamp', [g.currentvars.currentEpiDates.max])[0];
    g.currentvars.currentEpiDates.all = [];

    //populate g.currentvars.currentEpiDates.all with all weeks from min to max
    g.epitime.all.forEach(epitime => {
        if ((g.currentvars.currentEpiDates.min <= epitime.epiTimestamp) && (epitime.epiTimestamp < g.currentvars.currentEpiDates.max)) {
            g.currentvars.currentEpiDates.all.push(epitime.epiTimestamp);
        }
    })

    updateTimeSeriesCharts();
    $('.btn-timerange').removeClass('on');
    $('#btnTimeRange_' + param + rng_type).addClass('on');

}


function btn_cancel() {
    if (!($('#btnCancel').hasClass('cancel'))) {
        $('#btnCancel').addClass('cancel')
    }   
    document.getElementById("modal-load-update").innerHTML = '<b>Annuler le téléchargement...</b>';
    window.stop();
}



function resize() {
    if (window.innerWidth < 768) {
        if (!($('#btnPlayPause').hasClass('slimline'))) {
            $('#btnPlayPause').addClass('slimline');
        };
        if (!($('#btnStop').hasClass('slimline'))) {
            $('#btnStop').addClass('slimline');
        };
        if (!($('#playMode_text').hasClass('slimline'))) {
            $('#playMode_text').addClass('slimline');
        };
        $('#btnZone').removeClass('slimline');
        $('#btnProv').removeClass('slimline');
        $('#title-container').removeClass('slimline');
        $('#timerange_buttons').removeClass('slimline');
        if (!($('#timerange_buttons').hasClass('slimline'))) {
            $('#timerange_buttons').addClass('slimline2');
        };
        $('.btn-timerange').removeClass('slimline');
    }
    else if (window.innerWidth < 1041) {
        $('#btnPlayPause').removeClass('slimline');
        $('#btnStop').removeClass('slimline');
        $('#playMode_text').removeClass('slimline');
        if (!($('#btnZone').hasClass('slimline'))) {
            $('#btnZone').addClass('slimline');
        };
        if (!($('#btnProv').hasClass('slimline'))) {
            $('#btnProv').addClass('slimline');
        };
        if (!($('#title-container').hasClass('slimline'))) {
            $('#title-container').addClass('slimline');
        };
        if (!($('#timerange_buttons').hasClass('slimline'))) {
            $('#timerange_buttons').addClass('slimline');
        };
        $('#timerange_buttons').removeClass('slimline2');
        if (!($('.btn-timerange').hasClass('slimline'))) {
            $('.btn-timerange').addClass('slimline');
        };
    }
    else {
        $('#btnPlayPause').removeClass('slimline');
        $('#btnStop').removeClass('slimline');
        $('#playMode_text').removeClass('slimline');
        $('#btnZone').removeClass('slimline');
        $('#btnProv').removeClass('slimline');
        $('#title-container').removeClass('slimline');
        $('#timerange_buttons').removeClass('slimline2');
        $('.btn-timerange').removeClass('slimline');
    }
    updateTimeSeriesCharts();

}

