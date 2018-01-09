function updateHistogram(url, chart, type)
{
    $.getJSON(url, data => {
        var points = [];
        var values = data.values;

        var minScore = data.minScore;
        var interval = data.intervalSize;

        if (interval !== 1) interval *= 0.01;

        var total = 0;
        var minSkip = data.totalEntries * 0.0001;
        var maxSkip = data.totalEntries * 0.9;

        if (type === "scatter") {
            for (var i = 0; i < values.length; ++i) {
                var value = values[i];
                total += value;

                if (value < minSkip) continue;
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
            data: points
        }]

        chart.update();
    });
}

var timeChart;
var portalChart;

var currentLevelId;

function selectLevel(id, name) {
    if (currentLevelId === id) return;
    currentLevelId = id;

    var prefix = "https://metapyziks.github.io/portal2-histograms/data/challenge_";

    var newHash = `#${id}`;
    if (window.location.hash !== newHash) {
        window.location.hash = newHash;
    }

    $(".level-btn").removeClass("active");
    $(`#level-btn-${id}`).addClass("active");

    if (timeChart == null) {
        timeChart = new Chart(document.getElementById("chart-time").getContext('2d'), {
            type: 'scatter',
            options: {
                legend: {
                    display: false
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
                                return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
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
                legend: {
                    display: false
                },
                scales: {
                    yAxes: [{
                        display: false
                    }]
                }
            }
        });
    }

    $("#title-time").text(`Time Taken - ${name}`);
    $("#title-portals").text(`Portals - ${name}`);

    updateHistogram(`${prefix}besttime_${id}.json`, timeChart, "scatter");
    updateHistogram(`${prefix}portals_${id}.json`, portalChart, "bar");
}

$("input[type=radio][name=mode-select]").change(function() {
    showLevels(this.value);
});

var currentMode;
var currentStages;

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
                        id="level-btn-${level.id}"
                        onclick="selectLevel('${level.id}', '${level.name}'); return false;">
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
    var hash = window.location.hash;
    if (hash == null || hash.length < 3) return false;

    var mode = hash.substr(1, 2);

    if (mode !== "sp" && mode !== "mp") return false;

    showLevels(mode, function(stages) {
        if (hash.length <= 3) return;
        var mapId = hash.substr(1);

        for (var i = 0; i < stages.length; ++i) {
            var levels = stages[i].levels;
            var index;

            for (index = 0; index < levels.length; ++index) {
                if (levels[index].id === mapId) break;
            }

            if (index === levels.length) continue;

            $(`#card-collapse-${i}`).collapse("show");
            selectLevel(mapId, levels[index].name);

            break;
        }
    });

    return true;
}

$(window).on("hashchange", onHashChange);

$(function() {
    if (!onHashChange()) {
        showLevels("sp");
    }
});