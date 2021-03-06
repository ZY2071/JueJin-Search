const axios = require("axios");
const express = require("express");
var cors = require("cors");
const app = express();

app.use(cors());

// 判断属性是否大于预定值
function numFilter(item, property, num) {
    return item[property] >= num;
}

// 判断时间是否在范围内
function timeFilter(item, property) {
    let time = new Date(new Date().getTime() - 12 * 30 * 24 * 60 * 60 * 1000).toISOString(); // 当前时间倒推一年的时间戳
    return item[property] > time;
}

// 根据创建时间的排序
function sortList(a, b) {
    return b.node.entity.createdAt > a.node.entity.createdAt ? 1 : -1;
}

// 数据获取的函数
function getDatas({ queryKey, numAfter }) {
    let url = "https://web-api.juejin.im/query";
    let params = {
        extensions: { query: { id: "a53db5867466eddc50d16a38cfeb0890" } },
        operationName: "",
        query: "",
        variables: { type: "ARTICLE", query: queryKey, after: numAfter + "", period: "ALL", first: 100 },
    };
    return axios.post(url, params, {
        headers: { "X-Agent": "Juejin/Web" },
    });
}

// 主函数
function responseData(queryKey = "前端", likeNum = 1000) {
    return axios
        .all([
            getDatas({ queryKey: queryKey, numAfter: 0 }),
            getDatas({ queryKey: queryKey, numAfter: 100 }),
            getDatas({ queryKey: queryKey, numAfter: 200 }),
        ])
        .then(
            axios.spread((res1, res2, res3) => {
                let dataArr1 = res1.data.data.search.edges;
                let dataArr2 = res2.data.data.search.edges;
                let dataArr3 = res3.data.data.search.edges;
                return Promise.resolve([...dataArr1, ...dataArr2, ...dataArr3]);
            })
        )
        .then(function (response) {
            let newInfo = response.filter(
                ({ node: { entity } }) => timeFilter(entity, "createdAt") && numFilter(entity, "likeCount", likeNum)
            );
            newInfo.sort(sortList);
            return Promise.resolve(newInfo);
        })
        .catch(function (error) {
            console.log(error);
        });
}

app.get("/", (req, res) => {
    let promise = responseData(); // 发起抓取
    promise.then((response) => {
        res.json(response); // 数据返回
    });
});
app.get("/:queryKey/:likeNum", (req, res) => {
    const {
        queryKey, // 获取查询关键词
        likeNum, // 获取点赞数下限
    } = req.params;
    let promise = responseData(queryKey, likeNum); // 发起抓取
    promise.then((response) => {
        res.json(response); // 数据返回
    });
});

app.listen(3000, () => console.log("Listening on port 3000!")); // 监听3000端口
