import axios from 'axios'

const API_URL = 'https://chorus.fightthe.pw/api/search?query=md5%3D'

const getDownloadUrl = (hash: string) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`${API_URL}${hash}`)
      .then(result => {
        if(result.data && result.data.songs) {
          const songsResult = result.data.songs

          if(songsResult.length == 1) {
            if(songsResult[0].link) {
              resolve(songsResult[0].link)
            } else {
              reject('Missing download link')
            }
          } else if(songsResult.length == 0) {
            reject('No corresponding song found')
          } else {
            reject('More than one song found')
          }
        }
      })
      .catch((err) => {
        reject(`Error: ${err}`)
      })
  })
}

export default getDownloadUrl