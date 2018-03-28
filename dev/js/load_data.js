//FIRST AXIOS CALL HERE - get dbMinWeek, dbMaxWeek//
var dbMinWeek = '2007-1'; // new Date(2007, 0, 1);       	//get from database - one call only
var dbMaxWeek = '2017-52'; //new Date(2017, 11, 31);     	//get from database - one call only

console.log("Fetch date extent from DB: ", dbMinWeek, dbMaxWeek);
var dbEpitime = createEpitime([{'epiwk': dbMinWeek}, {'epiwk': dbMaxWeek}]);

var dbExtent = dbEpitime[0];
var defaultExtent = [new Date(2012, 0, 1), getEpiDate(dbMaxWeek, dbEpitime[1])];
//console.log("defaultExtent: ", defaultExtent);
var ms_1_wk = 604800000;
var min_num_wks = 12;  

//HEIDI - NEED CANCEL BUTTON IN DIALOG
//HEIDI - more rapid epiweek number display when on brushmove?
//HEIDI - After push 'Load Data' button, maybe have text appear to the right saying 'Loading...'


function displayDataDialog() {

	var currentExtent = defaultExtent;  
    var html = '';
    html += '<div class="row">';
    html += '<p id="modal_text">Sélectionnez la plage de temps à charger:</p>';
    html += '</div>';
    html += '<div class="row">';
    html += '<div id="data_timerange_selector">';
    html += '</div>';
    html += '</div>';
    html += '<div class="row">';
    html += '<button id="btnLoad" class="button">Load Data</button><span id="warn"></span>';
    html += '</div>';

    var modal = document.getElementById('dataModal');
	$('.modal-content').html(html);
	
	modal.style.display = "block";
	document.getElementById("btnLoad").onclick = function() {
		console.log("FETCH DATA FROM DB HERE: ", currentExtent);
		//SECOND AXIOS CALL HERE - get DATA, PARAMETERS = min_week, min_year, max_week, max_year, disease_list//
	    //LOAD DATA FROM DB HERE
		data = (function() {
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

	    //const url = 'data/data.js';
		//axios.get(url).then(response => console.log(response));


	    console.log("data: ", data);
	    data = addEpitimeToData(data);
	    console.log ("NEW DATA: ", data)
	    updateDashboardData();
	    modal.style.display = "none";
	    //return data;
	}


	var dateFormat = d3.timeFormat("%d %b %Y");
	function getFrenchMonthAbbr(month) {
		var month_translations = {0: "Jan", 1: "Fév", 2: "Mars", 3: "Avr", 4: "Mai", 5: "Juin", 6: "Juil", 7: "Août", 8: "Sept", 9: "Oct", 10: "Nov", 11: "Déc"};
	 	return month_translations[month];
	}
	function frDateFormat(d) {
		var fr_date = d.getDate() + ' ' + getFrenchMonthAbbr(d.getMonth()) + ' ' + d.getFullYear();
		return fr_date;
	}

	//SVG container
	var margin = {top: 0, right: 10, bottom: 0, left: 10};
	var width = $("#data_timerange_selector").width() - margin.left - margin.right;
	var height = $("#data_timerange_selector").height() - margin.top - margin.bottom;  
	var svg = d3.select("#data_timerange_selector")
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("transform", "translate(" + 10 + "," + 0 + ")");

	var s_height = 40;    			//selector height
	var s_width = width * 0.8;		//selector width

	var x = d3.scaleTime()
	            .domain(dbExtent)
	            .range([0, s_width]);

	var brush = d3.brushX()
	    .extent([[0, 0], [s_width, s_height]]) 
	    .on("start brush", brushmoved)
	    .on("end", brushend);

	var g = svg.append("g").attr("transform", "translate(" + 50 + "," + 50 + ")");
	g.append("g")
	    .attr("class", "axis axis--x")
	    .attr("transform", "translate(0," + s_height/2 + ")")
	    .call(d3.axisBottom(x));

	var gBrush = g.append("g")
	    .attr("class", "brush")
	    .call(brush);

	var handle = gBrush.selectAll(".handle--custom2")
	  .data([{type: "w"}, {type: "e"}])
	  .enter().append("path")
	    .attr("class", "handle--custom2")
	    .attr("fill", "#bf0000")
	    .attr("fill-opacity", 0.8)
	    .attr("stroke", "#000")
	    .attr("stroke-width", 1.5)
	    .attr("cursor", "ew-resize")
	    .attr("d", d3.arc()
	        .innerRadius(0)
	        .outerRadius(s_height/2)
	        .startAngle(0)
	        .endAngle(function(d, i) { return i ? Math.PI : -Math.PI; }));


	//Append slider dates min & max
	svg.append("text")
	    .attr("class", "slider-date-min")
	    .attr("x", 0)
	    .attr("y", 26)
	    .text(currentExtent[0]);

	svg.append("text")
	    .attr("class", "slider-date-max")
	    .attr("x", 0)
	    .attr("y", 26)
	    .text(currentExtent[1]);

	//Append slider epiweeks min & max
	svg.append("text")
	    .attr("class", "slider-epiwk-min")
	    .attr("x", 0)
	    .attr("y", 42)
	    .text(getEpiWeek(currentExtent[0], dbEpitime[1]));

	svg.append("text")
	    .attr("class", "slider-epiwk-max")
	    .attr("x", 0)
	    .attr("y", 42)
	    .text(getEpiWeek(currentExtent[1], dbEpitime[1]));

	gBrush.call(brush.move, currentExtent.map(x));


	function brushmoved() {
	  var s = d3.event.selection;
	  if (s == null) {
	    //handle.attr("display", "none");
	    //gBrush.call(brush.move, defaultExtent.map(x));
	  } else {
	    var sx = s.map(x.invert);
	    handle.attr("display", null).attr("transform", function(d, i) { return "translate(" + s[i] + "," + s_height / 2 + ")"; });
	  }
	  currentExtent = sx;
	  d3.select('rect.selection')
	    .attr('fill', '#bf0000')
	    .attr('fill-opacity', 0.4);

	  updateSliderDates(s);
	}

	function brushend() {
	  var s = d3.event.selection;
	  if (s == null) {
	    //handle.attr("display", "none");
	    //currentExtent = null;
	    currentExtent = defaultExtent;
	    console.log(currentExtent);
	    gBrush.call(brush.move, defaultExtent.map(x));
	    //updateSliderDates();
	  } else {
	    var sx = s.map(x.invert);
	    d1 = sx.map(d3.timeMonday.round);
	    handle.attr("display", null).attr("transform", function(d, i) { return "translate(" + s[i] + "," + s_height / 2 + ")"; });
	    if (!((sameDay(sx[0],d1[0])) && (sameDay(sx[1],d1[1])))) {
	      //console.log("SNAP DATE HERE");
	      gBrush.call(brush.move, d1.map(x));
	    } else {
	      //console.log("brushend:", sx, d1)
	      currentExtent = d1;
	      updateSliderDates(s);
	    }
	  }

	  //check if >=default number of epiweeks selected, if not then don't allow user to load
	  //console.log("currentExtent time diff: ", currentExtent[1].getTime() - currentExtent[0].getTime(), min_num_wks * ms_1_wk);

	  if ((currentExtent[1].getTime()-currentExtent[0].getTime()) >= ((min_num_wks-1) * ms_1_wk)) {
	  	$('#warn').html('');
	  	$('#btnLoad').removeClass('disable_load');
	  } else {
	  	$('#warn').html('! Attention: Un minimum de ' + (min_num_wks) + ' semaines doit être sélectionné');
	  	$('#btnLoad').addClass('disable_load');
	  }
	  
	}

	function updateSliderDates(s) {
	  if (currentExtent==null) {
	    d3.select('.slider-date-min').text('Cliquez & glissez pour sélectionner');
	    d3.select('.slider-date-max').text('');
	    d3.select('.slider-epiwk-min').text('');
	    d3.select('.slider-epiwk-max').text('');
	  } else {
	    d3.select('.slider-date-min').attr('x', s[0] + 0).text(frDateFormat(currentExtent[0]));
	    d3.select('.slider-date-max').attr('x', s[1] + 40).text(frDateFormat(currentExtent[1]));
	    d3.select('.slider-epiwk-min').attr('x', s[0] + 18).text(getEpiWeek(currentExtent[0], dbEpitime[1]));
	    d3.select('.slider-epiwk-max').attr('x', s[1] + 40).text(getEpiWeek(currentExtent[1], dbEpitime[1]));
	  }
	}

	function sameDay(d1, d2) {
	    return d1.getFullYear() === d2.getFullYear() &&
	        d1.getMonth() === d2.getMonth() &&
	        d1.getDate() === d2.getDate();
	}

}

