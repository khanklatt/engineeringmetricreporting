'use strict'

exports.handler = function (event, context, callback) {

    var releases = [];
    var earliestReleaseDate = new Date();  // Initialize the earliest date to today
    var latestReleaseDate   = new Date(0); // Initialize the latest date to the epoch date

    function filterReleaseKeys(release) {
        if (Date.parse(release.releaseDate) > Date.parse(latestReleaseDate)) {
            latestReleaseDate = release.releaseDate;   // Set to a more recent date
        }
        if (Date.parse(release.releaseDate) < Date.parse(earliestReleaseDate)) {
            earliestReleaseDate = release.releaseDate; // Set to an earlier date
        }

        releases.push( 
            {   "id": release.id, 
                "version": release.name, 
                "date": new Date(Date.parse(release.releaseDate)) 
            });
    }
    context.endpoint.get(`/project/${context.project}/versions`)
        .then(function (response) {

            response.data.forEach(release => filterReleaseKeys(release));

            const diffTime     = Math.abs(Date.parse(latestReleaseDate) - Date.parse(earliestReleaseDate));
            const elapsedDays  = Math.floor((diffTime / (1000 * 60 * 60 * 24)) * 10) / 10;
            const releaseCount = releases.length;
            var deploymentLabel = ' days per release.'; // 

            var deploymentFrequency = Math.floor((elapsedDays / releaseCount)  * 10) / 10;
            if (deploymentFrequency < 1) {   // Releasing less than once a day
                deploymentFrequency = ( Math.floor(1 / deploymentFrequency) * 10 ) / 10;
                deploymentLabel = ' releases per day!';
            }

            var dto = new Object(); 
            dto.releases =  releases;
            dto.releaseCount = releaseCount;
            dto.deploymentFrequency = deploymentFrequency;
            dto.deploymentLabel = deploymentLabel;
            return callback(null, dto, event);
        })
        .catch(function (error) {
            return callback(error, null, event);
        });

}