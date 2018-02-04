function updateHistogram(url, chart, info)
{
    chart.data.datasets = [];

    if (info.type === "bar") {
        chart.data.labels = [];
    }

    chart.update();

    $.getJSON(url, data => {
        var points = [];
        var values = data.values;

        var minScore = data.minScore;
        var interval = data.intervalSize;

        if (interval !== 1) interval *= 0.01;

        var total = 0;
        var minSkip = data.totalEntries * 0.0001;
        var maxSkip = data.totalEntries * 0.9;

        if (info.type === "scatter") {
            for (var i = 0; i < values.length; ++i) {
                var value = values[i];
                total += value;

                if (total < minSkip) continue;
                minSkip = 0;

                points.push({x: i * interval + minScore, y: value});

                if (total > maxSkip) break;
            }
        } else {
            var labels = [];

            for (var i = 0; i < values.length; ++i) {
                var value = values[i];
                total += value;

                if (value < minSkip) continue;
                minSkip = 0;

                points.push(value);
                labels.push(i.toString());

                if (total > maxSkip) break;
            }

            chart.data.labels = labels;
        }

        chart.data.datasets = [{
            label: 'Frequency',
            fill: true,
            pointRadius: 0,
            showLine: true,
            cubicInterpolationMode: 'monotone',
            backgroundColor: info.backgroundColor,
            borderColor: info.borderColor,
            borderWidth: 1,
            data: points
        }]

        chart.update();

        $(`#${info.cardId}`).collapse("show");
    });

    $(`#${info.cardId} .card .table`).hide();

    if (currentPlayer != null) {
        $.getJSON(`https://metapy.ziks.net/Leaderboard/Portal2/${info.leaderboardId}/${currentPlayer}`, function(data) {
            var table = $(`#${info.cardId} .card .table`);
            var tbody = table.find("tbody");

            tbody.empty();

            var lastScore = -1;

            for (var i = 0; i < data.entries.length; ++i) {
                var entry = data.entries[i];
                var score = info.scoreFormat == null ? entry.score.toString() : info.scoreFormat(entry.score);
                var selected = entry.profileUrl.toLowerCase().endsWith(`/${currentPlayer.toLowerCase()}`);

                tbody.append(`
                    <tr${selected ? " class=\"table-active\"" : ""}${selected ? " style=\"font-weight: bold;\"" : ""}>
                        <${entry.score === lastScore ? "td" : "th scope=\"row\""}>${entry.score === lastScore ? "=" : entry.relativeRank}</th>
                        <td><a href="${entry.profileUrl}">${entry.playerName}</a></td>
                        <td>${score}</td>
                    </tr>
                `);

                lastScore = entry.score;
            }

            table.show();
        });
    }
}

var timeChart;
var portalChart;

var currentMap;

function add(a, b) {
    return a + b;
}

function addy(a, b) {
    return a + b.y;
}

function getTooltipLabel(tooltipItems, data) {
    dataset = data.datasets[0].data;
    var addFunc = typeof dataset[0] === "number" ? add : addy;
    var totalCount = dataset.reduce(addFunc, 0);
    var superiorPlayersTotalCount = dataset.slice(0, tooltipItems.index + 1).reduce(addFunc, 0);
    var labelText = [];
    if (tooltipItems.yLabel != 1)
        labelText.push(tooltipItems.yLabel + ' Players');
    else
        labelText.push(tooltipItems.yLabel + ' Player');
    labelText.push('Top ' + Number(Math.round((superiorPlayersTotalCount * 100 / totalCount) + 'e2') + 'e-2') + '%');
    return labelText;
}

function selectLevel(map, name, timeId, portalsId) {
    if (currentMap === map) return;
    currentMap = map;

    var prefix = "https://metapyziks.github.io/portal2-histograms/data/challenge_";

    var newHash = `#${map}`;
    if (window.location.hash !== newHash) {
        window.location.hash = newHash;
    }

    $(".level-btn").removeClass("active");
    $(`#level-btn-${map}`).addClass("active");

    if (timeChart == null) {
        timeChart = new Chart(document.getElementById("chart-time").getContext('2d'), {
            type: 'scatter',
            options: {
                hover: {
                    animationDuration: 1000
                },
                legend: {
                    display: false
                },
                tooltips: {
                    callbacks: {
                        title: function (tooltipItems, data) {
                            var date = new Date(tooltipItems[0].xLabel * 1000);
                            return + date.getMinutes() + ':' + ( '0' + date.getSeconds()).slice(-2) + '.' + date.getMilliseconds().toString().substr(0, 1);
                        },
                        label: getTooltipLabel
                    },
                    custom: function (tooltip) {
                        if (!tooltip) return;
                        tooltip.displayColors = false;
                    },
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    xAxes: [{
                        type: 'linear',
                        position: 'bottom',
                        ticks: {
                            stepSize: 5,
                            callback: function(value, index, values) {
                                var mins = Math.floor(value / 60);
                                var secs = Math.floor(value - mins * 60);
                                return mins + ':' + (secs < 10 ? '0' : '') + secs;
                            }
                        }
                    }],
                    yAxes: [{
                        display: false
                    }]
                }
            }
        });
    }

    if (portalChart == null) {
        portalChart = new Chart(document.getElementById("chart-portals").getContext('2d'), {
            type: 'bar',
            options: {
                hover: {
                    animationDuration: 1000
                },
                legend: {
                    display: false
                },
                tooltips: {
                    callbacks: {
                        title: function (tooltipItems, data) {
                            if (tooltipItems[0].xLabel != 1)
                                return tooltipItems[0].xLabel + ' Portals';
                            else
                                return tooltipItems[0].xLabel + ' Portal';
                        },
                        label: getTooltipLabel
                    },
                    custom: function (tooltip) {
                        if (!tooltip) return;
                        tooltip.displayColors = false;
                    },
                    mode: 'x',
                    intersect: false
                },
                scales: {
                    xAxes: [{
                        barPercentage: 0.9,
                        categoryPercentage: 1.0
                    }],
                    yAxes: [{
                        display: false
                    }]
                }
            }
        });
    }

    $("#title-time").text(`Time Taken - ${name}`);
    $("#title-portals").text(`Portals - ${name}`);

    updateHistogram(`${prefix}besttime_${map}.json`, timeChart, {
        type: "scatter",
        backgroundColor: "rgba(255, 159, 64, 0.2)",
        borderColor: "rgba(255, 159, 64, 1)",
        cardId: "card-time",
        leaderboardId: timeId,
        scoreFormat: function(score) { 
            var secs = score / 100;
            var mins = Math.floor(secs / 60);
            secs -= mins * 60;
            return mins + ':' + (secs < 10 ? '0' : '') + secs.toFixed(2);
        }
    });
    updateHistogram(`${prefix}portals_${map}.json`, portalChart, {
        type: "bar",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderColor: "rgba(54, 162, 235, 1)",
        cardId: "card-portals",
        leaderboardId: portalsId
    });
}

$("input[type=radio][name=mode-select]").change(function() {
    showLevels(this.value);
});

var currentMode;
var currentStages;
var currentPlayer;

function showLevels(mode, callback) {
    if (currentMode === mode) {
        if (callback != null) callback(currentStages);
        return;
    }

    currentMode = mode;

    if (callback != null) {
        $(`.mode-select-${mode}`).prop("checked", "checked");
        $(`.mode-select .btn`).removeClass("active");
        $(`.mode-select-${mode}`).addClass("active");
    }

    $("#chapter-list").empty();

    $.getJSON(`https://metapyziks.github.io/portal2-histograms/data/${mode}.json`, data => {
        $("#chapter-list").empty();

        var stages = currentStages = data.stages;
        for (var i = 0; i < stages.length; ++i) {
            var stage = stages[i];

            $("#chapter-list").append(`<div class="card">
                <div class="card-header" role="tab" id="card-label-${i}" data-toggle="collapse" href="#card-collapse-${i}" role="button" aria-expanded="false" aria-controls="card-collapse-${i}">
                <h5 class="mb-0">
                    ${stage.title}
                </h5>
                </div>
                <div id="card-collapse-${i}" class="collapse" role="tabpanel" aria-labelledby="card-label-${i}" data-parent="#chapter-list">
                    <div class="card-body">
                        <div class="btn-group-vertical level-list" id="level-list-${i}"></div>
                    </div>
                </div>
            </div>`);

            for (var j = 0; j < stage.levels.length; ++j) {
                var level = stage.levels[j];
                $(`#level-list-${i}`).append(
                    `<button type="button"
                        class="btn btn-outline-secondary level-btn"
                        id="level-btn-${level.map}"
                        onclick="selectLevel('${level.map}', '${level.name}', '${level.timeId}', '${level.portalsId}'); return false;">
                        ${level.name}
                    </button>`
                );
            }
        }

        if (callback != null) {
            callback(stages);
        }
    });
}

function onHashChange() {
    var search = window.location.search;
    if (search != null && search.length > 1){
        currentPlayer = search.substr(1);
    } else {
        currentPlayer = undefined;
    }

    var hash = window.location.hash;
    if (hash == null || hash.length < 3) {
        hash = "#sp";
    }

    var mode = hash.substr(1, 2);

    if (mode !== "sp" && mode !== "mp") return false;

    showLevels(mode, function(stages) {
        if (hash.length <= 3) {
            hash = `#${stages[0].levels[0].map}`;
        }

        var map = hash.substr(1);

        for (var i = 0; i < stages.length; ++i) {
            var levels = stages[i].levels;
            var index;

            for (index = 0; index < levels.length; ++index) {
                if (levels[index].map === map) break;
            }

            if (index === levels.length) continue;

            var level = levels[index];

            $(`#card-collapse-${i}`).collapse("show");
            selectLevel(map, level.name, level.timeId, level.portalsId);

            break;
        }
    });

    return true;
}

$(window).on("hashchange", onHashChange);
$(onHashChange);
