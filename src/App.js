import logo from './logo.svg';
import './App.css';
import React, { useEffect, useState } from 'react';



function App() {
  const [pools, setPools] = useState([]);
  useEffect(() => {
    fetch("/pool")
      .then(response => {
        response.json().then(result => {
          setPools(result)
        })
      }).catch(error => {
        alert(error)
      })
  },[])

  return (
    <div className="App">
      <div className='light' />
      <div className='container'>

        <div className='column column-1'>
          <div className='header'>
            TOP Pools
          </div>
          <div className="descr">Most efficient pools and its APR</div>
          <div className='container-label date-label'>
            <div >#</div>
            <div>Pool</div>
            <div>TVL</div>
            <div>VOLUME</div>
            <div>COEF</div>
            <div>APR</div>
          </div>
          {pools.map((item, index) => {
            return <div className='container-data-row date-value'>
              <div>{index+1}</div>
              <div>{item["POOL_NAME"]}</div>
              <div>{item["REAL_LIQUIDITY_USD"]}</div>
              <div>{item["TRADING_VOL_TOKEN1"]}</div>
              <div>{item["Fees_liqvid"]}</div>
              <div className='text-green'>{item["APR"]}</div>
            </div>
          })}


        </div>
        <div className='column column-2'>
          <div className='header'>Parametrs</div>
          <div className="descr"></div>
          <div className='container-label date-label single-col'>
            <div>Range</div>
          </div>
          <div className='container-data-row reset-color'></div>
          <div className='container-label date-label'>
            <div>invested capital</div>
          </div>
          <input className='container-invest'></input>
        </div>
      </div>
    </div>
  );
}

export default App;
