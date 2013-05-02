ApacheLogAnalyser
=================

A node script that will analyse a custom apache log file.

### Setup
Specify following custom log in apache conf

    LogFormat "%h %t %m %U %q %>s %b \"%{Referer}i\" **%T/%D**" withtime
    CustomLog /var/log/apache2/request_time.log withtime


Clone the project and run:

    npm install
    
### Run

    node app.js -f /var/log/apache2/request_time.log

This will order the lines by average request time and will only show the top 20 lines.

Alternative arguments:

    node app.js -help
    -------------------
    Usage: node ./app.js -f [file] -o [count/total_rt/avg_rt] -l [num]

    Options:
      -o, --orderBy  What field to order by [count/total_rt/avg_rt]   [required]  [default: "avg_rt"]
      -l, --limit    Limit the result of lines ['all' for everyline]  [required]  [default: 20]
      -f, --file     apache log file to analyse                       [required]

    Missing required arguments: f
