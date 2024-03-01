//三種主要選擇類別 全國資料/中央於全國/各縣市

function selectfetch(data, selectCity) {
  let filteredData = [];
  isCenter = false;
  if (selectCity === "全國") {
    let allProjects = [];
    data.map((city) => {
      let cityProjects = city.projects;
      let result = allProjects.concat(cityProjects);
      allProjects = result;
    });
    filteredData = allProjects;
  } else if (selectCity === "中央於全國") {
    let centerProjects = [];
    isCenter = true;
    data.map((city) => {
      let cityProjects = city.projects;
      let centerCases = cityProjects.filter(
        (cityCase) => cityCase.mayor === "中央(住都中心)"
      );
      let result = centerProjects.concat(centerCases);

      centerProjects = result;
    });
    filteredData = centerProjects;
  } else {
    filteredData = data.filter((city) => city.city_name === selectCity)[0]
      .projects;
  }

  //民國轉西元年
  function yearFormate(newDate) {
    if (newDate == "-") {
      return "none";
    }
    newDate = newDate.replace("(預定)", "");
    let oldYear = newDate.split("/");
    let yearNumber = parseInt(oldYear[0]) + 1911;
    let month = parseInt(oldYear[1]) - 1;
    let day = parseInt(oldYear[2]);
    let date = new Date(yearNumber, month, day);
    return date;
  }
  filteredData.map((d) => {
    d.start = yearFormate(d.start);
    d.decide = yearFormate(d.decide);
    d.end = yearFormate(d.end);
  });

  let formateData = generateDataObject(filteredData, isCenter);
  generateChart(formateData);
  projectList.innerHTML = `
  <div class="flexbox list-title">
  <h4 class="list-date">所在地</h4>
  <h4 class="case-title">案名</h4>
  <h4 class="mayor">興辦</h4>
  <h4 class="households">戶數</h4>
  <h4 class="list-date">決標日</h4>
  <h4 class="list-date">開工日</h4>
  <h4 class="list-date">完工日</h4>
  <h4 class="list-date">地址</h4>
  </div>
  `;
  projectList.appendChild(list(filteredData));
}

//格式化資料
function generateDataObject(filteredData, isCenter) {
  let uniqueLabels = new Set(
    filteredData.map((d) => (isCenter ? d.location : d.mayor))
  );
  let labelArr = [...uniqueLabels]; //把set轉為array

  let chartData = [];

  labelArr.forEach((label) => {
    let data = filteredData
      .filter((d) => (isCenter ? d.location : d.mayor) === label)
      .map((d) => ({
        location: d.location,
        mayor: d.mayor,
        decide: d.decide,
        start: d.start,
        finish: d.end,
        title: d.title,
        status: d.status,
        households: d.households,
        x: new Date(d.end),
        y: parseFloat(d.households),
      }))
      .sort((a, b) => a.x - b.x);

    //累進制數據
    let totalHolds = 0;
    let accumData = [];
    for (let d of data) {
      totalHolds += parseFloat(d.households);
      accumData.push({
        location: d.location,
        mayor: d.mayor,
        decide: d.decide,
        start: d.start,
        finish: d.end,
        title: d.title,
        status: d.status,
        households: d.households,
        x: d.x,
        y: totalHolds,
      });
    }
    chartData.push({
      label: label,
      data: isAccumulateChecked ? accumData : data,
      borderWidth: 1,
    });
  });
  let formateData = {
    labels: labelArr,
    datasets: chartData,
  };
  return formateData;
}

function list(filteredData) {
  let box = document.createElement("div");
  box.classList.add("list-body");
  filteredData.map((d) => {
    let htmlObj = `<div class="flexbox list-align">
    <div class="list-date">${d.location}</div>
    <h4 class="case-title">${d.title}</h4>
    <div class="mayor">${d.mayor}</div>
    <div class="households">${d.households}</div>
    <div class="list-date">${
      d.decide === "none" ? "缺" : d.decide.toLocaleDateString()
    }</div>
    <div class="list-date">${
      d.start === "none" ? "缺" : d.start.toLocaleDateString()
    }</div>
    <div class="list-date">${d.end.toLocaleDateString()}</div>    
    <div class="list-date">待補</div>
    </div>`;
    box.innerHTML += htmlObj;
  });
  return box;
}

//所有縣市列表
function allCityName(data) {
  let result = data.map((city) => city.city_name);
  return result;
}

let myChart;
function tooltipCallbacks(formateData) {
  return {
    beforeTitle: function (context) {
      const datasetIndex = context[0].datasetIndex;
      const dataIndex = context[0].dataIndex;
      const caseName = formateData.datasets[datasetIndex].data[dataIndex].title;
      const caseHolds =
        formateData.datasets[datasetIndex].data[dataIndex].households;
      return `${caseName} + ${caseHolds}戶`;
    },
    title: function (context) {
      const datasetIndex = context[0].datasetIndex;
      const dataIndex = context[0].dataIndex;
      const finish = formateData.datasets[datasetIndex].data[dataIndex].x;
      const start = formateData.datasets[datasetIndex].data[dataIndex].start;
      const decide = formateData.datasets[datasetIndex].data[dataIndex].start;

      let decideDate =
        decide === "none" ? "無決標日" : decide.toLocaleDateString() + " 決標";
      let startDate =
        start === "none" ? "無開工日" : start.toLocaleDateString() + " 開工";
      let finishDate = finish.toLocaleDateString() + " 完工";
      let dateArr = [decideDate, startDate, finishDate];
      return dateArr;
    },
    afterTitle: function (context) {
      return "======================";
    },
    label: function (context) {
      const label = context.dataset.label || "";
      const value = context.parsed.y;
      return `${label} 共 ${value}戶`;
    },
  };
}

//建立圖表
function generateChart(formateData) {
  if (!myChart) {
    const config = {
      type: "line",
      data: formateData,
      options: {
        plugins: {
          tooltip: {
            callbacks: tooltipCallbacks(formateData),
          },
          annotation: {
            annotations: {
              todayLine: {
                type: "line",
                scaleID: "x",
                mode: "vertical",
                value: new Date(),
                borderWidth: 1,
                borderColor: "gray",
                label: {
                  backgroundColor: "gray",
                  content: "今天",
                  enabled: true,
                  position: "top",
                },
              },
            },
          },
        },
        scales: {
          x: {
            type: "time",
            time: {
              unit: "year",
            },
            min: new Date().setFullYear(2014),
            max: new Date(),
            title: {
              display: true,
              text: "完工日期",
            },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "戶數",
            },
          },
        },
      },
    };
    const ctx = document.getElementById("myChart");
    myChart = new Chart(ctx, config);
  } else {
    myChart.data = formateData;
    myChart.options.plugins.tooltip.callbacks = tooltipCallbacks(formateData); //tooltip需要在更新資料時重新載入    
    myChart.options.scales.x.min = startDate.value;
    myChart.options.scales.x.max = endingDate.value;
    myChart.update(); //如果已經有圖表則更新圖表
  }
}

function filterByDate() {
  myChart.options.scales.x.min = startDate.value;
  myChart.options.scales.x.max = endingDate.value;
  myChart.update(); //如果已經有圖表則更新圖表
}
