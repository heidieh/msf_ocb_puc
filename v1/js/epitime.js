
var epitime_all = [];
var date_extent = [];

function addEpitime(data,g) {
	
	createEpitime(data);
	g.epitime = {};
	g.epitime.date_extent = date_extent;
    g.epitime.all = epitime_all;

	for (var i=0; i<=data.length-1; i++) {
		data[i].epidate = getEpiDate(data[i]['epiwk']);
	}
	return [data,date_extent];
}

function epiTime(epi_id, epiweek, epimonth, epiyear, epiDate) {     //epiTime object
    this.epi_id = epi_id;
    this.epiweek = epiweek;
    this.epimonth = epimonth;
    this.epiyear = epiyear;
    this.epiDate = epiDate;
}   

function getEpiweeksInData(data) {
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

function createEpitime(data) {      //returns array of epiTime objects in dashboard
	var parseTime = d3.timeParse("%d-%m-%Y");

    var epi_first = new epiTime("2006-52",52,12,2006,parseTime("25-12-2006"));
    var epi_prev = epi_first;   
    var epiweeksInData = getEpiweeksInData(data);
    var datesInData = [];
    var all_epitimes = [];
    
    var all_years = [];
    for (i=0; i<= epiweeksInData.length-1; i++) {
        if (!(all_years.includes(parseInt((epiweeksInData[i]).substr(0,4))))) {  //if year not included in all_years list
            all_years.push(parseInt((epiweeksInData[i]).substr(0,4)));
        }
    }
    var epi_max_yr = Math.max.apply(null, all_years); 
    //console.log("All years: ", all_years);      
    
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

    datesInData.sort(date_sort_asc);
    var minDateInData = datesInData[0];
    var maxDateInData = datesInData[datesInData.length-1];
    //console.log("min, max dates: ", minDateInData, maxDateInData);
    date_extent = [minDateInData, maxDateInData];

    for (var i=0; i<=all_epitimes.length-1; i++) {          
        if ((minDateInData <= all_epitimes[i].epiDate) && (all_epitimes[i].epiDate <= maxDateInData)) {
            epitime_all.push(all_epitimes[i]);
        }
    }
    //console.log("All Epitime: ", epitime_all);

}; 


function getEpiDate(epiwk) {   //function accepts epiweek, returns associated date (in date format)
    var num_epiwks = epitime_all.length;
    //var firstDate = new Date(00,0,1);
    //var epiDate = new Date(00,0,1);   //1st Jan 2000
    
    for (i=0; i<=num_epiwks-1; i++) {
        if (epitime_all[i].epi_id == epiwk) {
            epiDate = new Date(epitime_all[i].epiDate);
            break;
        }
    }
    /*if (sameDay(epiDate, firstDate)) {
        console.log("1 Jan 2000: ", epiwk)   
    }*/

    return epiDate;
}

function sameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function getEpiWeek(epidt) {   //function accepts epidate (in date format), returns associated epiweek
    var num_epiwks = epitime_all.length;
    
    for (i=0; i<=num_epiwks-1; i++) {
        if (sameDay(epitime_all[i].epiDate, epidt)) {
            var epiWk = epitime_all[i].epiweek + '-' + epitime_all[i].epiyear;
            break;
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
    var dateRange = [];
    var allDates = [];
    var num_epiwks = epitime_all.length;
    var last_epiTime = epitime_all[epitime_all.length-1];
    
    //define startYr, endYr, startMonth, endMonth, startWeek, endWeek - depending on rng_type
    if (rng_type=='epiweek') {
        var endYr = last_epiTime.epiyear;
        var endWeek = last_epiTime.epiweek;
        if (param <= num_epiwks) {
            var start_epiTime = epitime_all[num_epiwks-param];
        } else {                        
            var start_epiTime = epitime_all[0];   //if button goes back further than first date, set to first date
            
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
            if ((epitime_all[i].epiyear == startYr) && (epitime_all[i].epiyear == endYr)) {
                if ((epitime_all[i].epiweek >= startWeek) && (epitime_all[i].epiweek <= endWeek)) {
                    allDates.push(epitime_all[i].epiDate);
                }
            } else if ((epitime_all[i].epiyear == startYr) && (epitime_all[i].epiweek >= startWeek)) {
                allDates.push(epitime_all[i].epiDate);
            } else if ((epitime_all[i].epiyear == endYr) && (epitime_all[i].epiweek <= endWeek)) {
                allDates.push(epitime_all[i].epiDate);
            } else if ((epitime_all[i].epiyear > startYr) && (epitime_all[i].epiyear < endYr)) {
                allDates.push(epitime_all[i].epiDate);
            }
        }   
    } else if (rng_type=='epimonth') {
        for (i=0; i<num_epiwks; i++) {      
            if ((epitime_all[i].epiyear == startYr) && (epitime_all[i].epiyear == endYr)) {
                if ((epitime_all[i].epimonth >= startMonth) && (epitime_all[i].epimonth <= endMonth)) {
                    allDates.push(epitime_all[i].epiDate);
                }
            } else if ((epitime_all[i].epiyear == startYr) && (epitime_all[i].epimonth >= startMonth)) {
                allDates.push(epitime_all[i].epiDate);
            } else if ((epitime_all[i].epiyear == endYr) && (epitime_all[i].epimonth <= endMonth)) {
                allDates.push(epitime_all[i].epiDate);
            } else if ((epitime_all[i].epiyear > startYr) && (epitime_all[i].epiyear < endYr)) {
                allDates.push(epitime_all[i].epiDate);
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
