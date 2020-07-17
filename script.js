const apiAddress = "";
const apiKey = "";
const apiArtist = "";
let resturantSearchEl = document.querySelector("search-button");

$(".search-button").on("click", function (){
    getArtistApi();
});

function getArtistApi() {
    let api = apiAddress + apiKey
    event.preventDefault();
    fetch("https://canarado-lyrics.p.rapidapi.com/lyrics/zenith%2520denzel%2520curry", {
        "method": "GET",
        "headers": {
            "x-rapidapi-host": "canarado-lyrics.p.rapidapi.com",
            "x-rapidapi-key": "240cf3a120msh185fd7891df65d4p1381afjsn127ca8039ec2"}})
    .then(function(response) {
        if (response.ok) {
            response.json().then(function (data) {
                console.log(data);
            

            })
        }
    }
    

    )}
// clicked feature to search
// call api from Genius 
// parse info
// display data to the site


