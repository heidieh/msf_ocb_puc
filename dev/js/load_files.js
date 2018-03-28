
var files = [
    ['js','js/jquery.js'],
    ['js','js/jquery-ui.min.js'],
    ['css','css/bootstrap-grid.min.css'],
    ['css','css/introjs.css'],
    ['css', 'css/MarkerCluster.css'],
    ['css', 'css/activity_clusters.css'],
    ['css','css/site.css'],
    ['css','css/load_data.css'],
    ['css','css/leaflet.css'],
    ['css','css/leaflet.defaultextent.css'],
    ['js','js/leaflet.js'],
    ['js','js/leaflet.defaultextent.js'],
    ['js','js/leaflet.markercluster.js'],
    ['js','js/topojson.v1.min.js'],
    ['js','js/d3.v4.min.js'],
    ['js','js/crossfilter.v1.min.js'],
    ['js','js/intro.js'],
    ['js','js/topojson-client.min.js'],
    ['data','data/geonames.js'],
    ['js','js/epitime.js'],
    ['js','js/intro_tour.js'],
    ['js','js/load_data.js'],
    ['js','js/activity_clusters.js'],
    ['js','js/site.js'],
];

function load_libraries(files) {
    inc_count = -1;
    inc_total = files.length - 1;
    var loadScript = function(files, callback){
        if(inc_count < inc_total){
            inc_count++;
            var file = files[inc_count];
            if(file[0] == 'css'){
                document.getElementsByTagName("head")[0].innerHTML += ("<link href=\"" + file[1] + "\" rel=\"stylesheet\" type=\"text/css\">");
                callback(files, callback);
            }else if((file[0] == 'js') || (file[0] == 'data')){
                var script = document.createElement("script")
                script.type = "text/javascript";
                if(script.readyState){   //IE
                    script.onreadystatechange = function(){
                        if(script.readyState == "loaded" || script.readyState == "complete") {
                            script.onreadystatechange = null;
                            callback(files, callback);
                            //console.log("callback ", file)
                        }
                    };

                } else {   //Others
                    script.onload = function () {
                        callback(files, callback);
                        //console.log("callback ", file)
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

