
//Functions to handle svg exporting
function getSVGString(svgNode) {
    svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
	let cssStyleText = getCSSStyles( svgNode );
	appendCSS( cssStyleText, svgNode );

	let serializer = new XMLSerializer();
	let svgString = serializer.serializeToString(svgNode);
	svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
	svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix
	return svgString;

    function getCSSStyles(parentElement) {
	    let selectorTextArr = [];

	    // Add Parent element Id and Classes to the list
	    selectorTextArr.push( '#'+parentElement.id );
	    for (let c = 0; c < parentElement.classList.length; c++)
	        if ( !contains('.'+parentElement.classList[c], selectorTextArr) )
	          	selectorTextArr.push( '.'+parentElement.classList[c] );

			    // Add Children element Ids and Classes to the list
			    let nodes = parentElement.getElementsByTagName("*");
			    for (let i = 0; i < nodes.length; i++) {
			        let id = nodes[i].id;
			        if ( !contains('#'+id, selectorTextArr) )
			        	selectorTextArr.push( '#'+id );

			        let classes = nodes[i].classList;
			        for (let c = 0; c < classes.length; c++)
			        	if ( !contains('.'+classes[c], selectorTextArr) )
			          		selectorTextArr.push( '.'+classes[c] );
	    		}

	    // Extract CSS Rules
	    let extractedCSSText = "";
	    for (let i = 0; i < document.styleSheets.length; i++) {
	        let s = document.styleSheets[i]; 
	        try {
	            if(!s.cssRules) continue;
	        } catch( e ) {
	            if(e.name !== 'SecurityError') throw e; // for Firefox
	            continue;
	        }

	        let cssRules = s.cssRules;
	        for (let r = 0; r < cssRules.length; r++) {
		        if ( contains( cssRules[r].selectorText, selectorTextArr ) )
		            extractedCSSText += cssRules[r].cssText;
		    }

	    }
	    
	    return extractedCSSText;

	    function contains(str,arr) {
	        return arr.indexOf( str ) === -1 ? false : true;
	    }

    }

    function appendCSS( cssText, element ) {
	    let styleElement = document.createElement("style");
	    styleElement.setAttribute("type","text/css"); 
	    styleElement.innerHTML = cssText;
	    let refNode = element.hasChildNodes() ? element.children[0] : null;
	    element.insertBefore( styleElement, refNode );
    }

}


//Function to handle img exporting
function getDataUri(url, callback) {             
    let image = new Image();
    image.onload = function () {
        let canvas = document.createElement('canvas');
        canvas.width = this.naturalWidth;
        canvas.height = this.naturalHeight;
        let ctx = canvas.getContext('2d');
        //ctx.fillStyle = '#fff';  //set white fill style for background -in case png has transparent background
        //ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(this, 0, 0);
        callback(canvas.toDataURL('image/png'));
    };
    image.src = url;                
}


//Summary of selected filters
function writeFiltSum(doc, filtTop, callback) {	

	function writeToDoc(callback) {
		doc.fontSize(10)
		   .font('Helvetica-Bold')
		   .text('Résumé des options sélectionnées:', 70, filtTop);

		doc.fontSize(10)
		   .font('Helvetica-Oblique')
		   .text('Pathologie:', 70, filtTop+15);
		doc.font('Helvetica')
		   .text(g.currentvars.currentDisease, 160, filtTop+15)

		doc.font('Helvetica-Oblique')
		   .text('Statistique:', 70, filtTop+30);
		doc.font('Helvetica')
		   .text(g.currentvars.currentStat.full, 160, filtTop+30)

		doc.font('Helvetica-Oblique')
		   .text('Semaines epi:', 70, filtTop+45);
		doc.font('Helvetica')
		   .text(g.currentvars.currentFiltSum['epiweeks'] + ' (' + g.currentvars.currentFiltSum['dates'] + ')', 160, filtTop+45)

		doc.font('Helvetica-Oblique')
		   .text('Activités sélectionnées:', 70, filtTop+60);
		doc.font('Helvetica')
		   .text(g.currentvars.currentFiltSum['acts'], 185, filtTop+60)

		doc.font('Helvetica-Oblique')
		   .text('Régions sélectionnées:', 70, filtTop+75);
		doc.font('Helvetica')
		   .text(g.currentvars.currentFiltSum['locs'], 185, filtTop+75)

		callback();
	};

	writeToDoc(callback)

};



//Draw Legend 
function drawLegend(doc, legend_left, legend_top, callback) {

	let legendIcons = [ {'url': '../images/alerte_alarme.png', 'marg-left': 10, 'marg-top': 40, 'width': 15},
						{'url': '../images/alerte_focus.png', 'marg-left': 10, 'marg-top': 60, 'width': 15},
						{'url': '../images/alerte_suivi_actif.png', 'marg-left': 10, 'marg-top': 80, 'width': 15},
						{'url': '../images/alerte_ferme.png', 'marg-left': 10, 'marg-top': 100, 'width': 15},
						{'url': '../images/evaluation.png', 'marg-left': 4, 'marg-top': 130, 'width': 20},
						{'url': '../images/intervention.png', 'marg-left': 4, 'marg-top': 156, 'width': 20}];

	let count = 0;
	legendIcons.forEach(function(icon, i) {
    	getDataUri(icon['url'], function (dataUri) {                 
	        doc.image(dataUri, legend_left+icon['marg-left'], legend_top+icon['marg-top'], {width: icon['width']});	        
	        if (count==legendIcons.length-1) {
	        	callback(doc); 
	        }
	        count++;
	    });
    });					
	
	doc.font('Helvetica-Bold')
	   .fontSize(10)
	   .text('Légende des activités', legend_left-20, legend_top+10)

    und_width = doc.widthOfString('Alertes')
    und_height = doc.currentLineHeight()
	doc.font('Helvetica')
	   .underline(legend_left+10, legend_top+25, und_width, und_height)
	   .text('Alertes', legend_left+10, legend_top+25)

    doc.font('Helvetica')
    	.text('Alarme', legend_left+35, legend_top+42)

    doc.font('Helvetica')
    	.text('Focus', legend_left+35, legend_top+62)

    doc.font('Helvetica')
    	.text('Suivi Actif', legend_left+35, legend_top+82)

    doc.font('Helvetica')
       .text('Fermé', legend_left+35, legend_top+102)

    doc.font('Helvetica')
       .text('Evaluation', legend_left+28, legend_top+136)
   	
    doc.font('Helvetica')
       .text('Intervention', legend_left+28, legend_top+161)


	//draw svg of sample pie cluster for legend
   	let cntrX = legend_left+10;
   	let cntrY = legend_top+205;
   	let radXout = 13;
   	let radYout = 10;
   	let radXin = 5.5;
   	let radYin = 4;
   	doc.fontSize(8).font('Helvetica-Bold').fillColor('#505050').text('4', cntrX-2, cntrY-3)

   	doc.save();  //save doc before clip
   	doc.path('M'+cntrX+' '+(cntrY-radYout)+' C '+(cntrX+radXout)+' ' +(cntrY-radYout)+' ' +(cntrX+radXout)+' '+(cntrY+radYout)+' '+cntrX+' ' +(cntrY+radYout)+' L ' +cntrX+' ' +(cntrY+radYin)+ ' C ' + (cntrX+radXin)+' ' +(cntrY+radYin)+' ' + (cntrX+radXin)+' ' +(cntrY-radYin)+' '+(cntrX)+' ' +(cntrY-radYin) +'Z')   		
   	   .clip();

   	doc.rotate(45, {origin: [cntrX, cntrY]});
		for (let row = 0; row < 15; row++) {
		    const color = (row % 2) ? '#b27300' : "#ffa500";   //orange stripes - evaluations 
		    doc.rect(cntrX-10+(row * 2), cntrY-4-radYout, 2, 20)
		       .fill(color);
		}

	doc.rotate(-45, {origin: [cntrX, cntrY]});
	doc.path('M'+cntrX+' '+(cntrY-radYout)+' C '+(cntrX+radXout)+' ' +(cntrY-radYout)+' ' +(cntrX+radXout)+' '+(cntrY+radYout)+' '+cntrX+' ' +(cntrY+radYout)+' L ' +cntrX+' ' +(cntrY+radYin)+ ' C ' + (cntrX+radXin)+' ' +(cntrY+radYin)+' ' + (cntrX+radXin)+' ' +(cntrY-radYin)+' '+(cntrX)+' ' +(cntrY-radYin) +'Z')   		
	   	.lineWidth(0.5)
	   	.stroke('#000000')
	   	.fillOpacity(0)

	doc.restore();  //restore doc after clip

	doc.path('M'+cntrX+' '+(cntrY-radYout)+' C '+(cntrX-radXout)+' ' +(cntrY-radYout)+' ' +(cntrX-radXout)+' '+(cntrY+radYout)+' '+cntrX+' ' +(cntrY+radYout)+' L ' +cntrX+' ' +(cntrY+radYin)+ ' C ' + (cntrX-radXin)+' ' +(cntrY+radYin)+' ' + (cntrX-radXin)+' ' +(cntrY-radYin)+' '+(cntrX)+' ' +(cntrY-radYin) +'Z')   		   
   	   .lineWidth(0.5)                   
   	   .fillAndStroke("#76D42C", "#559a1e")		//green - suivi actif      

   	doc.font('Helvetica')
   	   .fontSize(10)
	   .fillColor('#505050')
       .text('Exemple de pôle d\'activité', legend_left+28, legend_top+190, {width: 80})
    doc.fontSize(8)
       .text('Ce pôle représente 4 activités - 2 alertes de suivi actif et 2 évaluations', legend_left+28, legend_top+215, {width: 80})
   	
}


//add svgs to pdfkit
function drawAllCharts(doc, svgs, callback) {
    let options = {
	    useCSS: false,
	    assumePt: true,
	    preserveAspectRatio: 'xMinYMin meet',
	    width: 440,
	    height: 200
	};

	svgs.forEach(function(s, i) {
	    let svg_print = d3.select(s['id']).select('svg');
		let svgString = getSVGString(svg_print.node()); 
	    doc.addSVG(svgString, s['x_pos'], s['y_pos'], options);
	    if (i==svgs.length-1) callback();
	});
};



//write actual pdf
function writeDashboardPDFKit(mapPng, callback) {

	//create document and pipe to blob
	const doc = new PDFDocument();
	const stream = doc.pipe(blobStream());
	const dateTimeString = moment().format('D MMM YYYY HH:mm:ss');

	PDFDocument.prototype.addSVG = function(svg, x, y, options) {
	    return SVGtoPDF(this, svg, x, y, options), this;
	};

	doc.on('pageAdded', () => addPDFHeaderFooter());

	let logoUri = '';
	function writeHeadings(doc, callback) {
	    let imgData = '../images/msf-logo.png';
	    getDataUri('../images/msf-logo.png', function (dataUri) {                    
	        doc.image(dataUri, 20, 20, {width: 45});
	        logoUri = dataUri;
	        writeHeader();
	        callback(doc);
	    });     

	};

	writeHeadings(doc, function() {

		doc.moveDown(2)

		let map_left = 160
		let map_top = doc.y
		let legend_left = 50
		let legend_top = map_top 
		doc.image(mapPng, map_left, map_top, {width: 400});

		drawLegend(doc, legend_left, legend_top, function() {
			let charts_top = doc.y+50 

			writeFooter();

			drawAllCharts(doc, [{id: '#timeseries', x_pos: 120, y_pos: charts_top},
		    	           {id: '#timeseriesbrush', x_pos: 120, y_pos: charts_top+110}], function() {
		    	           		writeFiltSum(doc, charts_top+200, savePdf)
		    	           	}); 

		});

	});


	function savePdf() {
		doc.end();
	}

	function writeFooter() {  //footer - date & time of export 
		doc.fontSize(8)
		       .fillColor('#505050')
		       .text('Date d\'exportation: ' + dateTimeString, 20, doc.page.height - 50, {
				    lineBreak: false
			   });
	}

	function writeHeader() {   //header - logo & titles
		doc.image(logoUri, 20, 20, {width: 45});

		doc.fontSize(10)
		   .fillColor('#505050')
		   .text('PUC Dashboard, MSF-OCB', 75,16);
		
		doc.fontSize(18)
		   .fillColor('#505050')
		   .text(g.currentvars.currentDisease + ' - ' + g.currentvars.currentStat.full, 75, 30);

		doc.fontSize(12)
		   .fillColor('#505050')
		   .text(g.currentvars.currentFiltSum['epiweeks'], 75, 50);
	};


	function addPDFHeaderFooter() {
		writeFooter();
		writeHeader();
		doc.fontSize(10)
		doc.moveDown(5)
	}



	stream.on('finish', function() {
  		blob = stream.toBlob('application/pdf');
	    callback(blob, mapPng);  //return pdf blob & map png data to dashboardWriteExportFiles
	}); 
   
    const saveData = (function () {
	    let a = document.createElement("a");
	    document.body.appendChild(a);
	    a.style = "display: none";
	    return function (blob, fileName) {
	        let url = window.URL.createObjectURL(blob);
	        a.href = url;
	        a.download = fileName;
	        a.click();
	        window.URL.revokeObjectURL(url);
	    };
	}());
}

