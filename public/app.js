import { data } from './dataLoader.js';

/*
TODOs

- zooming website makes the chart 1 take the whole page width
- hover on data point anywhere to show FPS and mAP and other details
- chart 2
- chart 3
*/

const maxChartHeight = window.innerHeight * 0.9;

// Dictionary to translate device values
const deviceTranslations = {
  'agx': 'Jetson AGX Xavier',
  'nx': 'Jetson Xavier NX',
  'nano': 'Jetson Nano',
  'mx150': 'MX150',
  'intel_i7': 'Intel Core i7-9850H',
  'rpi': 'Raspberry PI',
};

// Model to translated name mapping
const modelTranslations = {
  'yolov8_m': 'Medium',
  'yolov8_l_mobilenet_v2': 'MobileNetV2',
  'yolov8_s': 'Small',
  'yolov8_n': 'Nano',
  'yolov8_p': 'Pico',
  'yolov8_f': 'Femto',
};

// Quantization to translated name mapping
const quantizationTranslations = {
  'none': 'None',
  'fp16': 'FP16',
  'int8': 'INT8',
};

// Model to color mapping
const modelToColor = {
  'yolov8_m': 'red',
  'yolov8_l_mobilenet_v2': 'blue',
  'yolov8_s': 'green',
  'yolov8_n': 'orange',
  'yolov8_p': 'purple',
  'yolov8_f': 'cyan',
};

// Resolution to shape mapping
const resolutionToShape = {
  '640x384': 'circle',
  '512x288': 'square',
  '448x256': 'triangle',
  '384x224': 'diamond',
  '352x192': 'star',
};

const mAPMetricString = {
  "bbox_mAP": "mAP",
  "bbox_mAP_50": "mAP@50",
  "bbox_mAP_75": "mAP@75",
  "bbox_mAP_s": "mAP (small)",
  "bbox_mAP_m": "mAP (medium)",
  "bbox_mAP_l": "mAP (large)",
}

// Quantization to fill/stroke mapping
const quantizationToFillStroke = {
  'none': { fill: 'colored', stroke: 'black' },
  'fp16': { fill: 'colored', stroke: 'none' },
  'int8': { fill: 'transparent', stroke: 'colored' },
};

const devices = Object.keys(deviceTranslations);
const models = Object.keys(modelTranslations);
const quantizations = Object.keys(quantizationTranslations);
const resolutions = Object.keys(resolutionToShape);
const batchSizes = ["1", "2", "4", "8", "16", "32"];
const inferenceEngines = ["tensorrt", "onnxruntime"];
// const mAPMetrics = ["bbox_mAP", "bbox_mAP_50", "bbox_mAP_75", "bbox_mAP_s", "bbox_mAP_m", "bbox_mAP_l"]
const mAPMetrics = ["bbox_mAP_50", "bbox_mAP_75", "bbox_mAP_s", "bbox_mAP_m", "bbox_mAP_l", "bbox_mAP"]

let selectedBatchSize = batchSizes[0];
let selectedDevice = devices[0];
let selectedModels = models;
let selectedResolutions = resolutions;
let selectedQuantizations = quantizations;

/**
 * Always contains up to date model combinations for selected models,
 * resolutions and quantizations (all possible combinations found in data for
 * selected batch size and device)
 */
let selectedModelCombinations = [];
/**
 * Contain a boolean for any possible combination of model, resolution and
 * quantization - true if it was not filtered out, false if the user doesn't
 * want to show it
 */
let additionalFilter = {};
let filteredModelCombinations = [];

const dataPointRadius = 20;
const chart1Div = d3.select("#chart-1");
let chart1Svg = null;
let chart1Tooltip = null;
chart1Div.on('mousemove', (event) => {
  let [x, y] = d3.pointer(event);

  // Subtract margins
  x -= chart1Margin.left + 10;
  y -= chart1Margin.top + 10;

  const xValue = chart1Svg.xScale.invert(x);
  const yValue = chart1Svg.yScale.invert(y);

  // Update the tooltip's content and position
  chart1Tooltip.text(`FPS: ${xValue.toFixed(2)}, mAP: ${yValue.toFixed(3)}`)
    .attr('x', parseInt(chart1Div.style("width")) - chart1Tooltip.node().getBBox().width - 75)
    .attr('y', 25)
    .style('visibility', 'visible');
});
chart1Div.on('mouseout', () => {
  chart1Tooltip.style('visibility', 'hidden');
});

const chart2Div = d3.select("#chart-2");
let chart2Svg = null;

const tableDiv = document.getElementById('table');


/*
 * Get SVG element for a data point
 */


function getDataPointAttributes(model, resolution, quantization) {
  const shape = resolutionToShape[resolution];
  const color = modelToColor[model];
  let { fill, stroke } = quantizationToFillStroke[quantization];
  fill = fill === 'colored' ? color : fill;
  stroke = stroke === 'colored' ? color : stroke;

  let svgShape;
  let arr = {};

  switch (shape) {
    case 'circle':
      svgShape = "circle";
      arr["cx"] = '10';
      arr["cy"] = '10';
      arr["r"] = '8';
      break;

    case 'square':
      svgShape = "rect";
      arr['x'] = '2';
      arr['y'] = '2';
      arr['width'] = '16';
      arr['height'] = '16';
      break;

    case 'triangle':
      svgShape = "polygon";
      arr['points'] = '10,2 2,18 18,18';
      break;

    case 'diamond':
      svgShape = "polygon";
      arr['points'] = '10,2 2,10 10,18 18,10';
      break;

    case 'star':
      svgShape = "polygon";
      arr['points'] = '10,2 11,8 17,8 12,12 14,18 10,14 6,18 8,12 3,8 9,8';
      break;

    default:
      break;
  }
  arr['fill'] = fill;
  arr['stroke'] = stroke; // Add black stroke
  if(shape === "star"){
    arr['stroke-width'] = '2';
  }else{
    arr['stroke-width'] = '3';
  }

  return [svgShape, arr];
}

function createDataPointSVG(model, resolution, quantization) {
  const svgns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgns, 'svg');
  svg.setAttribute('width', dataPointRadius.toString());
  svg.setAttribute('height', dataPointRadius.toString());

  let shape, attributes;
  [shape, attributes] = getDataPointAttributes(model, resolution, quantization);

  let svgElem;
  svgElem = document.createElementNS(svgns, shape);
  for(let key in attributes) {
    svgElem.setAttribute(key, attributes[key]);
  }
  svg.appendChild(svgElem);

  return svg;
}

/*
 * Update functions for update chaining
 */

function selectionChanged(){
  updateAdditionalFilterTable();
  filterChanged();
}

function filterChanged(){
  drawChart1();
  drawChart2();
}

/*
 * Selection functions
 */


function handleSelectionRowClick(event) {
  const row = event.target.closest('.row');
  const input = row.querySelector('input[type="radio"], input[type="checkbox"]');

  if (input) {
    // Handle radio buttons
    if (input.type === 'radio') {
      if (input.checked) return; // Prevent deselection

      const allRadios = document.querySelectorAll(`input[name="${input.name}"]`);
      allRadios.forEach(radio => {
        radio.closest('.row').classList.remove('active');
      });

      input.checked = true;
      row.classList.add('active');

      // Update global variable based on the input name
      if (input.name === 'device') {
        selectedDevice = input.value
      } else if (input.name === 'batch-size') {
        selectedBatchSize = input.value;
      }
    }

    // Handle checkboxes
    else if (input.type === 'checkbox') {
      input.checked = !input.checked;
      row.classList.toggle('active', input.checked);

      // Update global arrays based on checkbox name
      updateSelectedArrays();
    }

    updateModelCombinations();
    selectionChanged();
  }
  // console.log(selectedBatchSize)
  // console.log(selectedDevice)
  // console.log(selectedModels);
  // console.log(selectedResolutions);
  // console.log(selectedQuantizations)
}

function updateSelectedArrays() {
  selectedModels = Array.from(document.querySelectorAll('.selection-column.model-column .row.active input'))
    .map(input => input.value);

  selectedResolutions = Array.from(document.querySelectorAll('.selection-column.resolution-column .row.active input'))
    .map(input => input.value);

  selectedQuantizations = Array.from(document.querySelectorAll('.selection-column.quantization-column .row.active input'))
    .map(input => input.value);
}


function updateModelCombinations() {
  selectedModelCombinations = [];

  if (selectedDevice && selectedBatchSize && selectedModels.length > 0 && selectedResolutions.length > 0 && selectedQuantizations.length > 0) {
    selectedModels.forEach(model => {
      selectedResolutions.forEach(resolution => {
        selectedQuantizations.forEach(quantization => {
          // Check if the combination exists in the data
          if (data[selectedDevice] && data[selectedDevice][model] && data[selectedDevice][model][resolution]) {
            const inferenceBackend = data[selectedDevice][model][resolution]["tensorrt"] ? "tensorrt" : "onnxruntime";
            if (data[selectedDevice][model][resolution][inferenceBackend] && data[selectedDevice][model][resolution][inferenceBackend][quantization]) {
              if (data[selectedDevice][model][resolution][inferenceBackend][quantization][selectedBatchSize]) {
                selectedModelCombinations.push([model, resolution, quantization]);
              }
            }
          }
        });
      });
    });
  }
}

// Initializing batch size selection
function initBatchSizeSelection() {
  const batchSizeSelectionDiv = document.getElementById('batch-size-selection');

  // Sort batch sizes numerically and generate radio buttons
  batchSizes.sort((a, b) => Number(a) - Number(b));
  batchSizes.forEach(batchSize => {
    batchSizeSelectionDiv.appendChild(createBatchSizeRow(batchSize));
  });
  // Click last element (batch size 32)
  let elems = [...batchSizeSelectionDiv.querySelectorAll('.row')]
  elems.slice(-1)[0].click()
}

// Creating a row for batch size selection
function createBatchSizeRow(batchSize) {
  const row = document.createElement('div');
  const radioButton = document.createElement('input');
  radioButton.type = 'radio';
  radioButton.name = 'batch-size';
  radioButton.value = batchSize;
  radioButton.className = 'batch-size-radio';
  row.appendChild(radioButton);

  const label = document.createElement('label');
  label.innerText = batchSize;
  label.className = 'batch-size-label';
  row.appendChild(label);

  row.classList.add('row');
  row.addEventListener('click', handleSelectionRowClick);

  return row;
}

// Initializing device selection
function initDeviceSelection() {
  const deviceSelectionDiv = document.getElementById('device-selection');

  // Generate and append radio buttons for each device
  devices.forEach(device => {
    deviceSelectionDiv.appendChild(createDeviceRow(device));
  });
  deviceSelectionDiv.querySelector('.row').click();
}

// Creating a row for device selection
function createDeviceRow(device) {
  const row = document.createElement('div');
  const radioButton = document.createElement('input');
  radioButton.type = 'radio';
  radioButton.name = 'device';
  radioButton.value = device;
  radioButton.className = 'device-radio';
  row.appendChild(radioButton);

  const label = document.createElement('label');
  label.className = 'device-label';
  row.appendChild(radioButton);
  label.innerText = deviceTranslations[device];
  row.appendChild(label);

  row.classList.add('row');
  row.addEventListener('click', handleSelectionRowClick);

  return row;
}

function initModelResolutionQuantizationSelection() {
  const selectionDiv = document.getElementById('model-res-quant-selection');
  models.forEach(model => selectionDiv.querySelector('.model-column').appendChild(createModelRow(model)));
  resolutions.forEach(resolution => selectionDiv.querySelector('.resolution-column').appendChild(createResolutionRow(resolution)));
  quantizations.forEach(quantization => selectionDiv.querySelector('.quantization-column').appendChild(createQuantizationRow(quantization)));
  updateSelectedArrays();
  updateModelCombinations();
  selectionChanged();
}

function createCheckboxAndLabel(value, type, labelText) {
  const checkbox = document.createElement('input');
  checkbox.name = type;
  checkbox.type = 'checkbox';
  checkbox.classList.add("checkbox", type + "-checkbox");
  checkbox.value = value;

  const label = document.createElement('label');
  label.innerText = labelText;
  label.classList.add("checkbox-label", type + '-checkbox-label');

  return { checkbox, label };
}

function createRow(value, type, svgElement, labelText) {
  const row = document.createElement('div');
  row.classList.add('row');

  const { checkbox, label } = createCheckboxAndLabel(value, type, labelText);

  row.appendChild(checkbox);
  row.appendChild(svgElement);
  row.appendChild(label);

  row.classList.add('row');
  row.addEventListener('click', handleSelectionRowClick);
  row.click();

  return row;
}

// Function to create a row for model selection
function createModelRow(model) {
  const modelCircle = createDataPointSVG(model, '640x384', 'none');
  modelCircle.classList.add('model-svg');
  const labelText = modelTranslations[model] || model;

  return createRow(model, 'model', modelCircle, labelText);
}

// Function to create a row for resolution selection
function createResolutionRow(resolution) {
  const svg = createDataPointSVG('yolov8_m', resolution, 'none'); // 'medium' replaced with a specific model for example
  svg.classList.add('resolution-svg');

  return createRow(resolution, 'resolution', svg, resolution);
}

// Function to create a row for quantization selection
function createQuantizationRow(quantization) {
  const quantizationCircle = createDataPointSVG('yolov8_m', '640x384', quantization);
  quantizationCircle.classList.add('quantization-svg');
  const labelText = quantizationTranslations[quantization] || quantization;

  return createRow(quantization, 'quantization', quantizationCircle, labelText);
}






/*
 * Additional filter table
 */

function getAllPossibleCombinations() {
  let allCombinations = [];

  // Assuming data structure is data[device][model][resolution][inferenceBackend][quantization][batchSize]
  for (const device in data) {
    for (const model in data[device]) {
      for (const resolution in data[device][model]) {
        const inferenceBackend = data[device][model][resolution]["tensorrt"] ? "tensorrt" : "onnxruntime";
        for (const quantization in data[device][model][resolution][inferenceBackend]) {
          for (const batchSize in data[device][model][resolution][inferenceBackend][quantization]) {
            allCombinations.push([model, resolution, quantization]);
          }
        }
      }
    }
  }
  // Remove duplicate combinations if necessary
  return allCombinations.filter((combination, index, self) => 
    index === self.findIndex((t) => (
      t[0] === combination[0] && t[1] === combination[1] && t[2] === combination[2]
    ))
  );
}


function initializeAdditionalFilter() {
  const allCombinations = getAllPossibleCombinations();
  allCombinations.forEach(([model, resolution, quantization]) => {
    const key = [model, resolution, quantization].join(':');
    additionalFilter[key] = true;
  });

  document.getElementById('reset-button').addEventListener('click', () => {
    // Click on all inactive rows to toggle them
    const rows = document.querySelectorAll('#table .table-row:not(.active)');
    rows.forEach(row => {
      row.click();
    });

    // If disabled values are not visible, change them directly in additionalFilter var
    for (const key in additionalFilter) {
      additionalFilter[key] = true;
    }

    // The filter was updated:
    filterChanged();
  });

}

function updateFilteredModelCombinations() {
  filteredModelCombinations = selectedModelCombinations.filter(combination => {
    const key = combination.join(':');
    return additionalFilter[key];
  });
}

function createFilterTableRow(combination){
  const rowDiv = document.createElement('div');
  rowDiv.className = 'table-row';
  rowDiv.dataset.combination = combination.join(':'); // Add combination as data attribute

  // Visibility Checkbox (hidden)
  const checkboxDiv = document.createElement('div');
  checkboxDiv.className = 'table-checkbox';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkboxDiv.appendChild(checkbox);
  rowDiv.appendChild(checkboxDiv);

  // SVG Visual
  const svgDiv = document.createElement('div');
  svgDiv.className = 'table-svg';
  const [model, resolution, quantization] = combination;
  const svgVisual = createDataPointSVG(model, resolution, quantization);
  svgDiv.appendChild(svgVisual);
  rowDiv.appendChild(svgDiv);

  // Model, Resolution, Quantization Text
  const textDiv = document.createElement('div');
  textDiv.className = 'table-text';
  textDiv.innerHTML = `<span class='table-text-model'>${modelTranslations[model]}</span><span class='table-text-resolution'>${resolution}</span><span class='table-text-quantization'>${quantizationTranslations[quantization]}</span>`;
  rowDiv.appendChild(textDiv);

  // Row click event listener
  rowDiv.addEventListener('click', () => {
    checkbox.checked = !checkbox.checked;
    rowDiv.classList.toggle('active', checkbox.checked);
    additionalFilter[combination.join(':')] = checkbox.checked;
    updateFilteredModelCombinations();
    filterChanged();
  });

  // Set initial state
  const key = combination.join(':');
  checkbox.checked = additionalFilter[key];
  if (checkbox.checked) {
    rowDiv.classList.add('active');
  }

  return rowDiv;
}


function updateAdditionalFilterTable() {
  updateFilteredModelCombinations();
  
  const existingRows = tableDiv.getElementsByClassName('table-row');

  // Create a map of existing rows for easy access
  const rowMap = {};
  Array.from(existingRows).forEach(row => {
    rowMap[row.dataset.combination] = row;
  });

  // Clear the table
  for(const elem of Array.from(document.getElementsByClassName('table-row'))){
    elem.remove()
  }

  // Rebuild the table using the order in selectedModelCombinations
  selectedModelCombinations.forEach(combination => {
    const combinationKey = combination.join(':');
    let rowDiv;

    if (rowMap[combinationKey]) {
      // Use the existing row if it's already in the table
      rowDiv = rowMap[combinationKey];
    } else {
      // Create a new row if it doesn't exist
      rowDiv = createFilterTableRow(combination);
    }

    // Append the row in the correct order
    tableDiv.appendChild(rowDiv);
  });
}




/*
 * Chart 1
 */

const chart1Margin = { top: 40, right: 20, bottom: 30, left: 40 };
function drawChart1() {

  let svgWidth = parseInt(chart1Div.style("width")) - chart1Margin.left - chart1Margin.right;
  let svgHeight = parseInt(chart1Div.style("width")) * 0.5 - chart1Margin.top - chart1Margin.bottom;
  if(svgHeight > maxChartHeight){
    let oldSvgHeight = svgHeight;
    svgHeight = maxChartHeight;
    svgWidth = svgWidth * (svgHeight / oldSvgHeight);
  }

  if(chart1Svg){
    chart1Svg.remove();
    chart1Svg = null;
    chart1Div.select("svg").remove();
  }

  chart1Svg = chart1Div.append("svg")
      // .attr("width", width + margin.left + margin.right) // like this, the chart div would keep getting larger on every call of this function, for some reason
      .attr("width", svgWidth + chart1Margin.left)
      .attr("height", svgHeight + chart1Margin.top + chart1Margin.bottom)
    .append("g")
      .attr("transform", `translate(${chart1Margin.left},${chart1Margin.top})`);

  // TODO Fix this - not a good placement.
  // place FPS to the center and maybe mAP too? Margins would have to be increased
  chart1Svg.append('text').text("mAP")
    .attr('x', 0)
    .attr('y', -20)
    .attr('font-size', '1.1em')
    .style('text-anchor', 'end')
  chart1Svg.append('text').text("FPS")
    .attr('x', svgWidth)
    .attr('y', svgHeight + 30)
    .attr('font-size', '1.1em')
    .style('text-anchor', 'end')

  // Store scales and axes in the SVG for later access
  chart1Svg.xScale = d3.scaleLog().range([0, svgWidth - chart1Margin.right]);
  chart1Svg.yScale = d3.scaleLinear().range([svgHeight, 0]);
  chart1Svg.xAxisGroup = chart1Svg.append("g").attr("transform", `translate(0,${svgHeight})`);
  chart1Svg.yAxisGroup = chart1Svg.append("g");

  const filteredData = getFilteredData();

  const minX = d3.min(filteredData, d => d.fps) * 0.95;
  const maxX = d3.max(filteredData, d => d.fps) * 1.05;
  chart1Svg.xScale.domain([minX, maxX]);

  const minY = d3.min(filteredData, d => d.bbox_mAP) * 0.90;
  const maxY = d3.max(filteredData, d => d.bbox_mAP);
  chart1Svg.yScale.domain([minY, maxY]);

  // Update axes
  const xAx = d3.axisBottom(chart1Svg.xScale)
  const yAx = d3.axisLeft(chart1Svg.yScale)

  let fontSize = "16px";
  // chart1Svg.xAxisGroup.call(xAx);
  chart1Svg.xAxisGroup.call(xAx)
    .selectAll('.tick text')
    .style('font-size', fontSize);
  // chart1Svg.yAxisGroup.call(yAx);
  chart1Svg.yAxisGroup.call(yAx)
    .selectAll('.tick text')
    .style('font-size', fontSize);

  // Bind data to SVG elements
  const points = chart1Svg.selectAll(".data-point").data(filteredData, d => d.combination);

  // Enter new elements
  points.enter()
    .append('g')
    .attr("class", "data-point")
    .attr("transform", d => `translate(${chart1Svg.xScale(d.fps) - dataPointRadius / 2}, ${chart1Svg.yScale(d.bbox_mAP) - dataPointRadius / 2})`)
    .each(function(d) {
      this.appendChild(createDataPointSVG(d.model, d.resolution, d.quantization));
    });

  // Remove old elements
  points.exit().remove();

  // Add the tooltip
  chart1Tooltip = chart1Svg.append('text')
    .attr('class', 'tooltip')
    .style('visibility', 'hidden');
}


function getFilteredData() {
  return filteredModelCombinations.map(([model, resolution, quantization]) => {
    const inferenceBackend = data[selectedDevice][model][resolution]["tensorrt"] ? "tensorrt" : "onnxruntime";
    let deviceData = data[selectedDevice][model][resolution][inferenceBackend][quantization][selectedBatchSize];
    return {
      model,
      resolution,
      quantization,
      fps: parseFloat(deviceData.fps),
      bbox_mAP: parseFloat(deviceData.bbox_mAP),
      bbox_mAP_50: parseFloat(deviceData.bbox_mAP_50),
      bbox_mAP_75: parseFloat(deviceData.bbox_mAP_75),
      bbox_mAP_s: parseFloat(deviceData.bbox_mAP_s),
      bbox_mAP_m: parseFloat(deviceData.bbox_mAP_m),
      bbox_mAP_l: parseFloat(deviceData.bbox_mAP_l),
      combination: [model, resolution, quantization].join(':') // Unique identifier
    };
  });
}





/*
 * Initialize the page
 */

initializeAdditionalFilter();
initDeviceSelection();
initBatchSizeSelection();
initModelResolutionQuantizationSelection();





// SPIDER CHART
function polarToCartesian(angle, radius) {
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle)
  };
}
function drawChart2(){

  if(chart2Svg){
    chart2Svg.remove();
    chart2Svg = null;
    chart2Div.select("svg").remove();
  }

  let svgHeight = maxChartHeight;
  let svgWidth = 1.15 * svgHeight;
  if(window.innerWidth < svgWidth){
    svgWidth = window.innerWidth;
    svgHeight = svgWidth / 1.15;
  }
  const svgRadius = svgWidth / 2;

  chart2Svg = chart2Div.append("svg")
      .attr("width", svgWidth + chart1Margin.left)
      .attr("height", svgHeight + chart1Margin.top)
    .append("g")
      .attr("transform", `translate(${svgWidth / 2 + chart1Margin.left / 2},${svgHeight / 2 + chart1Margin.top / 2})`);

  let notice = chart2Div.select(".notice");
  let txt = "Please not that the mAP values for FP32 and FP16 are always the same. Therefore, if both are present, only FP16 is shown.";
  if(notice){
    notice.remove();
  }
  chart2Div.append("center").text(txt).attr("class", "notice").style("font-size", "0.9em").style("color", "gray");

  const scales = [...Array(mAPMetrics.length)].map(() => d3.scaleLinear()
    .range([0, svgRadius])
    .domain([0, 0.85]));


  // Bind data to SVG elements
  let oldFilteredData = getFilteredData();
  let filteredData = [];
  for(let i = 0; i < oldFilteredData.length; i++){

    // If the data point is FP32 and FP16 is also present (not filtered out) for the same combination, only show FP16
    if(oldFilteredData[i].quantization === "none"){
      let fp16Exists = oldFilteredData.some(d =>
        d.quantization === "fp16" &&
        d.model === oldFilteredData[i].model &&
        d.resolution === oldFilteredData[i].resolution &&
        d.device === oldFilteredData[i].device
      );
      // Skip the FP32 data point if FP16 exists
      if (fp16Exists){
        continue;
      }
    }

    for(let j = 0; j < mAPMetrics.length; j++){
      let old = {...oldFilteredData[i]};
      let new_d = old;
      new_d.map_metric = mAPMetrics[j];
      new_d.map_metric_value = new_d[mAPMetrics[j]];
      new_d.combination = new_d.combination + ":" + new_d.map_metric;
      filteredData.push(new_d);
    }
  }
  const points = chart2Svg.selectAll(".data-point").data(filteredData, d => d.combination);

  function getDataPointCoords(d){
    let mAP_metric = d.map_metric;
    let value = d.map_metric_value;
    let sliceAngle = Math.PI * 2 / mAPMetrics.length;
    let angle = sliceAngle * mAPMetrics.indexOf(mAP_metric);
    let radius = scales[mAPMetrics.indexOf(mAP_metric)](value)
    return polarToCartesian(angle, radius);
  }

  // Enter new elements
  points.enter()
    .append('g')
    .attr("class", "data-point")
    .attr("transform", d => `translate(${getDataPointCoords(d).x - dataPointRadius / 2}, ${getDataPointCoords(d).y - dataPointRadius / 2})`)
    .each(function(d) {
      this.appendChild(createDataPointSVG(d.model, d.resolution, d.quantization));
    });

  /**
  function calculateIntermediatePoints(start, end, numberOfPoints) {
    let points = [];
    for (let i = 1; i <= numberOfPoints; i++) {
      let x = start.x + (end.x - start.x) * i / (numberOfPoints + 1);
      let y = start.y + (end.y - start.y) * i / (numberOfPoints + 1);
      points.push({ x, y });
    }
    return points;
  }
  // Connect points by dotted lines (dots in style of the data points)
  let dataGroups = d3.group(filteredData, d => d.model + d.quantization + d.resolution);
  dataGroups.forEach(group => {
    // Convert group from Map to Array
    let groupArray = Array.from(group);
    groupArray.push(groupArray[0]); // Add first element to the end to close the loop

    for (let i = 0; i < groupArray.length - 1; i++) {
      let startData = groupArray[i];
      let endData = groupArray[i + 1];

      let startPoint = getDataPointCoords(startData);
      let endPoint = getDataPointCoords(endData);

      // Calculate intermediate points
      let intermediatePoints = calculateIntermediatePoints(startPoint, endPoint, 5);

      // Draw small dots at intermediate points
      // intermediatePoints.forEach(point => {
      //   chart2Svg.append('circle')
      //     .attr('cx', point.x)
      //     .attr('cy', point.y)
      //     .attr('r', 2) // Small radius for dots
      //     .style('fill', 'black');
      // });
      intermediatePoints.forEach(point => {
        let smallDot = createDataPointSVG(startData.model, startData.resolution, startData.quantization);
        chart2Svg.append(() => smallDot)
          .attr('transform', `translate(${point.x}, ${point.y})`);
      });
    }
  });
  */
  let dataGroups = d3.group(filteredData, d => d.model + d.quantization + d.resolution);
  dataGroups.forEach(group => {
    // Convert group from Map to Array
    let groupArray = Array.from(group);
    groupArray.push(groupArray[0]); // Add first element to the end to close the loop

    for (let i = 0; i < groupArray.length - 1; i++) {
      let startData = groupArray[i];
      let endData = groupArray[i + 1];

      let startPoint = getDataPointCoords(startData);
      let endPoint = getDataPointCoords(endData);

      let [svgShape, attribs] = getDataPointAttributes(startData.model, startData.resolution, startData.quantization);
      let fill = attribs["fill"];
      let stroke = attribs["stroke"];

      if(fill === "transparent"){
        chart2Svg.append('line')
          .attr('x1', startPoint.x)
          .attr('y1', startPoint.y)
          .attr('x2', endPoint.x)
          .attr('y2', endPoint.y)
          .style('stroke', stroke)
          .style('stroke-width', '1px');
      }else if(stroke === "none"){
        chart2Svg.append('line')
          .attr('x1', startPoint.x)
          .attr('y1', startPoint.y)
          .attr('x2', endPoint.x)
          .attr('y2', endPoint.y)
          .style('stroke', fill)
          .style('stroke-width', '3px');
      }else{

        chart2Svg.append('line')
          .attr('x1', startPoint.x)
          .attr('y1', startPoint.y)
          .attr('x2', endPoint.x)
          .attr('y2', endPoint.y)
          .style('stroke', stroke)
          .style('stroke-width', '3px');
        chart2Svg.append('line')
          .attr('x1', startPoint.x)
          .attr('y1', startPoint.y)
          .attr('x2', endPoint.x)
          .attr('y2', endPoint.y)
          .style('stroke', fill)
          .style('stroke-width', '1px');
      }
    }
  });

  // Remove old elements
  points.exit().remove();

  // Draw axes
  for (let i = 0; i < mAPMetrics.length; i++) {
    const angle = (Math.PI * 2 / mAPMetrics.length) * i;
    const lineCoords = polarToCartesian(angle, svgRadius);

    // Add axes text:
    chart2Svg.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', lineCoords.x)
      .attr('y2', lineCoords.y)
      .style('stroke', 'black')
      .style('stroke-width', '1px');
    if([1, 2, 4, 5].includes(i)){
      chart2Svg.append('text')
        .attr('x', lineCoords.x + 20)
        .attr('y', lineCoords.y)
        .text(mAPMetricString[mAPMetrics[i]]);
    }else if (i == 0){
      chart2Svg.append('text')
        .attr('x', lineCoords.x)
        .attr('y', lineCoords.y - 20)
        .style('text-anchor', 'end')
        .text(mAPMetricString[mAPMetrics[i]]);
    }else{
      chart2Svg.append('text')
        .attr('x', lineCoords.x)
        .attr('y', lineCoords.y - 20)
        .text(mAPMetricString[mAPMetrics[i]]);
    }
  }

  // Ticks and tick labels
  const tickStep = 0.05;
  const ticksPerAxis = 0.85 / tickStep;
  for (let i = 0; i < mAPMetrics.length; i++) {
    const angle = (Math.PI * 2 / mAPMetrics.length) * i;

    for (let j = 1; j < ticksPerAxis; j++) { // skip 0
      const tickValue = j * tickStep;
      const tickCoords1 = polarToCartesian(angle-0.1/j, scales[i](tickValue)); // divide by j so each tick is the same length
      const tickCoords2 = polarToCartesian(angle+0.1/j, scales[i](tickValue));
      let maxX = d3.max([tickCoords1.x, tickCoords2.x]);
      let maxY = d3.max([tickCoords1.y, tickCoords2.y]);

      // Only add tick labels for every other tick
      if(j % 2 === 0){
        if ([1, 2, 4, 5].includes(i)) {
          chart2Svg.append('text')
            .attr('x', maxX + 10)
            .attr('y', maxY + 2)
            .text(tickValue.toFixed(1));
        } else if ([0, 3].includes(i)) {
          chart2Svg.append('text')
            .attr('x', maxX)
            .attr('y', maxY + dataPointRadius)
            .style('text-anchor', 'middle')
            .text(tickValue.toFixed(1));
        }
      }

      // Tick line
      chart2Svg.append('line')
        .attr('x1', tickCoords1.x)
        .attr('y1', tickCoords1.y)
        .attr('x2', tickCoords2.x)
        .attr('y2', tickCoords2.y)
        .style('stroke', 'black')
        .style('stroke-width', '1px');
    }
  }

}


