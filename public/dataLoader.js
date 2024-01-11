/**
 * Format:
 * device: {
 *   model_name: {
 *     model_resolution: {
 *       inference_backend: {
 *         quantization: {
 *           batch_size: {
 *             "bbox_mAP": "0.2590",
 *             "bbox_mAP_50": "0.4300",
 *             "bbox_mAP_75": "0.2750",
 *             "bbox_mAP_s": "0.0540",
 *             "bbox_mAP_m": "0.2270",
 *             "bbox_mAP_l": "0.3700",
 *             "fps": "109.02"
 *           }, ...
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

  // Some data points lack FPS or mAP because they took too long to test or did
  // not fit into the RAM. We can replace the missing values by other values
  // that should be equal.
  // For FPS: missing values are because the model did not fit into the RAM
  // (this only happened with larger batch sizes). We can use the closest
  // smaller batch size that has FPS values.
  // For mAP: missing values are because the evaluation took too long (on RPI).
  // We can take the values from AGX, for example, since the mAP values are
  // equal.
  for (const device in data) {
    for (const model in data[device]) {
      for (const resolution in data[device][model]) {
        for (const backend in data[device][model][resolution]) {
          for (const quantization in data[device][model][resolution][backend]) {
            for (const batchSize in data[device][model][resolution][backend][quantization]) {
              // Check if the current batch size lacks mAP values but has 'fps' key
              const currentCombination = data[device][model][resolution][backend][quantization][batchSize];

              // Missing FPS
              if (currentCombination && !currentCombination["fps"]) {
                let newBatchSize = batchSize;
                while(!data[device][model][resolution][backend][quantization][newBatchSize]["fps"]){
                  newBatchSize = String(parseInt(newBatchSize) / 2);
                }
                currentCombination["fps"] = data[device][model][resolution][backend][quantization][newBatchSize]["fps"];
                console.log(`MISSING DATA for data point: ${device}, ${model}, ${resolution}, ${backend}, ${quantization}, ${batchSize}: wanted batch size ${batchSize} but only have batch size ${newBatchSize}`)
              }

              // Missing mAP
              if (currentCombination && !currentCombination["bbox_mAP"]) {
                const reference = data["agx"][model][resolution][backend][quantization]["1"];
                currentCombination["bbox_mAP"] = reference["bbox_mAP"];
                currentCombination["bbox_mAP_50"] = reference["bbox_mAP_50"];
                currentCombination["bbox_mAP_75"] = reference["bbox_mAP_75"];
                currentCombination["bbox_mAP_s"] = reference["bbox_mAP_s"];
                currentCombination["bbox_mAP_m"] = reference["bbox_mAP_m"];
                currentCombination["bbox_mAP_l"] = reference["bbox_mAP_l"];
                console.log(`MISSING DATA for data point: ${device}, ${model}, ${resolution}, ${backend}, ${quantization}, ${batchSize}: mAP values are missing and will be copied from AGX Xavier with batch size 1`)
              }
            }
          }
        }
      }
    }
  }
}

// Call the function to load and parse the data
loadData();
