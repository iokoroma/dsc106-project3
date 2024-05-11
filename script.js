<script>

// set the dimensions and margins of the graph
var margin = {top: 10, right: 30, bottom: 30, left: 60},
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

// append the svg object to the body of the page
var svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

//Read the data
d3.csv("CLEANED_CSVs/test2.csv", function(data) {

    // Parse date string to date object
    var parseDate = d3.timeParse("%Y-%m-%d");

    // Parse the dates in the data
    data.forEach(function(d) {
        d['Resignation Date'] = parseDate(d['Resignation Date']);
    });

    // Group data by year and count rows for each year
    var countsByYear = d3.nest()
        .key(function(d) { return d['Resignation Date'].getFullYear(); })
        .rollup(function(v) { return v.length; })
        .entries(data);

    // Create a map to store counts by year
    var countByYearMap = {};
    countsByYear.forEach(function(d) {
        countByYearMap[d.key] = d.value;
    });

    // Add X axis
    var x = d3.scaleTime()
      .domain(d3.extent(data, function(d) { return d['Resignation Date']; }))
      .range([0, width]);
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

    // Add Y axis
    var y = d3.scaleLinear()
      .domain([0, d3.max(countsByYear, function(d) { return d.value; })])
      .range([height, 0]);
    svg.append("g")
      .call(d3.axisLeft(y));

    // Add the line
    svg.append("path")
      .datum(countsByYear)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", d3.line()
        .x(function(d) { return x(parseDate(d.key + "-01-01")); })
        .y(function(d) { return y(d.value); })
      );

});

</script>