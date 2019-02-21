
function addEpitimeToData(data) {  //function not needed once timestamp sent from database
    let created_epi = createEpitime(data);
    g.epitime = {};
    g.epitime.date_extent = created_epi[0];
    g.epitime.all = created_epi[1];

    data.forEach(d => {
        d.epitimestamp = getEpiTimestamp(d.epiwk);
    })
    return data;
}

function epiTime(epi_id, epiweek, epimonth, epiyear, epiTimestamp) {     //epiTime object  
    this.epi_id = epi_id;
    this.epiweek = epiweek;
    this.epimonth = epimonth;
    this.epiyear = epiyear;
    this.epiTimestamp = epiTimestamp;
}   


//reads in array of data, returns date extent ([minDate, maxDate]) and array of epiTime objects between the first and last dates in array
function createEpitime(data) {    

    const epi_first = new epiTime("2006-52", 52, 12, 2006, parseInt(moment('2006-12-25 00:00:00').format("X")));
    let epi_prev = epi_first;   
    let datesInData = [];
    let all_epitimes = [];
    let epitime_all_data = [];

    const epiweeksInData = [...new Set(data.map(d => d.epiwk))]; //unique epiweeks in data
    
    //get all years in data
    let all_years = epiweeksInData.reduce((prev, d) => {
        if (!prev.find(p => {return p==parseInt(d.substr(0,4)) } )) {
            prev.push(parseInt(d.substr(0,4)))
        }
        return prev;
    }, []);
    let epi_max_yr = Math.max(...all_years);
    
    //create array of epiTime objects, one for each week from first default week (2006-52) to end of max epi year
    while (epi_prev.epiyear <= epi_max_yr) {
        
        let ts_timestamp = parseInt(moment.unix(epi_prev.epiTimestamp).add(7,'day').format('X')); //integer of (timestamp + 1 week)
        let [ ts_year, ts_week ]  = moment.unix(ts_timestamp).isocalendar();
        let ts_month = moment(ts_timestamp).add(3, 'day').month()+1;
        let new_epi_id = (ts_week < 10)? ts_year + "-" + ts_week : ts_year + "-" + ts_week;
        let epi_temp = new epiTime(new_epi_id, ts_week, ts_month, ts_year, ts_timestamp);
        
        if (epiweeksInData.includes(new_epi_id)) {      //if week is included in dataset 
            datesInData.push(ts_timestamp);
        };
        all_epitimes.push(epi_temp);
                      
        epi_prev = epi_temp;    
    }
    //get min & max dates of actual data
    datesInData.sort();
    let minDateInData = datesInData[0];
    let maxDateInData = datesInData[datesInData.length-1];

    //push all epiTime objects within actual data extent into new array (epitime_all_data)
    epitime_all_data = all_epitimes.reduce((prev, d) => {
        if ((minDateInData <= d.epiTimestamp) && (d.epiTimestamp <= maxDateInData))  {
            prev.push(d)
        }
        return prev;
    }, []);

    //console.log([minDateInData, maxDateInData])
    //console.log(epitime_all_data)
    return [[minDateInData, maxDateInData], epitime_all_data];

}; 



//reads epiweek(epiwk, format e.g. '2008-15'), returns timestamp
function getEpiTimestamp(epiwk) {  
    let yr = parseInt(epiwk.split('-')[0]);
    let wk = parseInt(epiwk.split('-')[1]);
    let ts = moment.fromIsocalendar([yr, wk, 1, 0]).unix();
    return ts;
}


function sameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

function sameDayTS(d1, d2) {  
    let d1m = moment.unix(d1);
    let d2m = moment.unix(d2); 
    return d1m.isSame(d2m, 'day');
}

function sameDayTSDate(d1, d2) {
    let d1m = moment.unix(d1); 
    let d2m = moment.unix(d2);
    return d1m.isSame(d2m, 'day');
}

function getNextDay(d1) {
    return nextDay = parseInt(moment.unix(d1).add(1, 'days').format('X'));
}


//function reads in input type (as 'timestamp' or 'date') and array of time variables, returns array of epiweeks
function getEpiWeeks(inputType, timeList) {   
    let epiWks = [];
    
    if ((inputType=='timestamp') && (timeList.length != 0)) {

        timeList.forEach(function(time) {

            let epitime = g.epitime.all.find(epitime => {
                return sameDayTS(epitime.epiTimestamp, time)
            })
            if (epitime!=undefined) {
                epiWks.push(epitime.epi_id)
            } 

        });
       
    } else if ((inputType=='date') && (timeList.length != 0)) {

        timeList.forEach(function(time) {

            let epitime = g.epitime.all.find(epitime => {
                return sameDayTSDate(epitime.epiTimestamp, moment(time).unix())
            })
            if (epitime!=undefined) {
                epiWks.push(epitime.epi_id)
            } 

        })

    };

    if (epiWks.length != timeList.length) {
        console.log('!Error warning: Epiweek not found: ', inputType, timeList , ' != ', epiWks);
    } 

    return epiWks;
}


//input rng_type (currently only 'epiweek' - could also have 'epimonth'/'epiyear') and parameter (integer for number of units of rng_type)
//returns range of dates for current selection ([first_date, last_date]) in relative time (e.g. 'last 4 epiweeks')
function getEpiRange(rng_type, param) {  
    let last_epiTime = g.epitime.all[g.epitime.all.length-1];
    let begTS, endTS;

    if (rng_type=='epiweek') {
        endTS = parseInt(moment.unix(last_epiTime.epiTimestamp).format("X"));
        begTS = parseInt(moment.unix(last_epiTime.epiTimestamp).subtract((param-1)*7, 'days').format("X"));
    } 

    return [begTS, endTS];
};
