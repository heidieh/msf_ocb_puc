//TO DO:
//KML - activities - save as kmz (zip within zip)
//			       - check shifted locations still within appropriate zone (e.g. based on ray-casting algorithm, or robust-point-in-polygon)
// - sitrep export - include sitrep map as kml?



function dashboardExport() {
	console.log('export dashboard')
	let map_data;
	let sitrep_data;
	document.getElementById("modal-load-update").innerHTML = 'Création de l\'image PNG de la carte...';
	printer.printMap('A4Landscape','fname', function(map_dataUrl) {
		//console.log('map_dataUrl: ', map_dataUrl)
		if ((map_dataUrl=='') || ($('#btnCancel').hasClass('cancel'))) {
			console.log('Error printing map');
			cancelDownload();
		} else {
			map_data = map_dataUrl;
			document.getElementById("modal-load-update").innerHTML = 'Création de l\'image PNG de la carte SitRep...';
			updateSitRepActivities(colorSitRepMap);
	    	printer.options.hideClasses.push(['maplegend'])
		    printer.printMap('A4Landscape','fname', function(sitrep_dataUrl) {
		    	//console.log('sitrep_dataUrl: ', sitrep_dataUrl)
		    	if ((sitrep_dataUrl=='') || ($('#btnCancel').hasClass('cancel'))) {
					console.log('Error printing map');
					cancelDownload();
				} else {
					sitrep_data = sitrep_dataUrl;
					printer.options.hideClasses.splice(printer.options.hideClasses.indexOf('maplegend'), 1 );
					updateMap();
					writeExportFiles(map_data, sitrep_data)
				};
			});
		}
	})

};



function writeExportFiles(mappng, sitreppng) {

    const now = moment().format('YYYYMMDDHHmmss');
    const zip = new JSZip();
	

    function writeTextAndCSVs() {

    	//write .txt docs
	    document.getElementById("modal-load-update").innerHTML = 'Création et enregistrement des fichiers textes et CSV...';
	    try {
		    zip.file("Resume_filtres_et_activites_"+now+".txt", getSummaryText('all'));  
		    zip.file("Resume_alertes_sitrep_"+now+".txt", getSummaryText('alerts')); 
	    } catch(err) {
	    	console.log('Error writing text files: ', err);
	    }
	    
	    //write time series totals .csv 
	    let colHeadsTime = ['Semaine epi', 'Nombre de Cas', 'Létalité'];
	    let colFootsTime = ['TOTAL', g.currentvars.currentTotals.cas, g.currentvars.currentTotals.let.toFixed(8)];
	    const itemsTime = g.currentvars.currentTimeSeries.filter(ts => g.currentvars.currentEpiDates.all.indexOf(ts.timestamp)!=-1)
	                    .sort(function(a, b) {return a.timestamp - b.timestamp})
	                    .map(ts => ({"A": getEpiWeeks('timestamp',[ts.timestamp])[0], "B": ts.value.cas, "C": ts.value.let.toFixed(8)}) );
	    
	    try {
			zip.file("Time_series_"+now+".csv", '\uFEFF' + writeCSVFormat(colHeadsTime, colFootsTime, itemsTime));
	    } catch(err) {
	    	console.log('Error writing time series .csv file: ', err);
	    }
	    
		//write location data .csv 
		let colHeadsLoc = (g.currentvars.currentMapLyr=='prov') ? ['Province'] : ['Province', 'Zone'];
		colHeadsLoc.push('Total ('+ g.currentvars.currentEpiWeek.min + '-' + g.currentvars.currentEpiWeek.max +')');
	    let colFootsLoc = (g.currentvars.currentMapLyr=='prov') ? ['Total pour la sélection'] : ['Total pour la sélection',' '];     
	    let totalVal = (g.currentvars.currentStat.abrv=='let') ? 
	                g.currentvars.currentTotals.let.toFixed(8) :
	                g.currentvars.currentTotals.cas;
	    colFootsLoc.push(totalVal);
		let [treeProvs, treeZones] = getLocTreeNames(geonames);

		function getCurrentValue(pc) {  //return current value for that pcode or 'pas disonible'
		    return (g.currentvars.currentPolyVars.hasOwnProperty(pc)) ? g.currentvars.currentPolyVars[pc].value : 'Pas disponible';
	    }

	    let itemsLoc;
	    (g.currentvars.currentMapLyr=='prov') ? 
			(g.currentvars.currentProvs.names.length==0) ?
				//all provs listed
				itemsLoc = treeProvs.map(b => ({'A': b.text, 'B': getCurrentValue(b.id)}) ).flat()
			:
			//only selected provs 
			itemsLoc = treeProvs.filter(a => g.currentvars.currentProvs.pcodes.indexOf(a.id)!=-1)
				  .map(b => ({'A': b.text, 'B': getCurrentValue(b.id)}) ).flat()
		: (g.currentvars.currentZones.names.length==0) ?
				//all zones listed
				itemsLoc = treeZones.map(a => a.children.map(b => ({'A': a.text, 'B': b.text, 'C': getCurrentValue(b.id)}) )).flat()
			:
			//only selected zones
			itemsLoc = treeZones.map(a => ({'text': a.text, 'children': a.children.filter(b => g.currentvars.currentZones.pcodes.indexOf(b.id)!=-1) }) )  //remove non-selected children
				  .map(c => c.children.map(d => ({'A': c.text, 'B': d.text, 'C': getCurrentValue(d.id)}) )).flat()

	    let fp = (g.currentvars.currentMapLyr=='prov')? 'Prov' : 'Zone';

	    try {
			zip.file(fp+"_data_"+now+".csv", '\uFEFF' + writeCSVFormat(colHeadsLoc, colFootsLoc, itemsLoc));
	    } catch(err) {
	    	console.log('Error writing location data .csv file: ', err);
	    }
	    
    }



    function writePNGs() {

	    zip.folder('pngs');
	    document.getElementById("modal-load-update").innerHTML = 'Enregistrement des cartes PNG...';


	    function svgString2Image(svgString, width, height, format, callback) {
		    const max_pdf_width = 680;
		    const imgsrc = 'data:image/svg+xml;base64,'+ btoa( unescape( encodeURIComponent( svgString ) ) ); //convert SVG string to data URL
		    const canvas = document.createElement("canvas");
		    const context = canvas.getContext("2d");
			let dataURL = '';

		    const new_width = width;
		    const new_height = height;
		    if (width > max_pdf_width) {
		  		new_width = max_pdf_width;
		    } 
		    canvas.width = new_width;
		    canvas.height = new_height;

		    let image = new Image();
		    image.onload = function() {
			    context.clearRect ( 0, 0, new_width, new_height );
			    context.drawImage(image, 0, 0, new_width, new_height);
		    	dataURL = canvas.toDataURL();
		    	if (callback) callback(dataURL);
		    };
		 
		    image.src = imgsrc;
		}
	   
	    const svg_print = d3.select('#timeseries').select('svg');  
	    svg_print._groups[0][0].style.backgroundColor = 'white';
		const svg_width = svg_print._groups[0][0].clientWidth;
		const svg_height = svg_print._groups[0][0].clientHeight;
		const svgString = getSVGString(svg_print.node()); 
	    svgString2Image(svgString, svg_width, svg_height, 'png', function(imgData) {
	    	try {
	    		loadAsArrayBuffer(imgData, function(buffer, url) {
		            zip.folder('pngs').file('serie_chronologique_'+now+'.png', buffer); 	        
		        })
	    	} catch(err) {
	    		console.log('Error loading serie_chronologique.png: ', err);
	    	} 
	    });

		try {
			loadAsArrayBuffer(mappng, function(buffer) {
		        zip.folder('pngs').file('carte_dashboard_'+now+'.png', buffer); 
		    })
		} catch(err) {
			console.log('Error loading carte_dashboard.png: ', err);
		} 

		try {
			loadAsArrayBuffer(sitreppng, function(buffer) {
		        zip.folder('pngs').file('carte_sitrep_'+now+'.png', buffer); 
		    })
		} catch(err) {
			console.log('Error loading carte_sitrep.png: ', err);
		} finally {
			
		}

	};



	function writeKMLs(callback) {

	    zip.folder('kmls');
	    document.getElementById("modal-load-update").innerHTML = 'Création et enregistrement des fichiers KML...';


	    //KML - rivers
	    let georivStyled = JSON.parse(JSON.stringify(georiv))   //deep clone

		georivStyled.features.forEach(function(a) {
			a.properties['PUC_dshbrd_export_desc'] = 'RDC Rivieres';
		});
				
		georivStyled.features.forEach(function(a) {
			let arr = a.geometry.coordinates[0].map(c => Object.assign({}, {'x': c[0], 'y': c[1]}));
			a.geometry.coordinates[0] = simplify(arr, 0.005, true).map(c => [c['x'], c['y']]);
			a.properties['fill'] = g.mapcolors.color_rivers;
			a.properties['stroke'] = g.mapcolors.color_rivers;
			a.properties['stroke-width'] = 1;
			a.properties['desc'] = '<b>' + a.properties['PUC_dshbrd_export_desc'] + '</b>';
		})

		let kmlRiv = tokml(georivStyled, {
			//name: 'name',    //must be a property named for each object
			description: 'desc',   //must be a property named for each object
		    documentName: 'PUC RDC Rivières',
		    documentDescription: 'PUC RDC Rivières',
		    simplestyle: true,
		});

		try {
			zip.folder('kmls').file("kml_riv_"+now+".kml", new Blob([kmlRiv], { 
		        type: 'application/vnd.google-earth.kml+xml'
		    }));
		} catch(err) {
			console.log('Error loading kml file: ', err);
		}
				

		//KML - lakes
		let geolakStyled = JSON.parse(JSON.stringify(geolak))   //deep clone

		geolakStyled.features.forEach(function(a) {
			a.properties['PUC_dshbrd_export_desc'] = 'RDC Lacs';
		});

		geolakStyled.features.forEach(function(a) {
			a.properties['fill'] = g.mapcolors.color_lakes;
			a.properties['stroke'] = g.mapcolors.color_lakes;
			a.properties['stroke-width'] = 1;
			a.properties['desc'] = '<b>' + a.properties['PUC_dshbrd_export_desc'] + '</b>';
		})

		let kmlLak = tokml(geolakStyled, {
			//name: 'name',    //must be a property named for each object
			description: 'desc',   //must be a property named for each object
		    documentName: 'PUC RDC Lacs',
		    documentDescription: 'PUC RDC Lacs',
		    simplestyle: true,
		});

		try {
			zip.folder('kmls').file("kml_lak_"+now+".kml", new Blob([kmlLak], { 
		        type: 'application/vnd.google-earth.kml+xml'
		    }));
		} catch(err) {
			console.log('Error loading kml file: ', err);
		}


	    //KML - activities
		let geoacts = {};
		geoacts.type = "FeatureCollection";
		geoacts.features = [];
		let act_locs = [];

	    Object.keys(markers._layers).forEach(function(key) {  //markers are currently selected activities only
		    geoacts.features.push(JSON.parse(JSON.stringify(markers._layers[key].feature)));  //deep clone & push feature
		})

		Object.keys(geoacts.features).forEach(function(key) {
		    let a = JSON.stringify(act_locs);
		    let b = JSON.stringify(geoacts.features[key].geometry.coordinates);
		    let inPolygon = true;

		    function getRandomShift() {  
				return Math.random()/10 - 0.05;
			}

		    while ((a.indexOf(b)!=-1) || (!inPolygon)) {  //if exact point is already used by another activity
		    	//then shift point slightly by random amount
		    	let shifted0 = geoacts.features[key].geometry.coordinates[0]+getRandomShift(); //marginally shift icons so don't overlap entirely in KML
		    	let shifted1 = geoacts.features[key].geometry.coordinates[1]+getRandomShift();
		    	geoacts.features[key].geometry.coordinates = [shifted0, shifted1]
				a = JSON.stringify(act_locs);
	 			b = JSON.stringify(geoacts.features[key].geometry.coordinates);
		    }

			act_locs.push(geoacts.features[key].geometry.coordinates);
			
		});


	    //KMLs - upload activity icon images for kmls
		zip.folder('kmls').folder('images');

		let geoactivitiesStyled = JSON.parse(JSON.stringify(geoacts))   //deep clone

		geoactivitiesStyled.features.forEach(function(a) {
			a.properties['marker-symbol'] = a.properties.act_type;
		})

		geoactivitiesStyled.features.forEach(function(a) {
	        a.properties['name'] = g.activities.all.find(act => {
		        return act.act_name == a.properties['act_type'];
		    }).popup_text;
			let loc = (a.properties.zs && a.properties.prov)? a.properties.zs + ', ' + a.properties.prov :
						(a.properties.zs)? a.properties.zs :
						a.properties.prov;
			a.properties['desc'] = '<b><u>' + a.properties['name'] + '</u> - ' + g.currentvars.currentDisease + '</b><br><br><b>' + (a.properties.code_eval || a.properties.code_alt || 'Code pas disponible') + '</b><br>' + loc + '<br><i>Dates: </i>' + moment(a.properties.date_deb).format('D MMM YYYY') + ' - ' + moment(a.properties.date_fin).format('D MMM YYYY');
		})

		let acts;
		if (g.currentvars.currentActivities.length == 0) {
			acts = 'toutes les activités';
		} else {
			if (g.currentvars.currentActivities.indexOf('alerte') != -1) {
				acts = 'toutes les Alertes';
			} else {
				let sub_acts = '';
				g.activities.all.forEach(act => {
					if ((act.act_type=='alerte') && (act.btn_name!='')) {
						if (g.currentvars.currentActivities.indexOf(act.act_name) != -1) {
							sub_acts += `${act.btn_text}, `;
						}
					}
				})
				acts = (sub_acts.length > 0) ? `Alertes <i>(${sub_acts.slice(0, -2)})</i>` : ``;
			};
			if (g.currentvars.currentActivities.indexOf('evaluation') != -1) {
				if (acts.length!=0) {acts += ', '}
				acts += 'Evaluations';
			};
			if (g.currentvars.currentActivities.indexOf('intervention') != -1) {
				if (acts.length!=0) {acts += ', '}
				acts += 'Interventions';
			};
		}

		let kmlActs = tokml(geoactivitiesStyled, {
			//name: 'name',    //must be a property named for each object
			description: 'desc',   //must be a property named for each object
		    documentName: 'PUC RDC Activités',
		    documentDescription: `PUC RDC Activités (${acts}) ${g.currentvars.currentDisease}  ${g.currentvars.currentEpiWeek.min} - ${g.currentvars.currentEpiWeek.max}`,  //free text - desc for whole KML doc
		    simplestyle: true,

		});

		try {
			zip.folder('kmls').file("kml_acts_"+now+".kml", new Blob([kmlActs], { 
		        type: 'application/vnd.google-earth.kml+xml'
		    }));
		} catch(err) {
			console.log('Error loading kml file: ', err);
		}



		//KML - provs
		if (g.currentvars.currentMapLyr=='prov') {
			
		    let geoprovStyled = JSON.parse(JSON.stringify(geoprov))   //deep clone

			geoprovStyled.features.forEach(function(a) {
				let arr = a.geometry.coordinates[0].map(c => Object.assign({}, {'x': c[0], 'y': c[1]}));
				a.geometry.coordinates[0] = simplify(arr, 0.005, true).map(c => [c['x'], c['y']]);
				a.properties['fill'] = g.currentvars.currentPolyVars[a.properties.pcode].color;
				a.properties['stroke'] = g.mapcolors.color_boundary;
				a.properties['stroke-width'] = 1;
		    	let val = g.currentvars.currentPolyVars[a.properties.pcode].value;
		    	if (g.currentvars.currentStat.abrv=='let') {val = formatNumber((val*100).toFixed(2))+'%'};
				a.properties['desc'] = '<b>' + g.currentvars.currentDisease + '</b><br><i>Semaines epi: </i>' + g.currentvars.currentEpiWeek.min + '-' + g.currentvars.currentEpiWeek.max + '<br><i>' + g.currentvars.currentStat.full + ': </i>' + val;
			})
			
			let kmlProv = tokml(geoprovStyled, {
			    name: 'name',    //must be a property named for each object
			    description: 'desc',   //must be a property named for each object
			    documentName: 'PUC RDC Provinces',
			    documentDescription: 'PUC RDC Provinces ' + g.currentvars.currentDisease + ' ' + g.currentvars.currentStat.full + ' ' + g.currentvars.currentEpiWeek.min + '-' + g.currentvars.currentEpiWeek.max,  //free text - desc for whole KML doc
			    simplestyle: true,
			});

			try {
				zip.folder('kmls').file("kml_prov_"+now+".kml", new Blob([kmlProv], { 
			        type: 'application/vnd.google-earth.kml+xml'
			    }));
			} catch(err) {
				console.log('Error loading kml file: ', err);
			}


		//KML - zones & prov boundaries
		} else if (g.currentvars.currentMapLyr=='zone') {

			//KML - zones
		    let geozoneStyled = JSON.parse(JSON.stringify(geozs))   //deep clone
			geozoneStyled.features.forEach(function(a) {
				let arr = a.geometry.coordinates[0].map(c => Object.assign({}, {'x': c[0], 'y': c[1]}));
				a.geometry.coordinates[0] = simplify(arr, 0.005, true).map(c => [c['x'], c['y']]);
				let val; 
				if (g.currentvars.currentPolyVars.hasOwnProperty(a.properties.pcode)) {
		    		a.properties['fill'] = g.currentvars.currentPolyVars[a.properties.pcode].color;
		    		val = g.currentvars.currentPolyVars[a.properties.pcode].value;
		    		if (g.currentvars.currentStat.abrv=='let') {val = formatNumber((val*100).toFixed(2))+'%'};
		    	} else {
		    		val = 'Pas disponible';
		    		a.properties['fill'] = g.mapcolors.color_not_selected;
		    	}
				a.properties['stroke'] = g.mapcolors.color_boundary;
				a.properties['stroke-width'] = 1;
				a.properties['desc'] = '<b>' + g.currentvars.currentDisease + '</b><br><i>Semaines epi: </i>' + g.currentvars.currentEpiWeek.min + '-' + g.currentvars.currentEpiWeek.max + '<br><i>' + g.currentvars.currentStat.full + ': </i>' + val;
			})

			let kmlZone = tokml(geozoneStyled, {
			    name: 'name',    //must be a property named for each object
			    description: 'desc',   //must be a property named for each object
			    documentName: 'PUC RDC Zones',
			    documentDescription: 'PUC RDC Zones ' + g.currentvars.currentDisease + ' ' + g.currentvars.currentStat.full + ' ' + g.currentvars.currentEpiWeek.min + '-' + g.currentvars.currentEpiWeek.max,  //free text - desc for whole KML doc
			    simplestyle: true,
			});

			try {
				zip.folder('kmls').file("kml_zone_"+now+".kml", new Blob([kmlZone], { 
			        type: 'application/vnd.google-earth.kml+xml'
			    }));
			} catch(err) {
				console.log('Error loading kml file: ', err);
			}



		    //KML - prov boundaries
		    let geoprovboundStyled = JSON.parse(JSON.stringify(geoprovbound))   //deep clone
		    geoprovboundStyled.features.forEach(function(a) {
				a.properties['PUC_dshbrd_export_desc'] = 'RDC Frontières des Provinces';
			});

			geoprovboundStyled.features.forEach(function(a) {
				a.properties['stroke'] = '#000000';
				a.properties['stroke-width'] = 3;
				a.properties['desc'] = '<b>' + a.properties['PUC_dshbrd_export_desc'] + '</b>';
			})

			let kmlProvBound = tokml(geoprovboundStyled, {
			    description: 'desc',   //must be a property named for each object
			    documentName: 'PUC RDC Frontières des Provinces', 
			    documentDescription: 'PUC RDC Frontières des Provinces', 
			    simplestyle: true,
			});

			try {
				zip.folder('kmls').file("kml_prov_bound_"+now+".kml", new Blob([kmlProvBound], { 
			        type: 'application/vnd.google-earth.kml+xml'
			    }));
			} catch(err) {
				console.log('Error loading kml file: ', err);
			}

		}
	  

	    //list of images to add for kml icons:  
		let imageIcons = [
			imageUrl.alerte_focus[publish_to],
			imageUrl.alerte_alarme[publish_to],
			imageUrl.alerte_suivi_actif[publish_to],
			imageUrl.alerte_ferme[publish_to],
			imageUrl.alerte_NA[publish_to],
			imageUrl.evaluation[publish_to],
			imageUrl.intervention[publish_to]
		],
		index = 0;


		//console.log(imageIcons,newImageIcons)

		//load each image
		(function load() {
		    if (index < imageIcons.length) {
		    	try {
			        loadAsArrayBuffer(imageIcons[index++], function(buffer, url) {
			            let filename = imageFileName(url)
			            zip.folder('kmls').folder('images').file(filename, buffer); // image has loaded, add to archive
			            load();                        // load next image
			        })
			    } catch(err) {
					console.log('Error loading kml image file: ', err);
				}
		    }
		    else {    
		    	callback();
		    }
		})();

	};



	function writePDF() {

	    document.getElementById("modal-load-update").innerHTML = 'Création et enregistrement d\'un résumé PDF...';
		
		writeDashboardPDFKit(mappng, function(pdfblob) {
			//console.log('here is pdfblob: ', pdfblob)
			try {
				zip.file("Dashboard_extrait_"+now+".pdf", pdfblob);
			} catch(err) {
				console.log('Error loading dashboard PDF: ', err);
			}

			if ($('#btnCancel').hasClass('cancel')) {
				cancelDownload();
		    } else {
		    	document.getElementById("modal-load-update").innerHTML = 'Compressant le dossier...';                
			    zip.generateAsync({
			    	type:"blob",
			    	compression: "DEFLATE"
			    }).then(function(content) {
			        saveAs(content, "PUC_dashboard_export_"+now+".zip");  //requires FileSaver.js
	        		document.getElementById('modal-screen').style.display = "none";
		    	});
		    } 

		});
	};


	writeTextAndCSVs();
	writePNGs( writeKMLs( writePDF ) );

}


//cancel download
function cancelDownload() {
	console.log('DOWNLOAD CANCELLED')
	updateMap();
	document.getElementById('modal-screen').style.display = "none";	
	if ($('#btnCancel').hasClass('cancel')) {
		$('#btnCancel').removeClass('cancel');
	}
}

//load single image
function loadAsArrayBuffer(url, callback) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "arraybuffer";
    xhr.onerror = function() {console.log('Error loading image')};
    xhr.onload = function() {
        if (xhr.status === 200) {callback(xhr.response, url)}
        else {console.log('Error loading image')}
    };
    xhr.send();
}


function getSummaryText(opt) {
	
	let currentActs = '';
	let actText = '';
	let actList = (opt=='all')? g.currentvars.currentActivities.currentList : g.currentvars.currentActivities.sitRepAlertes;

	if (actList.length==0) {
    	currentActs = (opt=='all') ? `Pas d'activités pour cette sélection` : `Aucune alerte pour cette sélection`;
    } else {
    	actList.forEach(function(act) {
    		actText = g.activities.all.find(a => {
		        return a.act_name == act.act_type;
		    }).popup_text;

    		currentActs += `${actText} ${act.code}: ${(opt=='alerts') ? act.path + ' ' : ''}${act.zs}, ${act.prov} (${moment(act.date_deb).format('D MMM YYYY')} - ${moment(act.date_fin).format('D MMM YYYY')})\n`;
    	}) 
    }
    
    if (opt=='all') {

    	let currentVal = (g.currentvars.currentStat.abrv=='let') ? 
	                formatNumber((g.currentvars.currentTotals['let']*100).toFixed(2))+'%' :
	                g.currentvars.currentTotals[g.currentvars.currentStat.abrv];

	    return `Résumé des options choisies:\n` + 
	    		`----------------------------\n` + 
	        	`Maladie: ${g.currentvars.currentDisease}\n` +
		        `Statistique: ${g.currentvars.currentStat.full} (total = ${currentVal})\n` +
		        `Semaines epi: ${g.currentvars.currentFiltSum['epiweeks']}\n` +
		        `Dates: ${g.currentvars.currentFiltSum['dates']}\n` +
		        `Activités: ${g.currentvars.currentFiltSum['acts']}\n` + 
		        `${g.currentvars.currentFiltSum['locs']}\n\n\n` + 
		        `Résumé des activités pour la sélection:\n` + 
		        `---------------------------------------\n` + 
		        `${currentActs}\n`;

	} else {

	    return `Résumé des Alertes (Alarme, Focus, Suivi Actif):\n` + 
			    `------------------------------------------------\n` +
			    `(pour toutes les maladies, dans toutes les locations)\n` + 
			    `Semaines epi: ${g.currentvars.currentFiltSum['epiweeks']}\n` + 
			    `Dates: ${g.currentvars.currentFiltSum['dates']}\n\n` + 
			    `${currentActs}\n`;
	
	}

};



function writeCSVFormat(colHeads, colFoots, items) {

	let csv = '';
	for (let h in colHeads) {
        csv += colHeads[h] + ((h<colHeads.length-1) ? ',' : '\r\n');
    }
    for (let row = 0; row < items.length; row++){
        let keysAmount = Object.keys(items[row]).length
        let keysCounter = 0

        for (let key in items[row]) {
            csv += items[row][key] + (keysCounter+1 < keysAmount ? ',' : '\r\n' )
            keysCounter++
        }
        keysCounter = 0
    }
    //output totals on last row
    for (let h in colFoots) {
        csv += colFoots[h] + ((h<colFoots.length-1) ? ',' : '\r\n');
    }
    return csv;
}

