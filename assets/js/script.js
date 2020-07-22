const apiAddress = "";
const apiKey = "";
const apiArtist = "";
let musicSearchEl = document.querySelector("#search-button");
const musicContainer = document.querySelector(".lyrics-container");

//  musicSearchEl.onclick = function (){
//     getArtistApi();
//     let songTitle = document.getElementById("song").value;
//     console.log(songTitle);
//     console.log("this");
// };

document.body.addEventListener('trackChange', (event) => {
    if (Object.keys(event.detail).includes('error')) {
      console.log(`No current song: "${event.detail.error}"`);
    } else {
        getArtistApi(event);
      }
    });  

function getArtistApi(event) {
    let artistsAsString = '';
          for (let i = 0; i < event.detail.artists.length; i++) {
            if (i < event.detail.artists.length - 1) artistsAsString += `${event.detail.artists[i]}, `;
            else artistsAsString += event.detail.artists[i];}
    //let api = apiAddress + apiKey
    event.preventDefault();
    //let songTitle = document.getElementById("song").value;
    fetch("https://canarado-lyrics.p.rapidapi.com/lyrics/" + artistsAsString + "" + event.detail.track, {
        "method": "GET",
        "headers": {
            "x-rapidapi-host": "canarado-lyrics.p.rapidapi.com",
            "x-rapidapi-key": "240cf3a120msh185fd7891df65d4p1381afjsn127ca8039ec2"}})
    .then(function(response) {
        if (response.ok) {
            response.json().then(function (data) {
                console.log(data);
                displayLyrics(data);
            

            })
        }
    })
}

function displayLyrics(data) {
    let lyrics = data.content[0].lyrics;

    let lyricsEl = document.createElement("p");
    lyricsEl.textContent = lyrics;
    musicContainer.appendChild(lyricsEl);

}
    

