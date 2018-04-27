var rmax = 30; //max radius for cluster pies*/
var geojson; //data
var parseTime = d3.timeParse("%m/%d/%y");
var formatTime = d3.timeFormat("%m/%d/%y");  


var markerClusters = L.markerClusterGroup({     //define markerClusters as cluster group 
        maxClusterRadius: 2*rmax,
        iconCreateFunction: defineClusterIcon   //builds dataset and pie
    });

function addActivityClusters() {
	
	//add empty markerClusters to map
	map.addLayer(markerClusters);

	d3.json(geojsonClusterPath, function(error, data) {
        //console.log("Loading clusters...");
        if (!error) {
            geojson = data;
            //convert all dates (i.e. properties with 'date_' prefix) to date format
            for (var i=0; i<=geojson.features.length-1; i++) { 
                for (var prop in geojson.features[i].properties) {
                    if (prop.substring(0,5)=='date_') {
                        var newDate = parseTime(geojson.features[i].properties[prop]);
                        geojson.features[i].properties[prop] = newDate;
                    }
                }
            }
            //console.log("activity cluster geojson = ", geojson);

            markers = L.geoJson(geojson, {
      			pointToLayer: defineMarkerFeature,			//defines class & icon
      			onEachFeature: defineMarkerFeaturePopup		//defines popup html
            });
            markerClusters.addLayer(markers);
        } else {
	       console.log('Could not load activity clusters data...');
        }
    });
}


function updateActivityClusters() {
    //console.log("updateActClusters")
    markerClusters.clearLayers();
    markers = L.geoJson(geojson, {
                pointToLayer: defineMarkerFeature,          //defines class & icon
                onEachFeature: defineMarkerFeaturePopup     //defines popup html
            });
    markerClusters.addLayer(markers);
}


function defineMarkerFeature(feature, latlng) {     //define which markers to show at any time
    var categoryVal = feature.properties[g.activities.fields.categoryField];
    var iconVal = feature.properties[g.activities.fields.categoryField];
    var diseaseVal = feature.properties['path'];
    
    var myClass = 'marker category-'+categoryVal+' icon-'+iconVal;
	var myIcon = L.divIcon({
    	className: myClass,
    	iconSize: null
	});

    //console.log(feature.properties);
    //get min & max dates defined for activity
    var min_dates = [], max_dates = [];
    for (var prop in feature.properties) {
        if (feature.properties[prop] instanceof Date) {
            if (['date_sit', 'date_det', 'date_part', 'date_dep', 'date_deb'].indexOf(prop)!=-1) {
                min_dates.push(feature.properties[prop]);
            } else if (['date_ferm', 'date_fin', 'date_ret_equipe'].indexOf(prop)!=-1) {
                max_dates.push(feature.properties[prop]);
            }
        }
    }
    if ((min_dates.length==0) && (max_dates.length==0)) {   //if no dates available don't display marker
        var dateCheck = false;
    } else {
        if (min_dates.length==0) {              //if no 'start' dates available
            var minDate = new Date(Math.min.apply(null, max_dates));
            var maxDate = new Date(Math.max.apply(null, max_dates));
        } else if (max_dates.length==0) {       //if no 'end' dates available
            var minDate = new Date(Math.min.apply(null, min_dates));
            var maxDate = new Date(Math.max.apply(null, min_dates));
        } else {                                //if both 'start' and 'end' dates available
            var minDate = new Date(Math.min.apply(null, min_dates));
            var maxDate = new Date(Math.max.apply(null, max_dates));
        };
        if (g.currentvars.currentAnimation.playMode == 'stop') {
            var dateCheck = ((g.currentvars.currentEpiDates.min <= maxDate) && (d3.timeDay.offset(g.currentvars.currentEpiDates.max, 7) > minDate));
        } else {
            var dateCheck = ((g.currentvars.currentAnimation.currentEpiDate <= maxDate) && (d3.timeDay.offset(g.currentvars.currentAnimation.currentEpiDate, 7) > minDate));
        };
    };  

    var diseaseCheck = (diseaseVal==g.currentvars.currentDisease);
    var locationCheck = (((g.currentvars.currentZones.pcodes.length==0) && (g.currentvars.currentProvs.pcodes.length==0)) || ((g.currentvars.currentZones.pcodes.indexOf(feature.properties['zs_pc'])!=-1) && (g.currentvars.currentProvs.pcodes.length==0)) || ((g.currentvars.currentProvs.pcodes.indexOf(feature.properties['prov_pc'])!=-1) && (g.currentvars.currentZones.pcodes.length==0)));
    var menuOptionCheck = (g.currentvars.currentActivities.indexOf(categoryVal) != -1);

    //check which markers to display - only display if current disease, within current time extent, selected location(s), & option turned on in menu
    if (diseaseCheck && dateCheck && locationCheck && menuOptionCheck) {
        return L.marker(latlng, {icon: myIcon});
    } else {
        return null;
    }
}

function defineMarkerFeaturePopup(feature, layer) {
    var props = feature.properties;
    //console.log(props)
    var popupContent = '';
    var act;
    for (var i=0; i<= g.activities.all.length-1; i++) {
        if ((g.activities.all[i].act_name == props['act_type'])) {
            act = g.activities.all[i];
            break;
        }
    }
    var act_code = props['act_code']=='' ? '<i>Indisponible</i>' : props['act_code'];
    var typ = props['typ']=='' ? '<i>Indisponible</i>' : props['typ'];

    if (act.act_type=='alerte') {
        //github use:  src="/images/' + props['act_type'] + '.png"
        //locally use: src="../images/' + props['act_type'] + '.png"
        //           or src="images/' + props['act_type'] + '.png"
        popupContent += '<span><img style="float: left; margin: 0px 8px 0px 0px;" src="/images/' + props['act_type'] + '.png" width="16" height="16"></img></span>';
    } else {
        popupContent += '<span><div style="margin: 0px 8px 0px 0px; display: inline-block;" class="icon-' + act.act_type + '"></div></span>';
    }
    popupContent += '<span class="heading">'+ act.popup_text +'</span><hr>';

    popupContent += '<span class="attribute"><span class="label">'+ g.activities.labels['act_code'] +':</span> '+ act_code +'</span>';
    popupContent += '<span class="attribute"><span class="label">'+ g.activities.labels['loc'] +':</span> '+ props['zs'] + ', ' + props['prov'] +'</span>';
    popupContent += '<span class="attribute"><span class="label">'+ g.activities.labels['typ'] +':</span> '+ typ +'</span>';
    popupContent += '<span class="attribute"><span class="label">'+ g.activities.labels['path'] +':</span> '+ props['path'] +'</span>';

    if ((props['comm']!=null) && (props['comm']!='')) {
        popupContent += '<span class="attribute-sm"><span class="label-sm">'+ g.activities.labels['comm'] +':</span> <i>'+ props['comm'] +'</i></span>'; 
    } 
    popupContent += '<hr>';

    if (act.act_type=='alerte') {
        var date_vars = ['date_sit', 'date_det', 'date_part', 'date_ferm']
    } else if (act.act_type=='evaluation') {
        var date_vars = ['date_dep', 'date_deb', 'date_fin', 'date_ret_equipe']
    } else if (act.act_type=='intervention') {
        var date_vars = ['date_dep', 'date_deb', 'date_fin']
    }
    for (var i=0; i<=date_vars.length-1; i++) {
        if (props[date_vars[i]]!=null) {
            popupContent += '<span class="attribute-sm"><span class="label-sm">'+ g.activities.labels[date_vars[i]] +':</span> '+ formatTime(props[date_vars[i]]) +'</span>';      
        }
    }
    popupContent += '<hr>';
    
    popupContent = '<div class="map-popup">'+popupContent+'</div>';
    layer.bindPopup(popupContent,{offset: L.point(1,-2)});
};

function defineClusterIcon(cluster) {
    var act_name = '';

    var children = cluster.getAllChildMarkers(),
        n = children.length, //Get number of markers in cluster
        strokeWidth = 1, //Set clusterpie stroke width
        r = rmax-2*strokeWidth-(n<10?12:n<100?8:n<1000?4:0), //Calculate clusterpie radius...
        iconDim = (r+strokeWidth)*2, //...and divIcon dimensions (leaflet really want to know the size)
        data = d3.nest() //Build a dataset for the pie chart
          .key(function(d) { /*console.log(d.feature.properties, d.feature.properties[g.activities.fields.categoryField]);*/ return d.feature.properties[g.activities.fields.categoryField]; })
          .entries(children, d3.map),
        //bake some svg markup
        html = bakeThePie({data: data,
                            valueFunc: function(d){return d.values.length;},
                            strokeWidth: 1,
                            outerRadius: r,
                            innerRadius: r-10,
                            pieClass: 'cluster-pie',
                            pieLabel: n,
                            pieLabelClass: 'marker-cluster-pie-label',
                            pathClassFunc: function(d){/*console.log(d);*/ return "category-"+d.data.key;},
                            pathTitleFunc: function(d){
                                for (var i=0; i<= g.activities.all.length-1; i++) {
                                    if ((g.activities.all[i].act_name == d.data.key)) {
                                        act_name = g.activities.all[i].popup_text;
                                        break;
                                    }
                                };
                                return act_name +' ('+d.data.values.length+' activité'+(d.data.values.length!=1?'s':'')+')';}
                          }),
        //Create a new divIcon and assign the svg markup to the html property
        myIcon = new L.DivIcon({
            html: html,
            className: 'marker-cluster', 
            iconSize: new L.Point(iconDim, iconDim)
        });

    return myIcon;
}

/*function that generates a svg markup for the pie chart*/
function bakeThePie(options) {
    //data and valueFunc are required
    if (!options.data || !options.valueFunc) {
        return '';
    }
    var data = options.data,
        valueFunc = options.valueFunc,
        r = options.outerRadius?options.outerRadius:28, //Default outer radius = 28px
        rInner = options.innerRadius?options.innerRadius:r-10, //Default inner radius = r-10
        strokeWidth = options.strokeWidth?options.strokeWidth:1, //Default stroke is 1
        pathClassFunc = options.pathClassFunc?options.pathClassFunc:function(){return '';}, //Class for each path
        pathTitleFunc = options.pathTitleFunc?options.pathTitleFunc:function(){return '';}, //Title for each path
        pieClass = options.pieClass?options.pieClass:'marker-cluster-pie', //Class for the whole pie
        pieLabel = options.pieLabel?options.pieLabel:d3.sum(data,valueFunc), //Label for the whole pie
        pieLabelClass = options.pieLabelClass?options.pieLabelClass:'marker-cluster-pie-label',//Class for the pie label
        
        origo = (r+strokeWidth), //Center coordinate
        w = origo*2, //width and height of the svg element
        h = w,
        donut = d3.pie(),
        arc = d3.arc().innerRadius(rInner).outerRadius(r);
        
    //Create an svg element
    var svg = document.createElementNS(d3.namespaces.svg, 'svg');

    //Create the pie chart
    var vis = d3.select(svg)
        .data([data])
        .attr('class', pieClass)
        .attr('width', w)
        .attr('height', h);
        
    var arcs = vis.selectAll('g.arc')
        .data(donut.value(valueFunc))
        .enter().append('svg:g')
        .attr('class', 'arc')
        .attr('transform', 'translate(' + origo + ',' + origo + ')');
    
    arcs.append('svg:path')
        .attr('class', pathClassFunc)
        .attr('stroke-width', strokeWidth)
        .attr('d', arc)
        .append('svg:title')
          .text(pathTitleFunc);
                
    vis.append('text')
        .attr('x',origo)
        .attr('y',origo)
        .attr('class', pieLabelClass)
        .attr('text-anchor', 'middle')
        //.attr('dominant-baseline', 'central')
        //IE doesn't seem to support dominant-baseline, but setting dy to .3em does the trick
        .attr('dy','.3em')
        .text(pieLabel);
    //Return the svg-markup rather than the actual element
    return serializeXmlNode(svg);
}

/*Helper function*/
function serializeXmlNode(xmlNode) {
    if (typeof window.XMLSerializer != "undefined") {
        return (new window.XMLSerializer()).serializeToString(xmlNode);
    } else if (typeof xmlNode.xml != "undefined") {
        return xmlNode.xml;
    }
    return "";
}
