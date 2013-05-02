var lazy = require("lazy"),
    fs   = require("fs"),
	argv = require("optimist")
		.demand(['o','l','f'])
		.usage('Usage: $0 -f [file] -o [count/total_rt/avg_rt] -l [num]')
		.alias('o','orderBy').default('o','avg_rt').describe('o','What field to order by [count/total_rt/avg_rt]')
		.alias('l','limit').default('l',20).describe('l','Limit the result of lines [\'all\' for everyline]')
		.alias('f','file').describe('f','apache log file to analyse')
		.argv;
	Table = require('cli-table'),
	filesize = require('filesize');


var startTimer = new Date();
var statsCounter = new StatsCounter();
var file = argv.f
var fileSize = 0;
var executionTime = 0;


fs.exists(file, function(exists) {
  if (exists) {
    fs.stat(file, function (err, stats) {
		fileSize = stats.size;
	});
  } else {
    console.log("Given file '"+file+"'"+" does not exist");
	process.exit();
  }
});



new lazy(fs.createReadStream(file))
	.lines
	.forEach(function(line){
		data = parseLine(String(line))
		if(data.path.indexOf("images") !== 1) {
			statsCounter.processData(data);
		}
     	}
	).on('pipe',function(){
		statsCounter.prettyPrint(argv);
	});

function parseLine (line) {
	data = line.replace(/(?!.*\[)\s(?=.*\])/,'_').split(' '); // 37.130.253.3 [04/Feb/2013:17:18:35 +0100] GET => 37.130.253.3 [04/Feb/2013:17:18:35_+0100] GET
	requestTime = data[8].substr(2,data[8].length-4).split('/'); // **0/138044** => array(0,138044)
	dateTime = data[1].substr(1,data[1].length-2).split('_') // [04/Feb/2013:17:17:12_+0100] => array(04/Feb/2013:17:17:12, +0100)
	dataObj = {
		"ip" : data[0],
		"dateTime" : dateTime,
		"method" : data[2],
		"path" : data[3],
		"parameters" : data[4],
		"responseCode" : data[5],
		"requestTime" : {
			"minutes" : requestTime[0],
			"milliseconds" : requestTime[1]
		}
	}
	return dataObj;
}

function StatsCounter() {
	this.startDate = '';
	this.endDate = ''
	this.paths = {}	
}

StatsCounter.prototype.processData = function(data) {
	if(!(data.path in this.paths)) {
		this.paths[data.path] = {
			"counter" : 0,
			"totalRequestTime" : 0,
			"avgRequestTime" : 0
		}
	}
	this.updateCounter(data.path);
	this.updateTotalRequestTime(data);
	this.updateDate(data.dateTime);
}
StatsCounter.prototype.updateDate = function(dateTime) {
	if(this.startDate == '')
		this.startDate = dateTime[0];
	this.endDate = dateTime[0];
}
StatsCounter.prototype.updateCounter = function (path) {
	this.paths[path].counter++;
};
StatsCounter.prototype.updateTotalRequestTime = function (data) {
	this.paths[data.path].totalRequestTime = this.paths[data.path].totalRequestTime + parseInt(data.requestTime.milliseconds);
};
StatsCounter.prototype.getAvgRequestTime = function (path) {
	return this.paths[path].totalRequestTime / this.paths[path].counter / 1000000;
};
StatsCounter.prototype.sort = function(orderBy) {
	var tuples = [];
	for (var key in this.paths) tuples.push([key, this.paths[key]]);
	var sc = this;
	tuples.sort(function(a, b) {
		if(orderBy == 'count') {
		    a = a[1].counter;
		    b = b[1].counter;			
		}else if(orderBy == 'total_rt') {
			a = a[1].totalRequestTime;
		    b = b[1].totalRequestTime;
		} else if(orderBy == 'avg_rt') {
			a = sc.getAvgRequestTime(a[0]);
		    b = sc.getAvgRequestTime(b[0]);
		}

	    return a > b ? -1 : (a < b ? 1 : 0);
	});
	return tuples;
}

StatsCounter.prototype.prettyPrint = function (argv) {
	var table = new Table({
	    head: ['Path', 'Count', 'Total request time', 'Avg request time']
	  , colWidths: [40, 15,25,20]
	});
	
	tuples = this.sort(argv.orderBy);
	var limit = (argv.l > tuples.length || argv.l == 'all') ? tuples.length : argv.l;
	for (var i = 0; i < limit; i++) {
	    var key = tuples[i][0];
	    var value = tuples[i][1];
		table.push([key,value.counter,value.totalRequestTime,this.getAvgRequestTime(key)])
	}

	console.log("\nAnalysed data between: "+this.startDate.underline.yellow +" - "+this.endDate.underline.yellow);
	console.log("Filesize: "+filesize(fileSize,0,false).underline.yellow);
	executionTime = new Date() - startTimer;
	console.log("Execution time: "+String(executionTime/1000).underline.yellow + "s".underline.yellow);
	console.log(table.toString());	
};
