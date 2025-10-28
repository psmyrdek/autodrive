ControlNet preprocess API
Enhance your image generation with ControlNet. Get detailed instructions on integrating and using ControlNet with Runware's different APIs.
Introduction
ControlNet offers advanced capabilities for precise image processing through the use of guide images in specific formats, known as preprocessed images. This powerful tool enhances the control and customization of image generation, enabling users to achieve desired artistic styles and detailed adjustments effectively.

Using ControlNet via our API simplifies the integration of guide images into your workflow. By leveraging the API, you can seamlessly incorporate preprocessed images and specify various parameters to tailor the image generation process to your exact requirements.

Request
Our API always accepts an array of objects as input, where each object represents a specific task to be performed. The structure of the object varies depending on the type of the task. For this section, we will focus on the parameters related to the ControlNet preprocessing task.

The following JSON snippet shows the basic structure of a request object. All properties are explained in detail in the next section.

[
  {
    "taskType": "controlNetPreprocess",
    "taskUUID": "3303f1be-b3dc-41a2-94df-ead00498db57",
    "inputImage": "ff1d9a0b-b80f-4665-ae07-8055b99f4aea",
    "preProcessorType": "canny",
    "height": 512,
    "width": 512
  }
]
taskType
string
required
The type of task to be performed. For this task, the value should be controlNetPreprocess.

taskUUID
string
required
UUID v4
When a task is sent to the API you must include a random UUID v4 string using the taskUUID parameter. This string is used to match the async responses to their corresponding tasks.

If you send multiple tasks at the same time, the taskUUID will help you match the responses to the correct tasks.

The taskUUID must be unique for each task you send to the API.

outputType
"base64Data" | "dataURI" | "URL"
Default: URL
Specifies the output type in which the image is returned. Supported values are: dataURI, URL, and base64Data.

base64Data: The image is returned as a base64-encoded string using the guideImageBase64Data parameter in the response object.
dataURI: The image is returned as a data URI string using the guideImageDataURI parameter in the response object.
URL: The image is returned as a URL string using the guideImageURL parameter in the response object.
outputFormat
"JPG" | "PNG" | "WEBP"
Default: JPG
Specifies the format of the output image. Supported formats are: PNG, JPG and WEBP.

outputQuality
integer
Min: 20
Max: 99
Default: 95
Sets the compression quality of the output image. Higher values preserve more quality but increase file size, lower values reduce file size but decrease quality.

webhookURL
string
Specifies a webhook URL where JSON responses will be sent via HTTP POST when generation tasks complete. For batch requests with multiple results, each completed item triggers a separate webhook call as it becomes available.

Webhooks can be secured using standard authentication methods supported by your endpoint, such as tokens in query parameters or API keys.

// Basic webhook endpoint
https://api.example.com/webhooks/runware
// With authentication token in query
https://api.example.com/webhooks/runware?token=your_auth_token
// With API key parameter
https://api.example.com/webhooks/runware?apiKey=sk_live_abc123
// With custom tracking parameters
https://api.example.com/webhooks/runware?projectId=proj_789&userId=12345
The webhook POST body contains the JSON response for the completed task according to your request configuration.

deliveryMethod
"sync" | "async"
required
Default: sync
Determines how the API delivers task results. Choose between immediate synchronous delivery or polling-based asynchronous delivery depending on your task requirements.

Sync mode ("sync"):

Returns complete results directly in the API response when processing completes within the timeout window. For long-running tasks like video generation or model uploads, the request will timeout before completion, though the task continues processing in the background and results remain accessible through the dashboard.

Async mode ("async"):

Returns an immediate acknowledgment with the task UUID, requiring you to poll for results using getResponse once processing completes. This approach prevents timeout issues and allows your application to handle other operations while waiting.

Polling workflow (async):

Submit request with deliveryMethod: "async".
Receive immediate response with the task UUID.
Poll for completion using getResponse task.
Retrieve final results when status shows "success".
When to use each mode:

Sync: Fast image generation, simple processing tasks.
Async: Video generation, model uploads, or any task that usually takes more than 60 seconds.
Async mode is required for computationally intensive operations to avoid timeout errors.

uploadEndpoint
string
Specifies a URL where the generated content will be automatically uploaded using the HTTP PUT method. The raw binary data of the media file is sent directly as the request body. For secure uploads to cloud storage, use presigned URLs that include temporary authentication credentials.

Common use cases:

Cloud storage: Upload directly to S3 buckets, Google Cloud Storage, or Azure Blob Storage using presigned URLs.
CDN integration: Upload to content delivery networks for immediate distribution.
// S3 presigned URL for secure upload
https://your-bucket.s3.amazonaws.com/generated/content.mp4?X-Amz-Signature=abc123&X-Amz-Expires=3600
// Google Cloud Storage presigned URL
https://storage.googleapis.com/your-bucket/content.jpg?X-Goog-Signature=xyz789
// Custom storage endpoint
https://storage.example.com/uploads/generated-image.jpg
The content data will be sent as the request body to the specified URL when generation is complete.

ttl
integer
Min: 60
Specifies the time-to-live (TTL) in seconds for generated content when using URL output. This determines how long the generated content will be available at the provided URL before being automatically deleted.

This parameter only takes effect when outputType is set to "URL". It has no effect on other output types.

includeCost
boolean
Default: false
If set to true, the cost to perform the task will be included in the response object.

inputImage
string
required
Specifies the input image to be preprocessed to generate a guide image. This guide image will be used as a reference for image generation processes, guiding the AI to generate images that are more aligned with the input image. The input image can be specified in one of the following formats:

An UUID v4 string of a previously uploaded image or a generated image.
A data URI string representing the image. The data URI must be in the format data:<mediaType>;base64, followed by the base64-encoded image. For example: data:image/png;base64,iVBORw0KGgo....
A base64 encoded image without the data URI prefix. For example: iVBORw0KGgo....
A URL pointing to the image. The image must be accessible publicly.
Supported formats are: PNG, JPG and WEBP.

preProcessorType
string
The preprocessor to be used.

canny
depth
mlsd
normalbae
openpose
tile
seg
lineart
lineart_anime
shuffle
scribble
softedge
height
integer
If the inputImage height dimension is larger than this value, the output image will be resized to the specified height in this parameter.

If the parameter width is not set, the output image will maintain the aspect ratio.

width
integer
If the inputImage width dimension is larger than this value, the output image will be resized to the specified width in this parameter.

If the parameter height is not set, the output image will maintain the aspect ratio.

lowThresholdCanny
integer
Min: 0
Max: 255
Default: 100
Defines the lower threshold when using the Canny edge detection preprocessor.

The value must be less than highThresholdCanny.

highThresholdCanny
integer
Min: 0
Max: 255
Default: 200
Defines the high threshold when using the Canny edge detection preprocessor.

The value must be greater than lowThresholdCanny.

includeHandsAndFaceOpenPose
boolean
Default: false
Include the hands and face in the pose outline when using the OpenPose preprocessor.

Response
Results will be delivered in the format below.

{
  "data": [
    {
      "taskType": "controlNetPreprocess",
      "taskUUID": "3303f1be-b3dc-41a2-94df-ead00498db57",
      "guideImageUUID": "b6a06b3b-ce32-4884-ad93-c5eca7937ba0",
      "inputImageUUID": "ff1d9a0b-b80f-4665-ae07-8055b99f4aea",
      "guideImageURL": "https://im.runware.ai/image/ws/0.5/ii/b6a06b3b-ce32-4884-ad93-c5eca7937ba0.jpg",
      "cost": 0.0006
    }
  ]
}
taskType
string
The API will return the taskType you sent in the request. In this case, it will be controlNetPreprocess. This helps match the responses to the correct task type.

taskUUID
string
UUID v4
The API will return the taskUUID you sent in the request. This way you can match the responses to the correct request tasks.

inputImageUUID
string
UUID v4
The unique identifier of the original image used as input for the preprocessing task.

guideImageUUID
string
UUID v4
The unique identifier of the preprocessed image.

guideImageURL
string
If outputType is set to URL, this parameter contains the URL of the preprocessed image to be downloaded.

guideImageBase64Data
string
If outputType is set to base64Data, this parameter contains the base64-encoded data of the preprocessed image.

guideImageDataURI
string
If outputType is set to dataURI, this parameter contains the data URI of the preprocessed image.

cost
float
if includeCost is set to true, the response will include a cost field for each task object. This field indicates the cost of the request in USD.