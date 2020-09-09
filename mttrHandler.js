'use strict'

exports.handler = function (event, context, callback) {

    var issues = [];
    var repairs = [];
    var failures = [];

    function sumArray(array) {
      return array.reduce((a, b) => a + b, 0)
    }

    function processIssues(issue) {
     
         issues.push (
            { "resolutionDate":   issue.fields.resolutiondate, 
              "releaseDate":      issue.fields.fixVersions[0].releaseDate,
              "fixVersion":       issue.fields.fixVersions[0].name
            });
      
        const releaseDate = new Date(issue.fields.fixVersions[0].releaseDate);
        // Unresolved (null) resolution dates use today, otherwise we use the actual resolution date
        const fixDate     = issue.fields.resolutiondate != null ? new Date(issue.fields.resolutiondate) : new Date();
        const diffTime    = Math.abs(fixDate - releaseDate);
        // Add the number of days to repair to the repairs array
        repairs.push(diffTime / (1000 * 60 * 60 * 24));
 
        //// Construct the Failures array
        // If the version has at least two dots push the fail fixVersion name onto the array
        // By definition, any release fixVersion for P1/P2 issues that has two dots in it indicates a change failure
        // TODO: Shouldn't there just be one returned value for the API call below? The if logic seems redundant if 
        // the API returns exactly what we need. 
        if (issue.fields.fixVersions[0].name.split(".").length > 2 ) {
            failures.push(issue.fields.fixVersions[0].name);
        }

    }

    context.endpoint.get(`/search?project%3D${context.project}+AND+issuetype%3D+Bug+AND+status+%3DDone+AND+priority+in+(Highest%2CHigh)+AND+fixVersion+in+releasedVersions()&fields=id,resolutiondate,fixVersions`)
        .then(function (response) {
            response.data.issues.forEach(issue => processIssues(issue));

            // MTTR calculated as average rounded down to tenth of a day
            var mttr = Math.floor(sumArray(repairs) / repairs.length * 10) / 10;
             
            // Change Failure Rate calculated as SemVer releases that require a P1/P2 bugfix
            var failureRate = Math.floor(failures.length / repairs.length * 1000) / 10;

            const dto = { issues: issues, 
                               repairs: repairs,
                               failures: failures,
                               mttr: mttr,
                               failureRate: failureRate
                             };
            return callback(null, dto, event);
        });

}