const eventsEndpoint = "https://images.parkrun.com/events.json";
const resultsEndpoint =
  "https://epmvjspmbhy2ojypx7htjbxzve0pnvbq.lambda-url.ap-southeast-2.on.aws/?parkrunnerId=";
var parkrunnerId = 5687217;

// { method: "GET", mode: "cors" }
// Parkrun has "Access-Control-Allow-Origin: *"
var eventsRequest = await fetch(eventsEndpoint);
var eventsResponse = await eventsRequest.json();

var events = {};
eventsResponse.events.features.forEach((event) => {
  events[event.id] = event.properties;
  events[event.id].country =
    eventsResponse.countries[event.properties.countrycode];
});

// { method: "GET", mode: "cors" }
// My Lambda Function has "Access-Control-Allow-Origin: https://helvetica.systems"
// Parkrun API has nothing
var resultsRequest = await fetch(`${resultsEndpoint}${parkrunnerId}`);
var resultsResponse = await resultsRequest.json();

resultsResponse.data.runs.forEach((run) => {
  run.event = events[run.eventId];
});