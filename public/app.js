import { data } from './dataLoader.js';

/*
TODOs

- zooming website makes the chart 1 take the whole page width
*/

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
const mAPMetrics = ["bbox_mAP", "bbox_mAP_50", "bbox_mAP_75", "bbox_mAP_s",
    "bbox_mAP_m", "bbox_mAP_l"]

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
let prevSelectedModelCombinations = [];


const chart1Div = d3.select("#chart-1");
let chart1Svg = null;

// Chart 1 coordinates tooltip
let chart1Tooltip = null;
chart1Div.on('mousemove', (event) => {
  const [x, y] = d3.pointer(event);
  const xValue = chart1Svg.xScale.invert(x);
  const yValue = chart1Svg.yScale.invert(y);

  // Update the tooltip's content and position
  chart1Tooltip.text(`FPS: ${xValue.toFixed(2)}, mAP: ${yValue.toFixed(3)}`)
    .attr('x', parseInt(chart1Div.style("width")) - chart1Tooltip.node().getBBox().width - 75)
    .attr('y', 25)
    .style('visibility', 'visible');
});
chart1Div.on('mouseout', () => {
  // Hide the tooltip when the cursor leaves the chart
  chart1Tooltip.style('visibility', 'hidden');
});


function handleRowClick(event) {
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
    if (input.type === 'checkbox') {
      input.checked = !input.checked;
      row.classList.toggle('active', input.checked);

      // Update global arrays based on checkbox name
      updateSelectedArrays(input.name, input.value, input.checked);
    }
    updateModelCombinations();
    updateSelection();
  }
  // console.log(selectedBatchSize)
  // console.log(selectedDevice)
  // console.log(selectedModels);
  // console.log(selectedResolutions);
  // console.log(selectedQuantizations)
}

function updateSelection(){
  drawChart1();
}

// Function to update global arrays
function updateSelectedArrays(name, value, checked) {
  let arrayToUpdate;
  if (name === 'model') {
    arrayToUpdate = selectedModels;
  } else if (name === 'resolution') {
    arrayToUpdate = selectedResolutions;
  } else if (name === 'quantization') {
    arrayToUpdate = selectedQuantizations;
  }

  if (arrayToUpdate) {
    if (checked && !arrayToUpdate.includes(value)) {
      arrayToUpdate.push(value);
    } else if (!checked) {
      const index = arrayToUpdate.indexOf(value);
      if (index > -1) arrayToUpdate.splice(index, 1);
    }
  }
}

function updateModelCombinations() {
  prevSelectedModelCombinations = selectedModelCombinations;
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
  row.addEventListener('click', handleRowClick);

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
  row.addEventListener('click', handleRowClick);

  return row;
}

function initModelResolutionQuantizationSelection() {
  const selectionDiv = document.getElementById('model-res-quant-selection');
  models.forEach(model => selectionDiv.querySelector('.model-column').appendChild(createModelRow(model)));
  resolutions.forEach(resolution => selectionDiv.querySelector('.resolution-column').appendChild(createResolutionRow(resolution)));
  quantizations.forEach(quantization => selectionDiv.querySelector('.quantization-column').appendChild(createQuantizationRow(quantization)));
}

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
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');

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
  row.addEventListener('click', handleRowClick);
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







initDeviceSelection();
initBatchSizeSelection();
initModelResolutionQuantizationSelection();

/*
 * Chart 1
 */

function drawChart1() {
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };

  let width = parseInt(chart1Div.style("width")) - margin.left - margin.right;
  let height = parseInt(chart1Div.style("width")) * 0.5 - margin.top - margin.bottom;

  if(chart1Svg){
    chart1Svg.remove();
    chart1Svg = null;
    chart1Div.select("svg").remove();
  }

  chart1Svg = chart1Div.append("svg")
      // .attr("width", width + margin.left + margin.right) // like this, the chart div would keep getting larger on every call of this function, for some reason
      .attr("width", width + margin.left)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Store scales and axes in the SVG for later access
  chart1Svg.xScale = d3.scaleLog().range([0, width - margin.right]);
  chart1Svg.yScale = d3.scaleLinear().range([height, 0]);
  chart1Svg.xAxisGroup = chart1Svg.append("g").attr("transform", `translate(0,${height})`);
  chart1Svg.yAxisGroup = chart1Svg.append("g");

  const filteredData = getFilteredData();


  // Make min and max the second to closest number of multiples of: 1, 2, 5, 10, ...
  // TODO or just like 2% smaller and 2% larger than the min and max values?
  const minFPS = d3.min(filteredData, d => d.fps);
  const maxFPS = d3.max(filteredData, d => d.fps);

  /*
  let minFPStmp = minFPS;
  let multiplier = 1;
  while(minFPStmp < 1){
    minFPStmp *= 10;
    multiplier /= 10;
  }
  while(minFPStmp > 10){
    minFPStmp /= 10;
    multiplier *= 10;
  }
  if(minFPStmp < 2){
    var minX = 0.5;
  }else if(minFPStmp < 5){
    var minX = 1;
  }else{
    var minX = 2;
  }
  minX *= multiplier;

  let maxFPStmp = maxFPS;
  multiplier = 1;
  while(maxFPStmp < 1){
    maxFPStmp *= 10;
    multiplier /= 10;
  }
  while(maxFPStmp > 10){
    maxFPStmp /= 10;
    multiplier *= 10;
  }
  if(maxFPStmp > 5){
    var maxX = 20;
  }else if(maxFPStmp > 2){
    var maxX = 10;
  }else{
    var maxX = 5;
  }
  maxX *= multiplier;
  */

  const minX = minFPS * 0.95;
  const maxX = maxFPS * 1.05;

  chart1Svg.xScale.domain([minX, maxX]);

  const minMAP = d3.min(filteredData, d => d.mAP) - 0.02;
  const maxMAP = d3.max(filteredData, d => d.mAP) + 0.03;
  // const minY = Math.floor(minMAP * 20) / 20;
  // const maxY = Math.ceil(maxMAP * 20) / 20;
  const minY = minMAP * 0.95;
  const maxY = maxMAP * 1.05;
  chart1Svg.yScale.domain([minY, maxY]);

  // Update axes
  const xAx = d3.axisBottom(chart1Svg.xScale)
  const yAx = d3.axisLeft(chart1Svg.yScale)

  // TODO Gridlines:
  // xAx.ticks(5).tickSize(-height)
  // yAx.ticks(5).tickSize(-width)

  chart1Svg.xAxisGroup.call(xAx);
  chart1Svg.yAxisGroup.call(yAx);

  // Bind data to SVG elements
  const points = chart1Svg.selectAll(".data-point").data(filteredData, d => d.combination);

  // Enter new elements
  points.enter()
    .append('g')
    .attr("class", "data-point")
    .attr("transform", d => `translate(${chart1Svg.xScale(d.fps)}, ${chart1Svg.yScale(d.mAP)})`)
    .each(function(d) {
      this.appendChild(createDataPointSVG(d.model, d.resolution, d.quantization));
    });

  // Remove old elements
  points.exit().remove();

  chart1Tooltip = chart1Svg.append('text')
    .attr('class', 'tooltip')
    .style('visibility', 'hidden');
}


function getFilteredData() {
  return selectedModelCombinations.map(([model, resolution, quantization]) => {
    const inferenceBackend = data[selectedDevice][model][resolution]["tensorrt"] ? "tensorrt" : "onnxruntime";
    let deviceData = data[selectedDevice][model][resolution][inferenceBackend][quantization][selectedBatchSize];
    return {
      model,
      resolution,
      quantization,
      fps: parseFloat(deviceData.fps),
      mAP: parseFloat(deviceData.bbox_mAP),
      combination: [model, resolution, quantization].join(':') // Unique identifier
    };
  });
}


