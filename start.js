// API Utility Function
const axios = require('axios').default;

// Configure Jira Constants
const project = 'YOUR-JIRA-PROJECT-PREFIX';
const jiraAuth = 'Basic ***base64 encoded username:password from Jira***';

const jiraInstance = axios.create({
  baseURL: 'https://***your-org-name***.atlassian.net/rest/api/3',
  timeout: 1000
});

jiraInstance.defaults.headers.common['Authorization'] = jiraAuth;
jiraInstance.defaults.headers.common['Content-Type'] = 'application/json';

// Report Handlers
//    Deployment Frequency
const deploymentFrequency = require('./deploymentFrequencyHandler.js');
//    Repairs - MMTR and Change Failure Rate
const mttRepair           = require('./mttrHandler.js');

// Define the global data/return DTO for the API response
var data = {};

// Lambda convention is to define an event, context, and callback function
const event = {}; // default; intended to be overridden in lambda call

const context = { endpoint: jiraInstance, project: `${project}`};

const callback = (error, response, event) => {
  if (error != null) {
    console.log(JSON.stringify(error));
    return false;
  }

  if        (event.type == 'deployments')  {
    data.deployments = response.releases.length;
    data.deploymentFrequency = response.deploymentFrequency;
    data.deploymentFrequencyLabel = response.deploymentLabel;
  } else if (event.type == 'repairs') {
    data.mttr = response.mttr;
    data.changeFailureRate = response.failureRate;
  }

  // TODO: Hack until I figure out how promise/await works.
  // Check both handlers keys, and send response only during second invocation of callback.
  if (data.mttr > 0 && data.deployments > 0) {
    try {
      // Uncomment for quick and dirty console logging of the data object
      // console.log(JSON.stringify(data));
      return formatResponse(serialize(data));
    } catch(error) {
      return formatError(error)
    }
  }
}

const formatResponse = function(body) {
  const response = {
    "statusCode": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": body
  };
  return response;
}

const formatError = function(error) {
  const response = {
      "statusCode": error.statusCode,
      "headers": {
        "Content-Type": "text/plain"
      },
      "body": error.code + ": " + error.message
    };
    return response;
}

async function getData() {
    const deployments = await deploymentFrequency.handler(
        { type: 'deployments'}, // Event object
        context,                // Context
        callback                // Callback
    );
    const repairs = await mttRepair.handler(
        { type: 'repairs'},     // Event object
        context,                // Context 
        callback                // Callback
    );
  }

getData();