/**
 * Format:
 * device: {
 *   model_name: {
 *     model_resolution: {
 *       inference_backend: {
 *         quantization: {
 *           model_shape: {
 *             batch_size: {
 *               "bbox_mAP": "0.2590",
 *               "bbox_mAP_50": "0.4300",
 *               "bbox_mAP_75": "0.2750",
 *               "bbox_mAP_s": "0.0540",
 *               "bbox_mAP_m": "0.2270",
 *               "bbox_mAP_l": "0.3700",
 *               "fps": "109.02"
 *             }, ...
 */
export const data = {};

function loadData() {
  /**
   * Load and parse the JSON data
   */
  const xhr = new XMLHttpRequest();
  xhr.open('GET', './public/data.json', false); // Synchronous request
  xhr.overrideMimeType('application/json');
  xhr.send(null);

  if (xhr.status === 200) {
    const jsonData = JSON.parse(xhr.responseText);

    // Remove the "dynamic" level from the data
    for (const device in jsonData) {
      data[device] = {};
      for (const model in jsonData[device]) {
        data[device][model] = {};
        for (const resolution in jsonData[device][model]) {
          data[device][model][resolution] = {};
          for (const backend in jsonData[device][model][resolution]) {
            data[device][model][resolution][backend] = {};
            for (const quantization in jsonData[device][model][resolution][backend]) {
              data[device][model][resolution][backend][quantization] = jsonData[device][model][resolution][backend][quantization]['dynamic'];
            }
          }
        }
      }
    }
  } else {
    console.error('Failed to load data.');
  }
}

// Call the function to load and parse the data
loadData();
