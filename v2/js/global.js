const publish_to = 'github';  //local or github - affects image paths

const imageUrl = {
    alerte_alarme: {local: "../images/alerte_alarme.png", github: "images/alerte_alarme.png"},
    alerte_focus: {local: "../images/alerte_focus.png", github: "images/alerte_focus.png"},
    alerte_suivi_actif: {local: "../images/alerte_suivi_actif.png", github: "images/alerte_suivi_actif.png"},
    alerte_ferme: {local: "../images/alerte_ferme.png", github: "images/alerte_ferme.png"},
    alerte_NA: {local: "../images/alerte_NA.png", github: "images/alerte_NA.png"},
    evaluation: {local: "../images/evaluation.png", github: "images/evaluation.png"},
    intervention: {local: "../images/intervention.png", github: "images/intervention.png"},
    msf_logo: {local: "../images/msf-logo.png", github: "images/msf-logo.png"},
    fullscreen: {local: "../images/fullscreen.png", github: "images/fullscreen.png"},
    exit_fullscreen: {local: "../images/exit_fullscreen.png", github: "images/exit_fullscreen.png"},
}
function imageFileName(url) {
    switch (publish_to) {
        case 'local': return url.substr(10);
        case 'github': return url.substr(7);
        default: return url.substr(10);
    }

};


let map;

var geoprov, geozs, geoprovbound, georiv, geolak, geoacts;

const geojsonClusterPath = 'data/act_data.geojson'; //for github
//const geojsonClusterPath = 'getActivities';       //for app

const GISLayers = [
                {fname: "rdc_zs", varname: 'geozs', gjname: 'geojson_zone', stylename: 'style', highlight: true, onload: false}, 
                {fname: "rdc_prov", varname: 'geoprov', gjname: 'geojson_prov', stylename: 'style', highlight: true, onload: true}, 
                {fname: "rdc_prov_bound", varname: 'geoprovbound', gjname: 'geojson_prov_bound', stylename: 'style_prov_bound', onload: false, bringToFront: true}, 
                {fname: "rdc_rivers", varname: 'georiv', gjname: 'geojson_riv', stylename: 'style_riv', onload: true, bringToFront: true}, 
                {fname: "rdc_lakes", varname: 'geolak', gjname: 'geojson_lak', stylename: 'style_lak', onload: true}
            ];

let legendSvg;
let svg1, svg2;

const defaultMapCenter = [-4.0, 22.0];
const defaultZoomLevel = 4.75;  

const select_disease = document.getElementById("disease-select");
const select_stat = document.getElementById("stat-select");


let g = {};
//console.log("g = ", g);
let data;
let currentMapData;
let cf;
let playInterval;
const slideDuration = 1200; //in milliseconds
const autoRewind = false;   //automatically repeat from beginning
const ms_1_wk = 604800000;  //milliseconds in 1 week

let defaultEpiRange;

let geonames = [];
let selectProvs, selectZones;

const margin = {};
margin['#timeseries'] = {top: 10, right: 60, bottom: 20, left: 70}; //margins of x- and y-axes within svg  
margin['#timeseriesbrush'] = {top: 10, right: 60, bottom: 20, left: 70};
margin['#maplegend'] = {top: 0, right: 18, bottom: 0, left: 14, shift_right: 25};



//Statistics to display
g.statList = [
{
    abrv: 'cas',
    full: 'Nombre de Cas',
    color_scale: 'YlBr'
},
{
    abrv: 'let',
    full: 'Létalité',
    color_scale: 'Red'
}];



//Map colors
g.mapcolors = {};
g.mapcolors.color_scale = {};
g.mapcolors.color_scale.YlBr = {
    color_zero: '#FFFFE5',  
    color_min: '#ffffcc',
    color_max: '#800026'
};
g.mapcolors.color_scale.Red = {
    color_zero: '#FEEFE8', 
    color_min: '#fee0d2',
    color_max: '#a50f15'
};
//g.mapcolors.color_zero = '#ffffff';
g.mapcolors.color_not_selected = '#d3d3d3';  
g.mapcolors.color_boundary = '#800080'; 
g.mapcolors.color_rivers = '#1673ae';
g.mapcolors.color_lakes = '#1673ae';
g.mapcolors.playbar_color = '#4d4d4d';


//Time range buttons
g.timerangebuttons = [
{
    id: 'btnTimeRange_4epiweek',
    range_type: 'epiweek',
    range_param: 4,
    text: '4 dernières semaines-epi'
},
{
    id: 'btnTimeRange_8epiweek',
    range_type: 'epiweek',
    range_param: 8,
    text: '8 dernières semaines-epi'
},
{
    id: 'btnTimeRange_12epiweek',
    range_type: 'epiweek',
    range_param: 12,
    text: '12 dernières semaines-epi'
},
{
    id: 'btnTimeRange_52epiweek',
    range_type: 'epiweek',
    range_param: 52,
    text: '52 dernières semaines-epi'
}/*,
{
    id: 'btnTimeRange_1epimonth',
    range_type: 'epimonth',
    range_param: 1,
    text: 'Dernier mois-epi complet'
},
{
    id: 'btnTimeRange_3epimonth',
    range_type: 'epimonth',
    range_param: 3,
    text: 'Derniers 3 mois-epi complet'
}*/];
g.timerangebuttons.default_btn = g.timerangebuttons[2];


//Activities 
g.activities = {}
g.activities.fields = {};
g.activities.fields.categoryField = 'act_type'; //fieldname for marker category (used in pie)

g.activities.labels = {
    code_alt: 'Code d\'alerte',
    code_eval: 'Code d\'évaluation',
    act_type: 'Type d\'activité',
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
    src_detec: 'Source',//de détection
    cum_cas: 'Cas cumulatifs',
    cum_dec: 'Décès cumulatifs',
    opd: 'OPD',
    ipd: 'IPD',
    tbi: 'Total des bénéficiaires'
};

g.activities.all = [        
{
    act_name: 'alerte',
    act_type: 'alerte',
    btn_name: '#btnAlt',
    btn_text: 'Toutes les Alertes',
    popup_text: 'Alertes'
},
{
    act_name: 'alerte_alarme',
    act_type: 'alerte',
    btn_name: '#btnAltAlarme',
    btn_text: 'Alarme',
    popup_text: 'Alerte Alarme'
},
{
    act_name: 'alerte_focus',
    act_type: 'alerte',
    btn_name: '#btnAltFocus',
    btn_text: 'Focus',
    popup_text: 'Alerte Focus'
},
{
    act_name: 'alerte_suivi_actif',
    act_type: 'alerte',
    btn_name: '#btnAltSuiviActif',
    btn_text: 'Suivi Actif',
    popup_text: 'Alerte Suivi Actif'
},
{
    act_name: 'alerte_ferme',
    act_type: 'alerte',
    btn_name: '#btnAltFerme',
    btn_text: 'Fermé',
    popup_text: 'Alerte Fermé'
},
{
    act_name: 'alerte_NA',
    act_type: 'alerte',
    btn_name: '',
    btn_text: 'Type non disponible',
    popup_text: 'Alerte (type non disponible)'
},
{
    act_name: 'evaluation',
    act_type: 'evaluation',
    btn_name: '#btnEval',
    btn_text: 'Evaluation',
    popup_text: 'Evaluation'
},
{
    act_name: 'intervention',
    act_type: 'intervention',
    btn_name: '#btnInt',
    btn_text: 'Intervention',
    popup_text: 'Intervention'
}];
g.activities.pies = {};



//SVG patterns
// SVG injection:
let svg = d3.select("#map").append("svg").attr("id", "d3svg")

//Define patterns 
let defs = svg.append("defs")

let patternEval = defs.append("pattern")
        .attr('id', 'diagEval')
        .attr('width', 4)
        .attr('height', 4)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(45)')
    patternEval.append('rect')
        .attr('width', 2)
        .attr('height', 4)
        .attr('transform', 'translate(0,0)')
        .attr('fill', '#ffa500')
    patternEval.append('rect')
        .attr('width', 2)
        .attr('height', 4)
        .attr('transform', 'translate(2,0)')
        .attr('fill', '#b27300')

let patternInt = defs.append("pattern")
        .attr('id', 'diagInt')
        .attr('width', 4)
        .attr('height', 4)
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('patternTransform', 'rotate(45)')
    patternInt.append('rect')
        .attr('width', 2)
        .attr('height', 4)
        .attr('transform', 'translate(0,0)')
        .attr('fill', '#db0000')
    patternInt.append('rect')
        .attr('width', 2)
        .attr('height', 4)
        .attr('transform', 'translate(2,0)')
        .attr('fill', '#990000')


