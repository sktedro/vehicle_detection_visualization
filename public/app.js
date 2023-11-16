import { data } from './dataLoader.js';

// Dictionary to translate device values
const deviceTranslations = {
  'agx': 'Jetson AGX Xavier',
  'intel_i7': 'Intel Core i7-9850H',
  'mx150': 'MX150',
  'nano': 'Jetson Nano',
  'nx': 'Jetson Xavier NX',
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


// Initialize all selection divs
function initSelections() {
  initDeviceSelection();
  initBatchSizeSelection();
  initModelResolutionQuantizationSelection();
}



// Initializing device selection
function initDeviceSelection() {
  const deviceSelectionDiv = document.getElementById('device-selection');

  // Generate and append radio buttons for each device
  devices.forEach(device => {
    deviceSelectionDiv.appendChild(createDeviceRow(device));
  });
}

// Function to handle row clicks
function handleRowClick(event) {
  // Find the nearest ancestor row of the clicked element
  const row = event.target.closest('.row');

  // Find the radio button or checkbox within the row
  const input = row.querySelector('input[type="radio"], input[type="checkbox"]');

  // Toggle the checked state, only if the click wasn't directly on the input
  if (input && event.target !== input) {
    input.checked = !input.checked;
  }
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
  label.innerText = deviceTranslations[device];
  row.appendChild(label);

  row.classList.add('row');
  row.addEventListener('click', handleRowClick);

  return row;
}

// Initializing batch size selection
function initBatchSizeSelection() {
  const batchSizeSelectionDiv = document.getElementById('batch-size-selection');

  // Sort batch sizes numerically and generate radio buttons
  batchSizes.sort((a, b) => Number(a) - Number(b));
  batchSizes.forEach(batchSize => {
    batchSizeSelectionDiv.appendChild(createBatchSizeRow(batchSize));
  });
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

function createDataPointSVG(model, resolution, quantization) {
  const svgns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgns, 'svg');
  svg.setAttribute('width', '20');
  svg.setAttribute('height', '20');

  const shape = resolutionToShape[resolution];
  const color = modelToColor[model];
  let { fill, stroke } = quantizationToFillStroke[quantization];
  fill = fill === 'colored' ? color : fill;
  stroke = stroke === 'colored' ? color : stroke;

  let svgElem;
  switch (shape) {
    case 'circle':
      svgElem = document.createElementNS(svgns, 'circle');
      svgElem.setAttribute('cx', '10');
      svgElem.setAttribute('cy', '10');
      svgElem.setAttribute('r', '8');
      break;

    case 'square':
      svgElem = document.createElementNS(svgns, 'rect');
      svgElem.setAttribute('x', '2');
      svgElem.setAttribute('y', '2');
      svgElem.setAttribute('width', '16');
      svgElem.setAttribute('height', '16');
      break;

    case 'triangle':
      svgElem = document.createElementNS(svgns, 'polygon');
      svgElem.setAttribute('points', '10,2 2,18 18,18');
      break;

    case 'diamond':
      svgElem = document.createElementNS(svgns, 'polygon');
      svgElem.setAttribute('points', '10,2 2,10 10,18 18,10');
      break;

    case 'star':
      svgElem = document.createElementNS(svgns, 'polygon');
      svgElem.setAttribute('points', '10,2 11,8 17,8 12,12 14,18 10,14 6,18 8,12 3,8 9,8');
      break;

    default:
      break;
  }
  svgElem.setAttribute('fill', fill);
  svgElem.setAttribute('stroke', stroke); // Add black stroke
  svgElem.setAttribute('stroke-width', '2'); // Adjust the stroke width as needed
  svg.appendChild(svgElem);

  return svg;
}

function createCheckboxAndLabel(className, labelText) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = className;

  const label = document.createElement('label');
  label.innerText = labelText;
  label.style.color = 'black';

  return { checkbox, label };
}

function createRow(className, svgElement, labelText) {
  const row = document.createElement('div');
  row.classList.add('row');

  const { checkbox, label } = createCheckboxAndLabel(className, labelText);

  row.appendChild(checkbox);
  row.appendChild(svgElement);
  row.appendChild(label);

  row.classList.add('row');
  row.addEventListener('click', handleRowClick);

  return row;
}

// Function to create a row for model selection
function createModelRow(model) {
  const modelCircle = createDataPointSVG(model, '640x384', 'none');
  modelCircle.classList.add('model-svg');
  const labelText = modelTranslations[model] || model;

  return createRow('checkbox', modelCircle, labelText);
}

// Function to create a row for resolution selection
function createResolutionRow(resolution) {
  const svg = createDataPointSVG('yolov8_m', resolution, 'none'); // 'medium' replaced with a specific model for example
  svg.classList.add('resolution-svg');

  return createRow('checkbox', svg, resolution);
}

// Function to create a row for quantization selection
function createQuantizationRow(quantization) {
  const quantizationCircle = createDataPointSVG('yolov8_m', '640x384', quantization);
  quantizationCircle.classList.add('quantization-svg');
  const labelText = quantizationTranslations[quantization] || quantization;

  return createRow('checkbox', quantizationCircle, labelText);
}

// Initialize everything
initSelections();