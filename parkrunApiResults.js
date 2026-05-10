const eventsEndpoint = "https://images.parkrun.com/events.json";
const resultsEndpoint =
  "https://epmvjspmbhy2ojypx7htjbxzve0pnvbq.lambda-url.ap-southeast-2.on.aws/?parkrunnerId=";
var events = {};
var allStats = {};

init();

async function init() {
  // { method: "GET", mode: "cors" }
  // Parkrun has "Access-Control-Allow-Origin: *"
  var eventsRequest = await fetch(eventsEndpoint);
  var eventsResponse = await eventsRequest.json();

  eventsResponse.events.features.forEach((event) => {
    events[event.id] = event.properties;
    events[event.id].country =
      eventsResponse.countries[event.properties.countrycode];
  });
}

// Using 25 as max, because I don't really want more
async function getParkrunStats(startPos = 1, endPos = 25) {
  var parkrunnerId = document.getElementById("parkrunnerId").value;
  console.log(parkrunnerId);
  if (!parkrunnerId || parkrunnerId == NaN || parkrunnerId < 5) {
    console.log(`Parkrunner id is required (${parkrunnerId})`);
    return;
  }
  if (!allStats[parkrunnerId]) {
    allStats[parkrunnerId] = await getResults(parkrunnerId);
    if (!allStats[parkrunnerId]) {
      console.log(`Parkrunner id was not found (${parkrunnerId})`);
      return;
    }
    allStats[parkrunnerId].total = allStats[parkrunnerId].runs.length;
    allStats[parkrunnerId].parkrunnerId = parkrunnerId;
  }

  ageGradeLogic(allStats[parkrunnerId]);
  eventLogic(allStats[parkrunnerId]);
  positionLogic(allStats[parkrunnerId], startPos, endPos);
  timeLogic(allStats[parkrunnerId]);
  return allStats[parkrunnerId];
}

async function getResults(parkrunnerId) {
  // { method: "GET", mode: "cors" }
  // My Lambda Function has "Access-Control-Allow-Origin: https://helvetica.systems"
  // Parkrun API has nothing
  var resultsRequest = await fetch(`${resultsEndpoint}${parkrunnerId}`);
  var resultsResponse = await resultsRequest.json();

  /*
  // Seems redundant. Seeing though we can easily join the event in
  resultsResponse.data.runs.forEach((run) => {
    run.event = events[run.eventId];
  });
  */
  stats = resultsResponse.data;
  stats.runs.reverse();

  return stats;
}

function ageGradeLogic(stats) {
  var ageGrades = stats.runs
    .map((run) => run.ageGrade)
    .filter((ageGrade) => ageGrade > 0);

  if (ageGrades.length == 0) {
    stats.fastestAgeGrade = null;
    stats.slowestAgeGrade = null;
    stats.averageAgeGrade = null;
  } else {
    stats.fastestAgeGrade = Math.max(...ageGrades).toFixed(2);
    stats.slowestAgeGrade = Math.min(...ageGrades).toFixed(2);
    stats.averageAgeGrade = (
      ageGrades.reduce((partialSum, ageGrade) => partialSum + ageGrade, 0) /
      ageGrades.length
    ).toFixed(2);
  }

  stats.eventsWithoutAgeGrade = stats.total - ageGrades.length;
  stats.eventsWithAgeGrade = ageGrades.length;
}

/*
  Gets the 1st event the parkrunner has participated in for each letter in the English Alphabet.
*/
function eventLogic(stats) {
  stats.eventFrequency = {};

  stats.runs.forEach((run) => {
    stats.eventFrequency[events[run.eventId]?.EventShortName ?? run.eventId] =
      (stats.eventFrequency[
        events[run.eventId]?.EventShortName ?? run.eventId
      ] ?? 0) + 1;
  });

  stats.alphabet = {};
  // ASCII value for 'A' is 65, and 'Z' is 90
  for (let i = 65; i <= 90; i++) {
    var letter = String.fromCharCode(i);
    var run = stats.runs
      // We don't need to subsitute a value for parkrun alphabet
      .find((run) => events[run.eventId]?.EventShortName[0] == letter);

    if (run != null) {
      // We don't need to subsitute a value for parkrun alphabet
      stats.alphabet[letter] =
        `${events[run.eventId].EventShortName} (${formatDate(run.date)} #${run.runNumber})`;
    } else {
      stats.alphabet[letter] = null;
    }
  }
}

/*
  Gets the Min, Max and Average Parkrun Position
  Gets the 1st occurance of a position Positions in a list
*/
function positionLogic(stats, minStartPos = 1, minEndPos = 25) {
  var positions = stats.runs.map((run) => run.position);

  if (positions.length == 0) {
    stats.fastestPosition = null;
    stats.slowestPosition = null;
    stats.averagePosition = null;
  } else {
    stats.fastestPosition = Math.min(...positions);
    stats.slowestPosition = Math.max(...positions);

    stats.averagePosition = (
      positions.reduce((partialSum, position) => partialSum + position, 0) /
      stats.total
    ).toFixed(2);
  }

  stats.positionsBetween = {};

  // Getting the position
  stats.positionsBetweenMin = minStartPos;
  stats.positionsBetweenMax = minEndPos;

  for (var pos = minStartPos; pos <= minEndPos; pos++) {
    var run = stats.runs.find((run) => run.position == pos);
    if (run != null) {
      stats.positionsBetween[pos] =
        `${events[run.eventId]?.EventShortName ?? run.eventId} (${formatDate(run.date)} #${run.runNumber})`;
    } else {
      stats.positionsBetween[pos] = null;
    }
  }
}

function timeLogic(stats) {
  // Gets all the participants Parkrun Times
  var times = stats.runs.map((run) => {
    return new Date(`1970-01-01T${run.time}`).getTime();
  });

  if (times.length == 0) {
    stats.fastestTime = null;
    stats.slowestTime = null;
    stats.averageTime = null;
  } else {
    stats.fastestTime = formatTime(Math.min(...times));
    stats.slowestTime = formatTime(Math.max(...times));

    // Getting The participants Average Parkrun Time.
    // Rounding it to the nearest second, by
    //  - dividing it by 1000 (to remove the milisecond component),
    //  - Rounding to the nearest whole number
    //  - multiplying it by 1000 (to add back the milisecond component)
    var averageTime =
      Math.round(
        times.reduce((partialSum, time) => partialSum + time, 0) /
          stats.total /
          1000,
      ) * 1000;
    stats.averageTime = formatTime(averageTime);
  }
}

function formatTime(time) {
  // nl-NL Locale is important, because we want 24 Hour Time (eg. "00:22:20")
  // If we were to use en-AU Locale, we will get 12 hour Time (eg. "12:22:20 am")
  return new Date(time).toLocaleString("nl-NL", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
}

function formatDate(date) {
  return new Date(date).toLocaleString("en-AU", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}
