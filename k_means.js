let fileContents;

function getFileoutput(){
    let outputfield = document.getElementById("fileoutput");
    let fileInput = document.getElementById("clusterfile");
    let file = fileInput.files[0];
    if(file){
        const reader = new FileReader();

        reader.onload = function(event){
            fileContents = event.target.result;
            const points = split_file_in_coordinates(fileContents);

            let centroids, cluster, centroid_evolution, cluster_evolution, dist;
            [centroids, cluster, centroid_evolution, cluster_evolution, dist] = kmeans(points);
            console.log(centroid_evolution);
            visualiseKMeans(centroids, cluster, points, centroid_evolution, cluster_evolution);
            outputfield.innerHTML += dist;
            outputfield.innerHTML += "<br/>";
        };

        reader.readAsText(file);
    }else{
        outputfield.innerHTML = "file couldn't be read";
    }
}

function visualiseKMeans(centroids, clusters, points, centroid_evolution, cluster_evolution){
    const amount_clusters = document.getElementById("clusters").value;

    // Generate a color scale
    var color = d3.scaleSequential(d3.interpolateSinebow).domain([0, amount_clusters]);

    // Prepare the datasets
    var data = [];
    for (var i = 0; i < amount_clusters; i++) {
        var clusterPoints = points.filter((_, index) => clusters[index] === i);
        data.push({
            x: clusterPoints.map(point => point[0]),
            y: clusterPoints.map(point => point[1]),
            mode: 'markers',
            marker: {
            color: color(i),
            size: 8
            },
            name: 'Cluster ' + i,
            // Hier uitleg waarom de punten in de cluster zitten --> misschien ook een berekening doen?
            text: clusterPoints.map(() => 'This point is assigned to cluster <b>' + i + '</b> because it is closest to the centroid of this cluster.'),
            hoverinfo: 'text'
        });
    }

    // Add the centroids to the datasets
    for (var i = 0; i < centroids.length; i++) {
        data.push({
            x: [centroids[i][0]],
            y: [centroids[i][1]],
            mode: 'markers',
            marker: {
            color: color(i),
            size: 12,
            line: {
                color: 'black',
                width: 2
            }
            },
            name: 'Centroid ' + i,
            hoverinfo: 'name'
        });
    }

    // Add the centroid evolution to the datasets
    for (var i = 0; i < amount_clusters; i++) { 
        data.push({
            x: centroid_evolution.map(iteration => iteration[i][0]),
            y: centroid_evolution.map(iteration => iteration[i][1]),
            mode: 'lines+markers',
            marker: {
                color: color(i),
                size: 4,
                line: {
                    color: 'rgba(0, 0, 0, 0.75)',
                    width: 1
                }
            },
            line: {
                color: 'rgba(0, 0, 0, 0.60)',
                width: 2
            },
            name: 'Centroid evolution ' + i,
            hoverinfo: 'name'
        })
    }

    var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

    // Create the plot
    Plotly.newPlot('chartKmeans', data, {
        title: 'K-means clustering',
        xaxis: {
            showticklabels: false,
            showgrid: false,
            zeroline: false
        },
        yaxis: {
            showticklabels: false,
            showgrid: false,
            zeroline: false
        },
        autosize: false,
        width: width/1.1,
        height: width/2
    });

    // On click (misschien makkelijker dan de on hover)
    document.getElementById('chartKmeans').on('plotly_click', function(data){
        console.log(data);
    });
}

function split_file_in_coordinates(fileContent){
    let points = fileContent.split('\n');
    let coordinates = [];
    for(let i = 0; i < points.length; i++){
        if(points[i].length > 0){
            let point = points[i].split(',');
            coordinates.push([]);
            for(let j = 0; j < point.length; j++){
                coordinates[i].push(parseFloat(point[j]))
            }
        }
    }
    return coordinates;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function get_dist_between_points(point1, point2){
    let total_squared_dist = 0.0;
    for(let i = 0; i < point1.length; i++){
        total_squared_dist += Math.pow(point1[i]-point2[i], 2);
    }
    return Math.pow(total_squared_dist, 1/2);
}

function assign_point_to_cluster(points, centroids){
    let outputfield = document.getElementById("fileoutput");
    let cluster_distribution = [];
    let total_dist = 0;
    for(let i = 0; i < points.length; i++){
        let best_centroid = -1;
        let best_dist = 1000000000.0;
        for(let j = 0; j < centroids.length; j++){
            let dist = get_dist_between_points(points[i], centroids[j]);
            if(dist < best_dist){
                best_centroid = j;
                best_dist = dist;
            }
        }
        cluster_distribution.push(best_centroid)
        total_dist+=best_dist;
    }
    return [cluster_distribution, total_dist]
}

function calc_cluster_centroid(points, cluster_distribution, amount_clusters){
    let new_centroids = [];
    for(let i = 0; i < amount_clusters; i++){//calc centroid for every cluster
        let total_point = [];
        for(let j = 0; j < points[0].length; j++){//initialize total_point
            total_point.push(0.0);
        }
        //console.log(points);
        let amount_points = 0;
        for(let j = 0; j < points.length; j++){// search through point, which belong to current cluster
            if(cluster_distribution[j] == i){
                amount_points += 1;
                for(let k = 0; k < points[j].length; k++){
                    total_point[k] += points[j][k];
                }
            }
        }
        let average_centroid = [];
        for(let j = 0; j < total_point.length; j++){//calculate average cluster
            
            average_centroid.push(total_point[j]/amount_points);
        }
        new_centroids.push(average_centroid);
    }
    return new_centroids;
}


//returns centroids, clusters (which points belong to which cluster),centroid evolution, cluster evolution
//if you put the right variables in an array, you can get the 4 returnvalues above out of this function at once
// [centroids, cluster, centroid_evolution, cluster_evolution] = kmeans()
function kmeans(points){
    //first put all the data in an array (of arrays)
    
    const amount_clusters = document.getElementById("clusters").value;
    let cluster_of_point_evolution = [];
    let centroid_evolution = []; 

    //here we're going to assign the centroids
    let centroids = [];
    for(let i = 0; i < amount_clusters; i++){
        centroids.push(points[getRandomInt(0, points.length)]);
    }
    centroid_evolution.push(centroids);
    let square_dist = Number.MAX_SAFE_INTEGER;
    let [cluster_distribution, curr_dist] = assign_point_to_cluster(points, centroids);
    cluster_of_point_evolution.push(cluster_distribution);
    centroids = calc_cluster_centroid(points, cluster_distribution, amount_clusters);

    while(curr_dist != square_dist){
        square_dist = curr_dist;
        centroid_evolution.push(centroids);
        [cluster_distribution, curr_dist] = assign_point_to_cluster(points, centroids);
        cluster_of_point_evolution.push(cluster_distribution);
        centroids = calc_cluster_centroid(points, cluster_distribution, amount_clusters);
    }
    return [centroids, cluster_distribution, centroid_evolution, cluster_of_point_evolution, square_dist];
}