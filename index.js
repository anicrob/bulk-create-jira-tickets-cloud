const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config();
var fs = require("fs");
var util = require("util");
var log_file = fs.createWriteStream(__dirname + "/debug.log", { flags: "w" });
var log_stdout = process.stdout;
console.log = function (d) {
  log_file.write(util.format(d) + "\n");
  log_stdout.write(util.format(d) + "\n");
};
const getProjectIds = async () => {
  const index = [0, 100, 200, 300, 400];
  const projectIds = [];
  await Promise.all(
    index.map(async (i) => {
      try {
        const response = await fetch(
          `${process.env.URL}/rest/api/3/project/search?maxResults=100&startAt=${i}`,
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${process.env.API_KEY}`,
              Accept: "application/json",
            },
          }
        );
        let { values } = await response.json();
        if (values.length > 0) {
          const ids = values.map((project) => project.id);
          projectIds.push(...ids);
        }
      } catch (err) {
        console.log(err);
      }
    })
  );
  return projectIds;
};

const bulkCreateIssues = async () => {
  var i = 0;
  var count = 0;
  const projectIds = await getProjectIds();
  const createTicket = async () => {
    var randomSummary = Math.random().toString(36).substring(2, 7);
    let issueBody = {
      fields: {
        project: {
          id: parseInt(projectIds[i]),
        },
        issuetype: {
          id: 10001,
        },
        summary: randomSummary,
      },
    };
    if (
      count ===
      parseInt(`${process.env.NUMBER_OF_TICKETS_TO_CREATE_PER_PROJECT}`)
    ) {
      count = 0;
      i += 1;
      if (projectIds[i] === projectIds[projectIds.length - 1]) {
        console.log(`\n${new Date().toGMTString()} - ✅ All done!`);
        return;
      }
      console.log(
        `\n${new Date().toGMTString()} - Project with id ${
          projectIds[i - 1]
        } is complete. Onto the next project! 🎉\n`
      );
      randomSummary = Math.random().toString(36).substring(2, 7);
      createTicket();
      return;
    }
    try {
      const response = await fetch(`${process.env.URL}/rest/api/3/issue`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${process.env.API_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(issueBody),
      });
      if (response.status === 201) {
        count += 1;
        console.log(
          `${new Date().toGMTString()} - ${count} issues have been created in the project with id ${
            projectIds[i]
          }.`
        );
        randomSummary = Math.random().toString(36).substring(2, 7);
        createTicket();
      } else {
        console.log(
          `${new Date().toGMTString()} - ${response.status}: ${
            response.statusText
          }`
        );
      }
    } catch (err) {
      console.log(err);
    }
  };
  createTicket();
};

bulkCreateIssues();
