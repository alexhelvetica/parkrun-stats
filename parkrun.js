var urls = {
  accountSearch = "https://api.parkrunapp.com/api/users/search/{searchterm}", // https://api.parkrunapp.com/api/users/search/michaela+wheeler
  event = "https://api.parkrunapp.com/api/events/{eventId}", // https://api.parkrunapp.com/api/events/3838
  eventResults = "https://api.parkrunapp.com/api/events/{eventId}/history/all", // https://api.parkrunapp.com/api/events/3838/history/all
  eventResult = "https://api.parkrunapp.com/api/events/{eventId}/results/instances/{date}", // https://api.parkrunapp.com/api/events/3838/results/instances/20260418
  parkrunnerStats = "https://api.parkrunapp.com/api/activities/{parkrunnerId}", // https://api.parkrunapp.com/api/activities/7472767
};

var parkrunnerIds = {
  alex = 5687217,
}

// getParkrunStats(parkrunnerIds.alex, 1, 25);

async function fetchWebPageAsync(url) {
  let response = await fetch(url, {
    method: "GET",
    headers: {
    },
  });

  return await response
    .text()
    .then((html) => {
      // Initialize the DOM parser
      const parser = new DOMParser();

      // Parse the text
      const doc = parser.parseFromString(html, "text/html");
      return doc;
    })
    .catch((error) => {
      console.error("Failed to fetch page: ", error);
    });
}

// https://gist.github.com/mattheo-gist/4151867
function htmlTableToObject(table) {
  var rows = table.rows;
  var propCells = rows[0].cells;
  var propNames = [];
  var results = [];

  // first row for the property names
  for (var i = 0, iLen = propCells.length; i < iLen; i++) {
    propNames.push(propCells[i].textContent.replace(/\W/g, ""));
  }

  // tbody
  for (var j = 1, jLen = rows.length; j < jLen; j++) {
    var obj = {};

    for (var k = 0; k < iLen; k++) {
      obj[propNames[k]] = rows[j].cells[k].textContent.trim();
    }
    results.push(obj);
  }
  return results;
}

// main(7472767, 1, 25)
// getParkrunStats(5687217, 1, 25);

// Using 25 as max, because I don't really want more
async function getParkrunStats(parkrunnerId, startPos = 1, endPos = 25) {
  var stats = {};
  var results = await getResults(parkrunnerId, stats);
  stats.total = results.length;

  ageGradeLogic(results, stats);
  eventLogic(results, stats);
  positionLogic(results, stats, startPos, endPos);
  timeLogic(results, stats);

  return stats;
}

async function getResults(parkrunnerId, stats) {
  // Domain doesn't matter. All Parkrun domains allow us to retrieve data for all parkrun users.
  var html = await fetchWebPageAsync(
    `https://www.parkrun.com.au/parkrunner/${parkrunnerId}/all/`,
  );
  var displayName = html.querySelector("h2").innerText;
  stats.displayName = displayName;
  stats.name = displayName.substring(0, displayName.indexOf("(") - 1);
  stats.parkrunnerId = displayName.substring(
    displayName.indexOf("(") + 2,
    displayName.indexOf(")"),
  );

  // Parkrun does HTML crimes. The "Results" Id is used multiple times.
  // So we need to find the correct Results Id.
  var resultsHtml = [...html.querySelectorAll("#results")].find(
    (r) =>
      r.querySelector("caption").textContent.replace(/\W/g, "") == "AllResults",
  );
  return (
    htmlTableToObject(resultsHtml)
      // Reverses the list, because we want the 1st occurance for each criteria
      .reverse()
  );
}

function ageGradeLogic(results, stats = {}) {
  var ageGrades = results
    .map(function (event) {
      return parseFloat(event.AgeGrade); // Number(event.AgeGrade.replace(/[^\d.]/g,''));
    })
    .filter((pos) => !Number.isNaN(pos));

  stats.fastestAgeGrade = `${Math.max(...ageGrades)}%`;
  stats.slowestAgeGrade = `${Math.min(...ageGrades)}%`;
  stats.eventsWithoutAgeGrade = results.length - ageGrades.length;
  stats.eventsWithAgeGrade = ageGrades.length;

  stats.averageAgeGrade = `${(
    ageGrades.reduce((partialSum, a) => partialSum + a, 0) / ageGrades.length
  ).toFixed(2)}%`;
}

/*
  Gets the 1st event the parkrunner has participated in for each letter in the English Alphabet.
*/
function eventLogic(results, stats = {}) {
  stats.eventFrequency = {};

  results.forEach((event) => {
    stats.eventFrequency[event.Event] =
      (stats.eventFrequency[event.Event] ?? 0) + 1;
  });

  stats.alphabet = {};
  // ASCII value for 'A' is 65, and 'Z' is 90
  for (let i = 65; i <= 90; i++) {
    var letter = String.fromCharCode(i);
    var event = results.find((ob) => ob.Event[0] == letter);

    if (event != null) {
      stats.alphabet[letter] =
        `${event.Event} (${event.RunDate} #${event.RunNumber})`;
    } else {
      stats.alphabet[letter] = null;
    }
  }
  return stats;
}

/*
  Gets the Min, Max and Average Parkrun Position
  Gets the 1st occurance of a position Positions in a list
*/
function positionLogic(results, stats = {}, minStartPos = 1, minEndPos = 25) {
  var positions = results.map(function (event) {
    return Number(event.Pos);
  });

  stats.fastestPosition = Math.min(...positions);
  stats.slowestPosition = Math.max(...positions);

  stats.averagePosition = (
    positions.reduce((partialSum, a) => partialSum + a, 0) / results.length
  ).toFixed(2);

  stats.positionsBetween = {};

  // Getting the position
  stats.positionsBetweenMin = minStartPos;
  stats.positionsBetweenMax = minEndPos;

  for (var pos = minStartPos; pos <= minEndPos; pos++) {
    var event = results.find((ob) => ob.Pos == pos);
    if (event != null) {
      stats.positionsBetween[pos] =
        `${event.Event} (${event.RunDate} #${event.RunNumber})`;
    } else {
      stats.positionsBetween[pos] = null;
    }
  }
  return stats;
}

function timeLogic(results, stats = {}) {
  // Gets all the participants Parkrun Times
  var times = results.map((r) => {
    var time = (r.Time.length == 5 ? "00:" : "0") + r.Time;
    return new Date(`1970-01-01T${time}`).getTime();
  });

  stats.fastestTime = formatTime(Math.min(...times));
  stats.slowestTime = formatTime(Math.max(...times));

  // Getting The participants Average Parkrun Time.
  // Rounding it to the nearest second, by
  //  - dividing it by 1000 (to remove the milisecond component),
  //  - Rounding to the nearest whole number
  //  - multiplying it by 1000 (to add back the milisecond component)
  var averageTime =
    Math.round(
      times.reduce((partialSum, a) => partialSum + a, 0) /
        results.length /
        1000,
    ) * 1000;
  stats.averageTime = formatTime(averageTime);

  return stats;
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
