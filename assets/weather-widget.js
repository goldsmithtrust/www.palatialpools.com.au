/* Palatial Pools - Homepage Weather Widget
   Injects a weather strip below the nav showing Melbourne conditions + pool impact */
(function() {
  // Only run on homepage
  if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') return;
  
  var WIDGET_ID = 'pp-weather-strip';
  
  function createWeatherWidget() {
    if (document.getElementById(WIDGET_ID)) return;
    
    var strip = document.createElement('div');
    strip.id = WIDGET_ID;
    strip.innerHTML = '<div class="pp-weather-inner"><span class="pp-weather-loading">Loading Melbourne conditions...</span></div>';
    
    // Style
    var style = document.createElement('style');
    style.textContent = `
      #pp-weather-strip {
        background: linear-gradient(90deg, rgba(26,5,51,0.95) 0%, rgba(45,34,82,0.95) 50%, rgba(26,5,51,0.95) 100%);
        border-bottom: 1px solid rgba(196,168,77,0.15);
        padding: 6px 16px;
        font-family: 'Outfit', system-ui, sans-serif;
        font-size: 11px;
        color: rgba(241,245,249,0.7);
        text-align: center;
        position: relative;
        z-index: 99;
      }
      .pp-weather-inner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        flex-wrap: wrap;
        max-width: 900px;
        margin: 0 auto;
      }
      .pp-weather-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .pp-weather-item strong {
        color: #00C4CC;
        font-weight: 600;
      }
      .pp-weather-impact {
        color: #C4A84D;
        font-weight: 500;
        font-style: italic;
      }
      .pp-weather-divider {
        width: 1px;
        height: 12px;
        background: rgba(255,255,255,0.15);
      }
      @media (max-width: 600px) {
        #pp-weather-strip { font-size: 10px; padding: 5px 10px; }
        .pp-weather-inner { gap: 8px; }
        .pp-weather-divider { display: none; }
      }
    `;
    document.head.appendChild(style);
    
    // Insert after nav or at top of body
    var nav = document.querySelector('nav');
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(strip, nav.nextSibling);
    } else {
      document.body.insertBefore(strip, document.body.firstChild);
    }
    
    fetchWeather();
  }
  
  function fetchWeather() {
    // Use wttr.in free API (no key needed) for Melbourne
    fetch('https://wttr.in/Melbourne,Australia?format=j1')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var current = data.current_condition[0];
        var temp = current.temp_C;
        var uv = current.uvIndex;
        var wind = current.windspeedKmph;
        var humidity = current.humidity;
        var desc = current.weatherDesc[0].value;
        
        // Calculate pool impact
        var impact = getPoolImpact(parseFloat(temp), parseFloat(uv), parseFloat(wind), parseFloat(humidity));
        
        var inner = document.querySelector('.pp-weather-inner');
        if (!inner) return;
        
        inner.innerHTML = 
          '<span class="pp-weather-item">Melbourne: <strong>' + temp + '°C</strong> ' + desc + '</span>' +
          '<span class="pp-weather-divider"></span>' +
          '<span class="pp-weather-item">UV: <strong>' + uv + '</strong></span>' +
          '<span class="pp-weather-divider"></span>' +
          '<span class="pp-weather-item">Wind: <strong>' + wind + ' km/h</strong></span>' +
          '<span class="pp-weather-divider"></span>' +
          '<span class="pp-weather-impact">' + impact + '</span>';
      })
      .catch(function() {
        var inner = document.querySelector('.pp-weather-inner');
        if (inner) inner.innerHTML = '';
        var strip = document.getElementById(WIDGET_ID);
        if (strip) strip.style.display = 'none';
      });
  }
  
  function getPoolImpact(temp, uv, wind, humidity) {
    var evap = 'Low';
    var chlorine = 'normal';
    
    if (temp > 30 && uv > 6) {
      evap = 'High';
      chlorine = 'elevated';
    } else if (temp > 25 || uv > 5) {
      evap = 'Moderate';
      chlorine = 'slightly elevated';
    }
    
    if (wind > 30) evap = 'High';
    
    if (evap === 'Low') {
      return 'Low evaporation day, chlorine demand normal';
    } else if (evap === 'Moderate') {
      return 'Moderate evaporation, chlorine demand ' + chlorine;
    } else {
      return 'High evaporation day, chlorine demand ' + chlorine + ' — check levels';
    }
  }
  
  // Run on load and observe for SPA navigation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWeatherWidget);
  } else {
    createWeatherWidget();
  }
  
  // Re-check on navigation (SPA)
  var _pushState = history.pushState;
  history.pushState = function() {
    _pushState.apply(this, arguments);
    setTimeout(createWeatherWidget, 500);
  };
  window.addEventListener('popstate', function() {
    setTimeout(createWeatherWidget, 500);
  });
})();
