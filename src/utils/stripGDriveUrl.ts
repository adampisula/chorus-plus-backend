const stripGDriveUrl = (url: string) => {
  // FILE
  if(url.includes('/file/d/')) {
    let gdId = url.split('/file/d/')[1]
    gdId = gdId.split('/view')[0]

    return gdId
  }

  // FOLDER
  else if(url.includes('/drive/folders/')) {
    let gdId = url.split('/drive/folders/')[1]

    return gdId
  }

  return null
}

export default stripGDriveUrl