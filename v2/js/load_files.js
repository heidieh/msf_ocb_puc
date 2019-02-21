
var files = [
    ['libs','libs/jquery.js'],

    ['css','css/bootstrap-grid.min.css'],
    ['css','css/introjs.css'],
    ['css', 'css/MarkerCluster.css'],
    ['css', 'css/activity_clusters.css'],
    ['css','css/site.css'],
    ['css','css/leaflet.css'],
    ['css','css/leaflet.defaultextent.css'],
    ['css','css/leaflet.contextmenu.min.css'],
    ['css','css/leaflet.fullscreen.css'],
    ['css','css/leaflet.zoombox.css'],
    ['css','css/selectivity.css'],

    ['libs','libs/d3.v5.min.js'],
    ['libs','libs/leaflet.js'],
    ['libs','libs/FileSaver.min.js'],
    ['libs','libs/jszip.min.js'],
    ['libs','libs/simplify.js'],
    ['libs','libs/dom-to-image.min.js'],
    ['libs','libs/leaflet.defaultextent.js'],
    ['libs','libs/leaflet.contextmenu.min.js'],
    ['libs','libs/leaflet.fullscreen.min.js'],
    ['libs','libs/leaflet.markercluster.js'],
    ['libs','libs/leaflet.zoombox.min.js'],
    ['libs','libs/pdfkit.js'],
    ['libs','libs/blob-stream.js'],
    ['libs','libs/svg-to-pdfkit.js'],
    ['libs','libs/topojson.v1.min.js'],
    ['libs','libs/crossfilter.v1.min.js'],
    ['libs','libs/intro.js'],
    ['libs','libs/topojson-client.min.js'],
    ['libs','libs/moment.js'],
    ['libs','libs/moment-isocalendar.js'],
    ['libs','libs/selectivity.min.js'],

    ['js','js/global.js'],
    ['js','js/tokml.js'],  
    ['js','js/leaflet-easyprint.js'],  
    ['js','js/exportpdf.js'],
    ['js','js/exports.js'],   
    ['js','js/epitime.js'],   
    ['js','js/moment-fr.js'],  
    ['js','js/intro_tour.js'],
    ['js','js/activity_clusters.js'],
    ['js','js/site.js'],
];

function load_libraries(files) {
    inc_count = -1;
    inc_total = files.length - 1;

    var loadScript = function(files, callback){
        if (inc_count < inc_total){
            inc_count++;
            var file = files[inc_count];          
            if (file[0] == 'css'){
                document.getElementsByTagName("head")[0].innerHTML += ("<link href=\"" + file[1] + "\" rel=\"stylesheet\" type=\"text/css\">");
                callback(files, callback);
            } else if((file[0] == 'js') || (file[0] == 'libs') || (file[0] == 'data')){
                var script = document.createElement("script")
                script.type = "text/javascript";
                if(script.readyState){   //IE
                    script.onreadystatechange = function(){
                        if(script.readyState == "loaded" || script.readyState == "complete") {
                            script.onreadystatechange = null;
                            callback(files, callback);
                        }
                    };

                } else {   //Others
                    script.onload = function () {
                        callback(files, callback);
                    };
                }
                script.src = file[1];
                document.getElementsByTagName("head")[0].appendChild(script);
            }
            //console.log("Loaded ", file);
        }  
    }; 
    loadScript(files, loadScript);
}

load_libraries(files);

