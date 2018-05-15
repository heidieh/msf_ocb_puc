
//reads in array of data with field 'epiwk' and returns same array of data with field added for 'epidate'
//add global variable g.epitime
function addEpitimeToData(data) {
    //console.log('epitime.js: 1 - addEpitimeToData');
	var created_epi = createEpitime(data);
	g.epitime = {};
	g.epitime.date_extent = created_epi[0];
    g.epitime.all = created_epi[1];
    //console.log(geonames);
    
	for (var i=0; i<=data.length-1; i++) {
		data[i].epidate = getEpiDate(data[i]['epiwk']);

        /*var location = geonames.find(function(loc) {
            return loc.zs_pcode == data[i].zs_pc;
        });
        //console.log(location);

        data[i].zs = location['zs'];
        data[i].prov_pc = location['prov_pcode'];
        data[i].prov = location['prov'];*/
	}
	//return [data,date_extent];
    return data;
}

function epiTime(epi_id, epiweek, epimonth, epiyear, epiDate) {     //epiTime object
    this.epi_id = epi_id;
    this.epiweek = epiweek;
    this.epimonth = epimonth;
    this.epiyear = epiyear;
    this.epiDate = epiDate;
}   


//reads in array of data, returns array of unique epiweeks ('epiwk') in data
function getEpiweeksInData(data) {
    //console.log('epitime.js: 2 - getEpiweeksInData');
    var all_epiweeks = [];  
    for (i=0; i<=data.length-1; i++) {
        if (!(all_epiweeks.includes(data[i]['epiwk']))) {
            all_epiweeks.push(data[i]['epiwk']);            
        }
    }
    //console.log("All epiweeks: ", all_epiweeks);
    return all_epiweeks;
};

/*epitime.getYearsInData = function() {
    all_years = [];
    all_epiweeks = epitime.getEpiweeksInData();
    for (i=0; i<=all_epiweeks.length-1; i++) {
        if (all_years.indexOf(all_epiweeks[i].substr(0,4)) == -1) {   //if year is not already in array
            all_years.push(all_epiweeks[i].substr(0,4));
        }    
    } 
    return all_years;
};*/


//reads in array of data, returns date extent ([minDate, maxDate]) and array of epiTime objects between the first and last dates in array
function createEpitime(data) {    
    //console.log('epitime.js: 3 - createEpitime');
	var parseTime = d3.timeParse("%d-%m-%Y");
    var epi_first = new epiTime("2006-52",52,12,2006,parseTime("25-12-2006"));
    var epi_prev = epi_first;   
    var epiweeksInData = getEpiweeksInData(data);
    var datesInData = [];
    var all_epitimes = [];
    var epitime_all_data = [];
    //epitime_all = [];
    
    //get all years in data (all_years) and max year (epi_max_yr)
    var all_years = [];
    for (i=0; i<= epiweeksInData.length-1; i++) {
        if (!(all_years.includes(parseInt((epiweeksInData[i]).substr(0,4))))) {  //if year not included in all_years list
            all_years.push(parseInt((epiweeksInData[i]).substr(0,4)));
        }
    }
    var epi_max_yr = Math.max.apply(null, all_years); 
    //console.log("All years: ", all_years);      
    
    //create array of epiTime objects, one for each week from first default week (2006-52) to end of max epi year
    while (epi_prev.epiyear <= epi_max_yr) {
        var new_date = d3.timeDay.offset(epi_prev.epiDate, 7); //add 7 days to previous date       
        var new_month = parseInt(d3.timeFormat("%m")(d3.timeDay.offset(new_date, 3))); //add 3 days to date & get month number as integer
        var new_year = parseInt(d3.timeFormat("%Y")(d3.timeDay.offset(new_date, 3)));
        var get_new_week = function(prev_week) {
            if (prev_week < 52) {
                return prev_week+1;
            } else if (new_month==1) {
                return 1;
            } else if (new_month==12) {
                return 53; 
            } else {
                console.log("!ERROR: problem calculating epiweek");
                return 0;
            };
        } 
        var new_week = get_new_week(epi_prev.epiweek);
        var new_epi_id = (new_week < 10)? new_year + "-" + new_week : new_year + "-" + new_week;
        var epi_temp = new epiTime(new_epi_id, new_week, new_month, new_year, new_date);
     
        if (epiweeksInData.includes(new_epi_id)) {      //if week is included in dataset 
            datesInData.push(new_date);
        };
        all_epitimes.push(epi_temp);
                      
        epi_prev = epi_temp;    
    }

    //get min & max dates of actual data
    datesInData.sort(date_sort_asc);
    var minDateInData = datesInData[0];
    var maxDateInData = datesInData[datesInData.length-1];
    //console.log("min, max dates: ", minDateInData, maxDateInData);
    date_extent = [minDateInData, maxDateInData];

    //push all epiTime objects within actual data extent into new array (epitime_all_data)
    for (var i=0; i<=all_epitimes.length-1; i++) {          
        if ((minDateInData <= all_epitimes[i].epiDate) && (all_epitimes[i].epiDate <= maxDateInData)) {
            epitime_all_data.push(all_epitimes[i]);
        }
    }
    //console.log("All Epitime in data: ", epitime_all_data);
    return [date_extent, epitime_all_data];

}; 


//function reads epiweek(epiwk, format e.g. '2008-15') and optional epitime (epiwks, array of all epitime objects), returns associated date (epidate, in date format)
function getEpiDate(epiwk, epiwks) {   
    //console.log('epitime.js: 4 - getEpiDate');
    if (epiwks!=null) {
        //console.log(epiwk, epiwks);
        var num_epiwks = epiwks.length;
        for (i=0; i<=num_epiwks-1; i++) {
            if (epiwks[i].epi_id == epiwk) {
                epiDate = new Date(epiwks[i].epiDate);
                break;
            }
        }
    } else {    
        var num_epiwks = g.epitime.all.length;
        for (i=0; i<=num_epiwks-1; i++) {
            if (g.epitime.all[i].epi_id == epiwk) {
                epiDate = new Date(g.epitime.all[i].epiDate);
                break;
            }
        }
    }

    return epiDate;
}

function sameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

//function reads epidate (epidt, in date format) and optional epitime (epiwks, array of all epitime objects), returns associated epiweek
function getEpiWeek(epidt, epiwks) {   
    //console.log('epitime.js: 5 - getEpiWeek');
    if (epiwks!=null) {
        //console.log(epidt, epiwks);
        var num_epiwks = epiwks.length;
        for (i=0; i<=num_epiwks-1; i++) {
            if (sameDay(epiwks[i].epiDate, epidt)) {
                var epiWk = epiwks[i].epiweek + '-' + epiwks[i].epiyear;
                break;
            }
        }
    } else {
        var num_epiwks = g.epitime.all.length;
        for (i=0; i<=num_epiwks-1; i++) {
            if (sameDay(g.epitime.all[i].epiDate, epidt)) {
                var epiWk = g.epitime.all[i].epiweek + '-' + g.epitime.all[i].epiyear;
                break;
            }
        }
    }
    
    return epiWk;
}


/*epitime.get_epi_id = function(epidt){        //function accepts date (date format), returns epi_id (YYYY-WK)
    var epi_id = "err";     //default value
    var num_epiwks = epitime_all.length;
  
    for (i=0; i<=num_epiwks-1; i++) {   
        if ((i==0) && (epidt.getTime() <= epitime_all[i].epiDate.getTime())) {  //if date is before first epiweek defined, return first epiweek
            epi_id = epitime_all[i].epi_id; 
            break;
        } else if ((i==num_epiwks-1) && (epitime_all[i].epiDate.getTime() <= epidt.getTime()) ) {          //for last epiTime entry and date >= last epiTime date
            epi_id = epitime_all[i].epi_id;  //for last epiTime entry, if date is between last date entry & last date entry + 7 days
            break;
        } else if ((epitime_all[i].epiDate.getTime() <= epidt.getTime()) && (epidt.getTime() < epitime_all[i+1].epiDate.getTime())) {
            epi_id = epitime_all[i].epi_id;
            break;
        } 
    }
    if (epi_id=="err") {console.log("Error - epi id not found for ", epidt);};
    return epi_id;
}*/

/*epitime.getEpiweeksInRange = function(date_start, date_end) {
    var epiweeksInRange = [];
    var num_epiwks = epitime_all.length;
        for (i=0; i<=num_epiwks-1; i++) {   //for each entry in epitime object   
            if ((date_start.getTime() <= epitime_all[i].epiDate.getTime()) && (date_end.getTime() > epitime_all[i].epiDate.getTime())) { 
                epiweeksInRange.push(epitime_all[i].epi_id);  
            } 
        }
    g.epitime.current_epiweeks = epiweeksInRange;   
    return epiweeksInRange;
}*/

 
var date_sort_asc = function (date1, date2) {   //sort dates in ascending order
  if (date1 > date2) return 1;
  if (date1 < date2) return -1;
  return 0;
};

//input rng_type ('epiweek'/'epimonth'/'epiyear') and param (integer for number of units of rng_type)
//returns range of dates for current selection ([first_date, last_date]) in relative time (e.g. 'last 3 epimonths')
function getEpiRange(rng_type, param) {  
    //console.log('epitime.js: 6 - getEpiRange');
    var dateRange = [];
    var allDates = [];
    var num_epiwks = g.epitime.all.length;
    var last_epiTime = g.epitime.all[g.epitime.all.length-1];
    
    //define startYr, endYr, startMonth, endMonth, startWeek, endWeek - depending on rng_type
    if (rng_type=='epiweek') {
        var endYr = last_epiTime.epiyear;
        var endWeek = last_epiTime.epiweek;
        if (param <= num_epiwks) {
            var start_epiTime = g.epitime.all[num_epiwks-param];
        } else {                        
            var start_epiTime = g.epitime.all[0];   //if button goes back further than first date, set to first date
            
        }
        var startWeek = start_epiTime.epiweek;
        var startYr = start_epiTime.epiyear;  

    } else if (rng_type=='epimonth') {
        var endYr = last_epiTime.epiyear;     
        if (param ==0) {                    //if require current month only
            var endMonth = last_epiTime.epimonth;
            var startYr = endYr;
            var startMonth = endMonth;
        } else if (param <= endMonth) {     //if number of months required still within current year
            var endMonth = last_epiTime.epimonth-1;    
            var startYr = endYr;
            var startMonth = endMonth - param;
        } else {                                    //if number of months required overlaps previous years
            var endMonth = last_epiTime.epimonth-1;    
            if ((param % 12) > endMonth) {  //if number of months required overlaps additional year despite < 12 months
                var startYr = endYr - Math.floor(param/12) - 1;
                var startMonth = endMonth - (((param % 12)-1)-12);
            } else {
                var startYr = endYr - Math.floor(param/12);
                var startMonth = endMonth - ((param % 12)-1);
            };
        };
    } /*else if (rng_type=='epiyear') {
        if (param ==0) {        
            var endYr = last_epiTime.epiyear; 
            var startYr = endYr;
        } else {
            var endYr = last_epiTime.epiyear-1;
            var startYr = endYr - param + 1;
        }; 
    };*/

    if (rng_type=='epiweek') {
        for (i=0; i<num_epiwks; i++) {      
            if ((g.epitime.all[i].epiyear == startYr) && (g.epitime.all[i].epiyear == endYr)) {
                if ((g.epitime.all[i].epiweek >= startWeek) && (g.epitime.all[i].epiweek <= endWeek)) {
                    allDates.push(g.epitime.all[i].epiDate);
                }
            } else if ((g.epitime.all[i].epiyear == startYr) && (g.epitime.all[i].epiweek >= startWeek)) {
                allDates.push(g.epitime.all[i].epiDate);
            } else if ((g.epitime.all[i].epiyear == endYr) && (g.epitime.all[i].epiweek <= endWeek)) {
                allDates.push(g.epitime.all[i].epiDate);
            } else if ((g.epitime.all[i].epiyear > startYr) && (g.epitime.all[i].epiyear < endYr)) {
                allDates.push(g.epitime.all[i].epiDate);
            }
        }   
    } else if (rng_type=='epimonth') {
        for (i=0; i<num_epiwks; i++) {      
            if ((g.epitime.all[i].epiyear == startYr) && (g.epitime.all[i].epiyear == endYr)) {
                if ((g.epitime.all[i].epimonth >= startMonth) && (g.epitime.all[i].epimonth <= endMonth)) {
                    allDates.push(g.epitime.all[i].epiDate);
                }
            } else if ((g.epitime.all[i].epiyear == startYr) && (g.epitime.all[i].epimonth >= startMonth)) {
                allDates.push(g.epitime.all[i].epiDate);
            } else if ((g.epitime.all[i].epiyear == endYr) && (g.epitime.all[i].epimonth <= endMonth)) {
                allDates.push(g.epitime.all[i].epiDate);
            } else if ((g.epitime.all[i].epiyear > startYr) && (g.epitime.all[i].epiyear < endYr)) {
                allDates.push(g.epitime.all[i].epiDate);
            }
        }
    } /*else if (rng_type=='epiyear') {
        for (i=0; i<num_epiwks; i++) {            
            if ((epitime_all[i].epiyear >= startYr) && (epitime_all[i].epiyear <= endYr)) {
                allDates.push(epitime_all[i].epiDate);
            } 
        }
    } */

    var first, last = new Date();
    allDates.sort(date_sort_asc);
    first = allDates[0];            
    last = allDates.pop();
    
    //var dateRange = [new Date(2015,7,31), new Date(2015,10,30)];  //to test
    var dateRange = [first,last];
    return dateRange;
};
