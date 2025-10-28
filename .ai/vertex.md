{
 "instances": [
    {
      "prompt": "${TEXT_PROMPT}",
      "referenceImages": [
        {
          "referenceType": "REFERENCE_TYPE_RAW",
          "referenceId": 1,
          "referenceImage": {
            "bytesBase64Encoded": "${B64_BASE_IMAGE}"
          }
        },
        {
          "referenceType": "REFERENCE_TYPE_MASK",
          "referenceId": 2,
          "referenceImage": {
            "bytesBase64Encoded": "${B64_MASK_IMAGE}"
          },
          "maskImageConfig": {
            "maskMode": "MASK_MODE_USER_PROVIDED"
          }
        }
      ]
    }
 ],
 "parameters": {
    "sampleCount": "${IMAGE_COUNT}",
    "editMode": "${EDIT_MODE}"
 }
}