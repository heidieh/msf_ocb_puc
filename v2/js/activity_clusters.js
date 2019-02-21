let rmax = 30; //max radius for cluster pies*/

let markerClusters = L.markerClusterGroup ({ //define markerClusters as cluster group 
    maxClusterRadius: 2 * rmax,
    iconCreateFunction: defineClusterIcon //builds dataset and pie
});


function checkDates(featprops) {
    let dateValid;

    function* MinDateIterator(fprop) {
        yield fprop.date_sit;
        yield fprop.date_det;
        yield fprop.date_part;
        yield fprop.date_dep;
        yield fprop.date_deb;
    }
    function* MaxDateIterator(fprop) {
        yield fprop.date_ferm;
        yield fprop.date_fin;
        yield fprop.date_ret_equipe;
    }

    //get min & max dates defined for activity
    let min_dates = [],
        max_dates = [];

    for (let date of MinDateIterator(featprops)) {
        if (date!=undefined) min_dates.push(parseInt(moment(date).format('X')));
    }
    for (let date of MaxDateIterator(featprops)) {
        if (date!=undefined) max_dates.push(parseInt(moment(date).format('X')));
    }

    let minDate, maxDate;
    if ((min_dates.length == 0) && (max_dates.length == 0)) { //if no dates available don't display marker
        dateValid = false;
    } else {
        if (min_dates.length == 0) {        //if no 'start' dates available
            minDate = Math.min(...max_dates); 
            maxDate = Math.max(...max_dates);
        } else if (max_dates.length == 0) { //if no 'end' dates available
            minDate = Math.min(...min_dates);  
            maxDate = Math.max(...min_dates);
        } else {                            //if both 'start' and 'end' dates available
            minDate = Math.min(...min_dates);  
            maxDate = Math.max(...max_dates);
        };

        if (g.currentvars.currentAnimation.playMode == 'stop') {
            dateValid = ((g.currentvars.currentEpiDates.min <= maxDate) && (parseInt(moment.unix(g.currentvars.currentEpiDates.max).add(7,'day').format('X')) > minDate));
        } else {
            dateValid = ((g.currentvars.currentAnimation.currentEpiDate <= maxDate) && (parseInt(moment.unix(g.currentvars.currentAnimation.currentEpiDate).add(7,'day').format('X')) > minDate));
        };
    };

    return dateValid;

}


function defineMarkerFeature(feature, latlng) { //define which markers to show at any time

    if (feature.properties[g.activities.fields.categoryField]=='alerte_fermé') {
        feature.properties[g.activities.fields.categoryField]='alerte_ferme'
    }
    let categoryVal = feature.properties[g.activities.fields.categoryField];
    let diseaseVal = feature.properties['path'];

    let myClass = `marker category-${categoryVal} icon-${categoryVal}`;
    let myIcon = L.divIcon({
        className: myClass,
        iconSize: null
    });

    let dateCheck = checkDates(feature.properties);

    let diseaseCheck = (diseaseVal == g.currentvars.currentDisease);
    let locationCheck = (((g.currentvars.currentZones.pcodes.length == 0) && (g.currentvars.currentProvs.pcodes.length == 0)) || ((g.currentvars.currentZones.pcodes.indexOf(feature.properties['zs_pc']) != -1) && (g.currentvars.currentProvs.pcodes.length == 0)) || ((g.currentvars.currentProvs.pcodes.indexOf(feature.properties['prov_pc']) != -1) && (g.currentvars.currentZones.pcodes.length == 0)));
    let menuOptionCheck = (g.currentvars.currentActivities.indexOf(categoryVal) != -1);
    
    //only return marker to display if all checks true
    return (diseaseCheck && dateCheck && locationCheck && menuOptionCheck) ? L.marker(latlng, { icon: myIcon }) : null;
}


function defineSitRepMarkerFeature(feature, latlng)  { //define which markers to show for sitRep

    let categoryVal = feature.properties[g.activities.fields.categoryField];
    let diseaseVal = feature.properties['path'];

    let myClass = `marker category-${categoryVal} icon-${categoryVal}`;
    let myIcon = L.divIcon({
        className: myClass,
        iconSize: null
    });

    let dateCheck = checkDates(feature.properties);
    let alertCheck = ((categoryVal.substr(0,6)=='alerte') && (categoryVal!='alerte_ferme'));

    return (dateCheck && alertCheck) ? L.marker(latlng, { icon: myIcon }) : null;

}

function defineMarkerFeaturePopup(feature, layer) {
    let props = feature.properties;

    let act = g.activities.all.find(act => {
        return act.act_name == props['act_type'];
    })

    //popup heading
    let popupContent = `<div class="heading">`;
    if (act.act_type == 'alerte') {
        popupContent += `<div class="popup_icon"><img src="images/${props['act_type']}.png" width="20" height="20"></img></div>`;
    } else {
        popupContent += `<div class="popup_icon icon-${act.act_type}"></div>`;
    }

    let fullyear = props['date_deb'].getFullYear()
    let pathLinked = ''
    if (fullyear)
    {
        let path = ""
        if (navigator.appVersion.indexOf("Mac") != -1)
        {
            path = ["smb://nestor/PUC_III_ARCHIVAGE - BASE DONNEES"]
        }
        else
        {
            path = ["file:///\\\\nestor/PUC_III_ARCHIVAGE - BASE DONNEES"]
        }

        path.push(fullyear)
        if (act.act_type == "alerte")
        {
            path.push(fullyear + "_1_ALERTES")
            if (props['sent'])
            {
                path.push("Sentinelle_" + props['sent'].toUpperCase() + "_" + fullyear)
            }
        }
        else if (act.act_type == "evaluation")
        {
            path.push(fullyear + "_2_EVALUATIONS")
        }
        else if (act.act_type == "intervention")
        {
            path.push(fullyear + "_3_INTERVENTIONS")
        }
        pathLinked = path.join("/")
    }
    
    popupContent += `<span class="headingtext">${act.popup_text}</span><span class="popup_icon serve_icon"><a href="${pathLinked}" target=pucnestor><img src="images/servefile.png" width="24" height="24"></a></span></div><hr>`;


    function addContentLines(size, ...keys) {
        let sfx='';
        if (size=='small') {
            sfx='-sm'
        }
        keys.forEach(key => {
            if ((props[key] != null) && (props[key] != '')) {
                if (key.substr(0,5)=='date_') {
                    popupContent += `<span class="attribute${sfx}"><span class="label${sfx}">${g.activities.labels[key]}:</span> ${moment(props[key]).format('ddd D MMM YYYY')}</span>`;
                } else {
                    popupContent += `<span class="attribute${sfx}"><span class="label${sfx}">${g.activities.labels[key]}:</span> ${props[key]}</span>`;
                }
            }
        })
    }

    //popup info - main
    if ((act.act_type == 'alerte') || (act.act_type == 'evaluation'))
    {
        let code_alt = props['code_alt'] == '' ? '<i>Indisponible</i>' : props['code_alt'];
        popupContent += `<span class="attribute"><span class="label">${g.activities.labels['code_alt']}:</span> ${code_alt}</span>`;
    }
    if ((act.act_type == 'evaluation') || (act.act_type == 'intervention'))
    {
        let code_eval = props['code_eval'] == '' ? '<i>Indisponible</i>' : props['code_eval'];
        popupContent += `<span class="attribute"><span class="label">${g.activities.labels['code_eval']}:</span> ${code_eval}</span>`;
    }

    popupContent += `<span class="attribute"><span class="label">${g.activities.labels['loc']}:</span> ${props['zs']}, ${props['prov']}</span>`;
    
    if ((act.act_type == 'alerte') || (act.act_type == 'evaluation')) {
        addContentLines('', 'sent')
    }

    addContentLines('', 'path')

    
    //popup info - small
    if (act.act_type == 'alerte') {
        addContentLines('small', 'typ_detec', 'src_detec', 'cum_cas', 'cum_dec');
    }
    if ((act.act_type == 'evaluation') || (act.act_type == 'intervention')) {
        addContentLines('small', 'opd', 'ipd');
    }
    if (act.act_type == 'intervention') {
        addContentLines('small', 'tbi');
    };

    popupContent += `<hr>`;

    addContentLines('small', 'date_deb', 'date_fin');

    popupContent += `<hr>`;

    addContentLines('small', 'comm');

    popupContent = `<div class="map-popup">${popupContent}</div>`;
    layer.bindPopup(popupContent,
    {
        offset: L.point(1, -2)
    });
};


function defineClusterIcon(cluster) {
    let act_name = '';

    let children = cluster.getAllChildMarkers(),
        n = children.length, //number of markers in cluster
        strokeWidth = 1, //set clusterpie stroke width
        r = rmax - 2 * strokeWidth - (n < 10 ? 12 : n < 100 ? 8 : n < 1000 ? 4 : 0), //calculate clusterpie radius...
        iconDim = (r + strokeWidth) * 2, //...and divIcon dimensions (for leaflet)
        data = d3.nest() //build dataset for pie chart
            .key(function(d) { 
                    return d.feature.properties[g.activities.fields.categoryField];
            })
            .entries(children, d3.map),
        //bake some svg markup
        html = bakeThePie(
            {
                data: data,
                valueFunc: function(d) { return d.values.length },
                strokeWidth: 1,
                outerRadius: r,
                innerRadius: r - 10,
                pieClass: 'cluster-pie',
                pieLabel: n,
                pieLabelClass: 'marker-cluster-pie-label',
                pathClassFunc: function(d) { return "category-" + d.data.key },
                pathTitleFunc: function(d) {
                    let act_name = g.activities.all.find(act => {
                        return act.act_name == d.data.key;
                    }).popup_text;
                    return `${act_name} (${d.data.values.length} activité${(d.data.values.length != 1 ? 's' : '')})`;
                }
            }),
        //create new divIcon and assign svg markup to html property
        myIcon = new L.DivIcon(
            {
                html: html,
                className: 'marker-cluster',
                iconSize: new L.Point(iconDim, iconDim)
            });

    return myIcon;
}

//function that generates svg markup for pie chart
function bakeThePie(options)
{
    //data and valueFunc are required
    if (!options.data || !options.valueFunc)
    {
        return '';
    }
    var data = options.data,
        valueFunc = options.valueFunc,
        r = options.outerRadius ? options.outerRadius : 28, //default outer radius = 28px
        rInner = options.innerRadius ? options.innerRadius : r - 10, //default inner radius = r-10
        strokeWidth = options.strokeWidth ? options.strokeWidth : 1, //default stroke is 1
        pathClassFunc = options.pathClassFunc ? options.pathClassFunc : function() {
            return '';
        }, //class for each path
        pathTitleFunc = options.pathTitleFunc ? options.pathTitleFunc : function() {
            return '';
        }, //Title for each path
        pieClass = options.pieClass ? options.pieClass : 'marker-cluster-pie', //class for the whole pie
        pieLabel = options.pieLabel ? options.pieLabel : d3.sum(data, valueFunc), //label for the whole pie
        pieLabelClass = options.pieLabelClass ? options.pieLabelClass : 'marker-cluster-pie-label', //Class for the pie label

        origo = (r + strokeWidth), //center coordinate
        w = origo * 2, //width and height of the svg element
        h = w,
        donut = d3.pie(),
        arc = d3.arc().innerRadius(rInner).outerRadius(r);

    //Create svg element
    var svg = document.createElementNS(d3.namespaces.svg, 'svg');

    //Create pie chart
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
        .attr('fill', function(d) {
            if (d.data.key=='evaluation') {
                return "url(#diagEval)"
            } else if (d.data.key=='intervention') {
                return "url(#diagInt)"
            }
        })
        .attr('d', arc)
        .append('svg:title')
        .text(pathTitleFunc);

    vis.append('text')
        .attr('x', origo)
        .attr('y', origo)
        .attr('class', pieLabelClass)
        .attr('text-anchor', 'middle')
        //.attr('dominant-baseline', 'central')
        //IE doesn't seem to support dominant-baseline, but setting dy to .3em works
        .attr('dy', '.3em')
        .text(pieLabel);
    //return svg-markup (not actual element)
    return serializeXmlNode(svg);
}


/*Helper function*/
function serializeXmlNode(xmlNode)
{
    if (typeof window.XMLSerializer != "undefined")
    {
        return (new window.XMLSerializer()).serializeToString(xmlNode);
    }
    else if (typeof xmlNode.xml != "undefined")
    {
        return xmlNode.xml;
    }
    return "";
}
