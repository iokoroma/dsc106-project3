function buildChart(us, resignationData) {
  // const width = document.querySelector("body").clientWidth;
  const width = 975;
  const height = 610;

  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

  // svg for primary visalization
  const svg = d3.create("svg")
  // const svg = primaryViz.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto; font: bold 15px sans-serif;")
    .on("click", reset);

  const path = d3.geoPath();

  const g = svg.append("g");

  // setup secondary visualization 
  let secWidth = 400;
  let secHeight = 400;

  const secondarySVG = d3.create("svg")
    .attr("width", secWidth)
    .attr("height", secHeight)
    .attr("viewBox", [-secWidth / 2, -secHeight / 2, secWidth, secHeight])
    .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif;");

  // manipulate data 
  enrichData(resignationData);
  console.log(resignationData[0])
  let resignationsByState = d3.group(resignationData, e => e.StateFullname);
  let resignationCategories = [...d3.group(resignationData, e => e.Category).keys()];
  // console.log(resignationsByState);
  console.log(resignationCategories);

  let colorScale = d3.scaleLinear()
    // max domain value is the lenght of the resignations array for each state
    .domain([0, d3.max(resignationsByState, e => e[1].length)])
    .range(["white", "purple"])

  const states = g.append("g")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .join("path")
    .on("click", clicked)
    .attr("fill", (d) => {
      return colorScale(resignationsByState.get(d.properties.name) ? resignationsByState.get(d.properties.name).length : 0)
    })
    .attr("cursor", "pointer")
    .attr("d", path);

  states.append("title")
    .text(d => d.properties.name);

  g.append("path")
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-linejoin", "round")
    .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));

  let infoBox = g.append("g");

  svg.call(zoom);

  primaryViz.append(svg.node());
  primaryViz.append(secondarySVG.node());



  function reset() {
    states.transition().style("fill", null);
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity,
      d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    );
    resetStateInfo();
  }

  function clicked(event, d) {
    console.log(`clicked ${JSON.stringify(d.properties)} `);

    const [[x0, y0], [x1, y1]] = path.bounds(d);


    event.stopPropagation();
    states.transition().style("fill", null);
    d3.select(this).transition()/*.style("fill", "red")*/;
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
      d3.pointer(event, svg.node())
    );
    displayStateInfo(event, d);
  }

  function zoomed(event) {
    const { transform } = event;
    g.attr("transform", transform);
    g.attr("stroke-width", 1 / transform.k);
  }

  function resetStateInfo() {
    // remove prior information and secondary plts
    svg.selectAll(".stateInfo").remove();
    secondarySVG.selectAll(".piContainer").remove();
  }

  function displayStateInfo(event, d) {
    const [[x0, y0], [x1, y1]] = path.bounds(d);

    let stateResignationData = resignationsByState.get(d.properties.name);
    let stateResignationsByCategory = []
    let democrateResignations = 0, republicanResignations = 0;

    // clean up any prior displays 
    resetStateInfo();

    if (!stateResignationData) {
      console.log("No resignation date for " + d.properties.name);
      return;
    }
    else {
      let stateResignationsByParty = d3.rollup(stateResignationData, v => v.length, e => e.Party);
      democrateResignations = stateResignationsByParty.get("D") ? stateResignationsByParty.get("D") : 0;
      republicanResignations = stateResignationsByParty.get("R") ? stateResignationsByParty.get("R") : 0;
      // construct an array of Objects {name:categoryName, value : categoryCount} to pass onto the secondary plot function 
      // to align with the pie example https://observablehq.com/@d3/pie-chart/2?intent=fork
      d3.rollup(stateResignationData, v => v.length, e => e.Category)
        .forEach((v, k) => stateResignationsByCategory.push({ name: k, value: v }));

      // console.log(stateResignationData);
      console.log(stateResignationsByCategory);
    }

    // add state information - removing existing ones first 
    // svg.selectAll(".stateInfo").remove();
    let infoContainer = svg.append("g").attr("class", "stateInfo");
    lineSpace = 20;
    textX = width / 2;
    textY = height / 2;
    infoContainer.append("text")
      .attr("x", textX)
      .attr("y", textY)
      .attr("fill", "black")
      .attr("style", "font: 15px")
      .text(d.properties.name);

    textY += lineSpace
    infoContainer.append("text")
      .attr("x", textX)
      .attr("y", textY)
      .attr("fill", "blue")
      // .attr("font", "bold 15px sans-serif")
      .text(`Democratic Resignations: ${democrateResignations}`);

    textY += lineSpace
    infoContainer.append("text")
      .attr("x", textX)
      .attr("y", textY)
      .attr("fill", "red")
      // .attr("font", "bold 15px sans-serif")
      .text(`Republican Resignations: ${republicanResignations}`);
    if (democrateResignations+republicanResignations != 0)
      plotSecondaryGraphs(secondarySVG, stateResignationsByCategory, secWidth, secHeight);

  }
  function plotSecondaryGraphs(svg, data, width, height) {
    // Specify the chart’s dimensions.
    // const width = 928;
    // height = Math.min(height, 500);

    // remove previous graph 
    // svg.selectAll(".piContainer").remove();

    
    if (!data || data.length == 0 ) return;

    // Create the color scale.
    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.name))
      // .domain(resignationCategories) 
      .range(d3.quantize(t => d3.interpolateSpectral(t * 0.8 + 0.1), data.length).reverse())

    // Create the pie layout and arc generator.
    const pie = d3.pie()
      .sort(null)
      .value(d => d.value);

    const arc = d3.arc()
      .innerRadius(0)
      .outerRadius(Math.min(width, height) / 2 - 1);

    const labelRadius = arc.outerRadius()() * 0.8;

    // A separate arc generator for labels.
    const arcLabel = d3.arc()
      .innerRadius(labelRadius)
      .outerRadius(labelRadius);

    const arcs = pie(data);

    // Create the SVG container.
    // const svg = d3.create("svg")
    //     .attr("width", width)
    //     .attr("height", height)
    //     .attr("viewBox", [-width / 2, -height / 2, width, height])
    //     .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    // Add a sector path for each value.

    pieContainer = svg.append("g").attr("class", "piContainer")
    pieContainer.append("g")
      .attr("stroke", "white")
      .selectAll()
      .data(arcs)
      .join("path")
      .attr("fill", d => color(d.data.name))
      .attr("d", arc)
      .append("title")
      .text(d => `${d.data.name}: ${d.data.value.toLocaleString("en-US")}`);

    // Create a new arc generator to place a label close to the edge.
    // The label shows the value if there is enough room.
    pieContainer.append("g")
      .attr("text-anchor", "middle")
      .selectAll()
      .data(arcs)
      .join("text")
      .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
      .call(text => text.append("tspan")
        .attr("y", "-0.4em")
        .attr("font-weight", "bold")
        .text(d => d.data.name))
      .call(text => text.filter(d => (d.endAngle - d.startAngle) > 0.25).append("tspan")
        .attr("x", 0)
        .attr("y", "0.7em")
        .attr("fill-opacity", 0.7)
        .text(d => d.data.value.toLocaleString("en-US")));



  }
}



function enrichData(resignationData) {
  var states = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AS": "American Samoa",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "DC": "District Of Columbia",
    "FM": "Federated States Of Micronesia",
    "FL": "Florida",
    "GA": "Georgia",
    "GU": "Guam",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MH": "Marshall Islands",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "MP": "Northern Mariana Islands",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PW": "Palau",
    "PA": "Pennsylvania",
    "PR": "Puerto Rico",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VI": "Virgin Islands",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
  };

  var categories = {
    "Private sector":"Pvt Office",
    "Unwanted sexual contact":"Sex",
    "Consensual sex scandals":"Sex",
    "Other office":"OtherOffice",
    "Other scandals":"Scandal",
    "Other":"Other",
    "Health/family":"Family",
    "Left early":"LeftEarly",
    "Military service":"Military",
    "Election overturned":"Overturned"
  };
  var parseDate = d3.timeParse("%Y-%m-%d");
  resignationData.forEach((d) => {
    d['StateFullname'] = states[d.State];
    d['Resignation Date'] = parseDate(d['Resignation Date']);
    d['CongressNumber'] = +d.Congress.slice(0, -2);
    d['Category'] = d.Category ? categories[d.Category] : "N/A";
  });

}

Promise.all([
  d3.json("data/us.json"),
  d3.csv("data/resignations.csv")
]).then(([geoJSONdata, resignationData]) => {
   buildChart(geoJSONdata, resignationData);

});