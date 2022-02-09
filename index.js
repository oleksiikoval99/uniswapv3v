const express = require("express");
const fs = require("fs");

const app = express();
const jsonParser = express.json();

const util = require('util')
const request = require('request')

const link1 = "https://api.flipsidecrypto.com/api/v2/queries/4fea0626-754f-4c5d-a5c4-e31e1eb36370/data/latest"
const link2 = "https://api.flipsidecrypto.com/api/v2/queries/2fd72aa9-53b4-4ccc-b45e-d4cc9c0c7e03/data/latest"
const link3 = "https://api.flipsidecrypto.com/api/v2/queries/cdef67e1-17a2-4846-ab7a-0c96d0fa9b25/data/latest"
filePath = "pool.json"
app.get("/update", function (req, res) {
    request.get(link3, (error, response, body) => {
        fs.writeFileSync(filePath, body);
        res.send(JSON.stringify({ result: "Ok" }));
    })

});

app.get("/pool", function (req, res) {
    var cprice = req.query.cprice
    var lpamt = req.query.lpamt
    var range = req.query.range
    start(cprice, lpamt, range).then((result) => {
        res.send(result);
    })

});


function formatInt(num) {
    if (num > 999999) {
        return Math.round(num / 100000) / 10 + "M"
    }
    else if (num > 999) {
        return Math.round(num / 100) / 10 + "K"
    }
    else {
        return Math.round(num);
    }
    var result = ""
}
async function start(cprice = 2815, lpamt = 1000, range = 0.1) {
    const lower = cprice * (1 - range)
    const upper = cprice * (1 + range)
    const price_01 = cprice
    const price_10 = 1 / price_01
    const price_sqrt = Math.sqrt(Math.pow(1.001, -(Math.log(price_01) / Math.log(1.001))))

    const price_lower_sqrt = Math.sqrt(Math.pow(1.001, -(Math.log(lower) / Math.log(1.001))))
    const price_upper_sqrt = Math.sqrt(Math.pow(1.001, -(Math.log(upper) / Math.log(1.001))))
    const relation = (price_sqrt - price_lower_sqrt) / ((1 / price_sqrt) - (1 / price_upper_sqrt))
    const token1amt_usd = lpamt / (1 + (relation * price_01))
    const token0amt_usd = relation * token1amt_usd * price_01
    const amt0 = token0amt_usd
    const amt1 = token1amt_usd
    var liquidity
    if (cprice <= lower) liquidity = amt0 * (Math.sqrt(upper) * Math.sqrt(lower) / Math.sqrt(upper - Math.sqrt(lower)))
    else if (lower <= cprice && cprice <= upper) liquidity = Math.min(amt0 * Math.sqrt(upper) * Math.sqrt(cprice) / (Math.sqrt(upper) - Math.sqrt(cprice)), amt1 / (Math.sqrt(cprice) - Math.sqrt(lower)))
    else if (upper <= cprice) liquidity = amt1 / (Math.sqrt(upper) - Math.sqrt(lower))

    const calcDateToPool = (fees_proc, total_liquidity = 40449.80, volume = 84360642.2802278) => {
        const proc_of_pool = liquidity / total_liquidity


        const fee24 = proc_of_pool * volume * fees_proc
        const fee24_eth = amt0 * cprice / (amt1 + (amt0 * cprice)) * fee24
        const fee24_usdc = fee24 - fee24_eth

        const apr = fee24 * 365 / lpamt
        return apr
    }


    var fees_proc = 0.01
    calcDateToPool(cprice, fees_proc)

    const requestPromise = util.promisify(request);
    var POOL = []
    var POOL_NAMES = []

    var liqvidPromise = requestPromise(link1);
    var trade_volumesPromise = requestPromise(link2);
    //var poolPromise = requestPromise(link3);



    var liqvid = JSON.parse((await liqvidPromise).body)
    liqvid.forEach(element => {
        if (element["POOL_NAME"] == null) return
        POOL_NAMES.push(element["POOL_NAME"])
        var newElement = {
            "REAL_LIQUIDITY_USD": element["REAL_LIQUIDITY_USD"],
            "POOL_NAME": element["POOL_NAME"],
            "comise": parseInt(element['POOL_NAME'].split(" ")[1]) / 1000000
        }
        POOL.push(newElement)
    })
    var trade_volumes = JSON.parse((await trade_volumesPromise).body)
    trade_volumes.forEach(element => {
        if (POOL_NAMES.includes(element["POOL_NAME"])) {
            var index = POOL.findIndex(row => {
                if (row["POOL_NAME"] == element["POOL_NAME"]) return true
                return false
            })
            POOL[index]["TRADING_VOL_TOKEN1"] = element["TRADING_VOL_TOKEN1"]
        }

    });
    POOL = POOL.map(element => {
        element["Fees_USD"] = element["comise"] * element["TRADING_VOL_TOKEN1"]
        element["Fees_liqvid"] = element["Fees_USD"] / element["REAL_LIQUIDITY_USD"]
        return element
    })

    POOL.sort((a, b) => {
        return b["Fees_liqvid"] - a["Fees_liqvid"]
    })
    POOL = POOL.filter((element, index) => {
        if (index <= 9) return true

        return false
    })

    //var pools = await poolPromise
    var pools = JSON.parse(fs.readFileSync(filePath, "utf-8"))
    POOL = POOL.map((element => {
        var total_liquidity = 0

        pools.forEach((item) => {
            if (item["POOL_NAME"] == element["POOL_NAME"])
                if (item["POOL_NAME"].indexOf("WETH") == 0 && item["PRICE_LOWER_1_0_USD"] <= cprice && item["PRICE_UPPER_1_0_USD"] >= cprice) {
                    total_liquidity = total_liquidity + item["LIQUIDITY_ADJ"]
                }
                else if (item["POOL_NAME"].indexOf("WETH") > 0 && item["PRICE_LOWER_0_1_USD"] <= cprice && item["PRICE_UPPER_0_1_USD"] >= cprice) {
                    total_liquidity = total_liquidity + item["LIQUIDITY_ADJ"]
                }
        })

        element["Total Liquidity"] = total_liquidity
        element["APR"] = calcDateToPool(element["comise"], total_liquidity, element["TRADING_VOL_TOKEN1"]) * 100
        return element
    }))

    POOL = POOL.map(element => {
        element["POOL_NAME"] = `${element["POOL_NAME"].split(" ")[0].split("-").join("/")} ${element["comise"] * 100}%`
        element["TRADING_VOL_TOKEN1"]="$"+formatInt(element["TRADING_VOL_TOKEN1"])
        element["REAL_LIQUIDITY_USD"]="$"+formatInt(element["REAL_LIQUIDITY_USD"])
        element["Fees_liqvid"]=Math.round(element["Fees_liqvid"]*1000)/10+"%"
        element["APR"]=Math.round(element["APR"]*10)/10+"%"
        if(element["POOL_NAME"]=="WETH/ETHM 1%")console.log(element)
        return element
    })
    return POOL






    //console.log(JSON.parse((await trade_volumesPromise).body))
    //console.log(JSON.parse((await poolPromise).body))


}

app.listen(3001)
